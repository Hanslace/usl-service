import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomInt, createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';
import { ENV } from '@/config/env';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';

const OTP_TTL = ENV.OTP_TTL_MS / 1000; // 10 minutes
const COOLDOWN_TTL = ENV.OTP_COOLDOWN_MS / 1000; // 5 minutes

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  const isFormPost =
    contentType.startsWith('application/x-www-form-urlencoded') ||
    contentType.startsWith('multipart/form-data');

  const reject = (error: string, status: number) => {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, req.url),
        303
      );
    }

    return NextResponse.json({ error }, { status });
  };

  let method: string;
  let identifier: string;

  if (contentType.startsWith('application/json')) {
    const body = await req.json();
    method = body?.method;
    identifier = body?.identifier;
  } else if (isFormPost) {
    const form = await req.formData();
    method = String(form.get('method') ?? '');
    identifier = String(form.get('identifier') ?? '');
  } else {
    return reject('Invalid content type', 415);
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return reject('Missing session', 401);
  }

  const sessionKey = `usl:session:${sessionId}`;
  const sessionRaw = await redis.get(sessionKey);

  if (!sessionRaw) {
    return reject('Session expired', 401);
  }

  const session = JSON.parse(sessionRaw);

  if (
    (method !== 'email' && method !== 'phone') ||
    typeof identifier !== 'string' ||
    !identifier.trim()
  ) {
    return reject('Invalid OTP request', 400);
  }

  const normalized =
    method === 'email' ? identifier.trim().toLowerCase() : identifier.trim();

  const cooldownKey = `usl:otp:cooldown:${sessionId}`;

  const cooldownSet = await redis.set(cooldownKey, '1', 'EX', COOLDOWN_TTL, 'NX');

  if (!cooldownSet) {
    return reject('OTP resend cooldown active', 429);
  }

  const otp = randomInt(100000, 999999).toString();
  const otpHash = createHash('sha256').update(otp).digest('hex');

  const otpKey = `usl:otp:${sessionId}`;

  try {
    await redis
      .multi()
      .set(
        otpKey,
        JSON.stringify({
          otp_hash: otpHash,
          attempts: 0,
        }),
        'EX',
        OTP_TTL
      )
      .set(
        sessionKey,
        JSON.stringify({
          ...session,
          method,
          identifier: normalized,
        }),
        'KEEPTTL'
      )
      .exec();
  } catch (err) {
    recordLog({
      code: 'USL_OTP_STORE_FAILED',
      category: 'SYSTEM',
      severity: 'ERROR',
      payload: { error: String(err) },
    });

    return reject('OTP service unavailable', 503);
  }

  try {
    if (method === 'phone') {
      await sendSms(normalized, `Your OTP is ${otp}. It expires in 10 minutes.`);
    } else {
      await sendEmail({
        to: normalized,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      });
    }
  } catch {
    return reject('Failed to deliver OTP', 503);
  }

  recordLog({
    code: 'USL_OTP_ISSUED',
    category: 'AUTH',
    severity: 'INFO',
    payload: { method },
  });

  return NextResponse.redirect(new URL('/otp', req.url), 303);
}
