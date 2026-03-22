import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomInt, createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { ENV } from '@/config';
import { recordLog } from '@/lib/logger';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';

const OTP_TTL = ENV.OTP_TTL_MS / 1000;
const COOLDOWN_TTL = ENV.OTP_COOLDOWN_MS / 1000;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '***';
  return `${phone.slice(0, 2)}***${phone.slice(-2)}`;
}

// GET — returns masked identifier so the /password/forgot page can display it
export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ message: 'Missing session' }, { status: 401 });
  }

  const sessionRaw = await redis.get(`usl:session:${sessionId}`);
  if (!sessionRaw) {
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const session = JSON.parse(sessionRaw);

  if (session.step !== 'forgot_password' || !session.forgot_method || !session.forgot_identifier) {
    return NextResponse.json({ message: 'No active forgot-password flow' }, { status: 400 });
  }

  const masked =
    session.forgot_method === 'email'
      ? maskEmail(session.forgot_identifier)
      : maskPhone(session.forgot_identifier);

  return NextResponse.json({ method: session.forgot_method, maskedIdentifier: masked });
}

// POST — fetches alternate identifier, issues OTP, advances session
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ message: 'Missing session' }, { status: 401 });
  }

  const sessionKey = `usl:session:${sessionId}`;
  const sessionRaw = await redis.get(sessionKey);

  if (!sessionRaw) {
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const session = JSON.parse(sessionRaw);

  // Per-session rate limit on forgot requests
  const cooldownKey = `usl:forgot:cooldown:${sessionId}`;
  const cooldownSet = await redis.set(cooldownKey, '1', 'EX', COOLDOWN_TTL, 'NX');
  if (!cooldownSet) {
    return NextResponse.json({ message: 'Please wait before trying again' }, { status: 429 });
  }

  // Fetch alternate identifier from backend
  const altRes = await fetch(`${session.backend_url}/auth/identity/alternate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: session.method, identifier: session.identifier }),
    cache: 'no-store',
  });

  if (!altRes.ok) {
    const body = await altRes.json().catch(() => null);
    return NextResponse.json(
      { message: body?.message ?? 'No alternate contact method found' },
      { status: altRes.status }
    );
  }

  const { alt_method, alt_identifier } = await altRes.json();

  // Generate OTP
  const otp = randomInt(100000, 999999).toString();
  const otpHash = createHash('sha256').update(otp).digest('hex');
  const otpKey = `usl:otp:${sessionId}`;

  await redis
    .multi()
    .set(otpKey, JSON.stringify({ otp_hash: otpHash, attempts: 0 }), 'EX', OTP_TTL)
    .set(
      sessionKey,
      JSON.stringify({
        ...session,
        step: 'forgot_password',
        forgot_method: alt_method,
        forgot_identifier: alt_identifier,
      }),
      'KEEPTTL'
    )
    .exec();

  // Deliver OTP
  try {
    if (alt_method === 'phone') {
      await sendSms(
        alt_identifier,
        `Your Mealio password reset code is ${otp}. It expires in 10 minutes.`
      );
    } else {
      await sendEmail({
        to: alt_identifier,
        subject: 'Your password reset code',
        text: `Your Mealio password reset code is ${otp}. It expires in 10 minutes.`,
      });
    }
  } catch {
    return NextResponse.json({ message: 'Failed to send verification code' }, { status: 503 });
  }

  recordLog({
    code: 'USL_FORGOT_OTP_ISSUED',
    category: 'AUTH',
    severity: 'INFO',
    payload: { method: alt_method },
  });

  return NextResponse.redirect(new URL('/password/forgot', req.url), 303);
}
