import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomInt, randomUUID, createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';
import { ENV } from '@/config/env';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';

const OTP_TTL = ENV.OTP_TTL_MS / 1000;
const COOLDOWN_TTL = ENV.OTP_COOLDOWN_MS / 1000;

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session' }, { status: 401 });
  }

  const sessionKey = `usl:session:${sessionId}`;
  const sessionRaw = await redis.get(sessionKey);

  if (!sessionRaw) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const session = JSON.parse(sessionRaw);

  if (session.step !== 'otp_issued' || session.step || 'otp_failed') {
    return NextResponse.json(
      { error: 'OTP not issued yet' },
      { status: 409 }
    );
  }

  const cooldownKey = `usl:otp:cooldown:${sessionId}`;

  // atomic cooldown enforcement
  const cooldownSet = await redis.set(
    cooldownKey,
    '1',
    'EX',
    COOLDOWN_TTL,
    'NX'
  );

  if (!cooldownSet) {
    return NextResponse.json(
      { error: 'OTP resend cooldown active' },
      { status: 429 }
    );
  }

  const { method, identifier } = session;

  const otp = randomInt(100000, 999999).toString();
  const otpHash = createHash('sha256').update(otp).digest('hex');

  const otpKey = `usl:otp:${sessionId}`;

  try {
    await redis.set(
        otpKey,
        JSON.stringify({
          otp_hash: otpHash,
          method,
          identifier,
          attempts: 0,
        }),
        'EX',
        OTP_TTL
      )

  } catch (err) {
    recordLog({
      code: 'USL_OTP_RESEND_STORE_FAILED',
      category: 'SYSTEM',
      severity: 'ERROR',
      payload: { error: String(err) },
    });

    return NextResponse.json(
      { error: 'OTP service unavailable' },
      { status: 503 }
    );
  }

  try {
    if (method === 'phone') {
      await sendSms(identifier, `Your OTP is ${otp}. It expires in 10 minutes.`);
    } else {
      await sendEmail({
        to: identifier,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to deliver OTP' },
      { status: 503 }
    );
  }

  recordLog({
    code: 'USL_OTP_RESENT',
    category: 'AUTH',
    severity: 'INFO',
  });

  return NextResponse.json({ ok: true });
}
