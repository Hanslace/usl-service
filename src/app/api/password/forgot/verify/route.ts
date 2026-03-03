import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';

export async function POST(req: Request) {
  const { otp } = await req.json().catch(() => ({}));

  if (!otp || typeof otp !== 'string') {
    return NextResponse.json({ message: 'OTP required' }, { status: 400 });
  }

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

  if (session.step !== 'forgot_password') {
    return NextResponse.json({ message: 'Invalid session state' }, { status: 403 });
  }

  const otpKey = `usl:otp:${sessionId}`;
  const otpRaw = await redis.get(otpKey);

  if (!otpRaw) {
    return NextResponse.json({ message: 'Code expired or already used' }, { status: 403 });
  }

  const otpData = JSON.parse(otpRaw);
  const inputHash = createHash('sha256').update(otp).digest('hex');

  if (inputHash !== otpData.otp_hash) {
    const attempts = (otpData.attempts ?? 0) + 1;

    if (attempts >= 5) {
      await redis.del(otpKey);
    } else {
      await redis.set(otpKey, JSON.stringify({ ...otpData, attempts }), 'KEEPTTL');
    }

    return NextResponse.json({ message: 'Invalid code' }, { status: 403 });
  }

  // OTP valid — consume it and advance session to password_reset
  await redis
    .multi()
    .del(otpKey)
    .set(sessionKey, JSON.stringify({ ...session, step: 'password_reset' }), 'KEEPTTL')
    .exec();

  recordLog({
    code: 'USL_FORGOT_OTP_VERIFIED',
    category: 'AUTH',
    severity: 'INFO',
  });

  return NextResponse.redirect(new URL('/password/reset', req.url));
}
