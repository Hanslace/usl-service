import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomInt, randomUUID, createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';
import { ENV } from '@/config/env';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';


const  OTP_TTL = ENV.OTP_TTL_MS /1000;        // 10 minutes
const COOLDOWN_TTL = ENV.OTP_COOLDOWN_MS/1000; // 5 minutes

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.startsWith('application/json')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 415 });
  }

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


  const body = await req.json();
  const { method, identifier } = body;

  if (
    (method !== 'email' && method !== 'phone') ||
    typeof identifier !== 'string' ||
    !identifier.trim()
  ) {
    return NextResponse.json({ error: 'Invalid OTP request' }, { status: 400 });
  }

  const normalized =
    method === 'email' ? identifier.trim().toLowerCase() : identifier.trim();

  const cooldownKey = `usl:otp:cooldown:${sessionId}`;

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

    return NextResponse.json(
      { error: 'OTP service unavailable' },
      { status: 503 }
    );
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
    return NextResponse.json(
      { error: 'Failed to deliver OTP' },
      { status: 503 }
    );
  }

  recordLog({
    code: 'USL_OTP_ISSUED',
    category: 'AUTH',
    severity: 'INFO',
    payload: { method },
  });


  return NextResponse.json({ message: 'OTP issued' }, { status: 200 });

}
