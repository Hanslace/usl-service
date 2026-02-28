import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';
import { ENV } from '@/config/env';

export async function POST(req: Request) {
  const { otp } = await req.json().catch(() => ({}));

  if (!otp || typeof otp !== 'string') {
    return NextResponse.json(
      { error: 'OTP required' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session' },
      { status: 401 }
    );
  }

  const sessionKey = `usl:session:${sessionId}`;
  const sessionRaw = await redis.get(sessionKey);

  if (!sessionRaw) {
    return NextResponse.json(
      { error: 'Session expired' },
      { status: 401 }
    );
  }

  const session = JSON.parse(sessionRaw);


  const otpKey = `usl:otp:${sessionId}`;
  const otpRaw = await redis.get(otpKey);

  if (!otpRaw) {
    return NextResponse.json(
      { error: 'OTP expired or abused' },
      { status: 403 }
    );
  }

  const otpData = JSON.parse(otpRaw);
  const inputHash = createHash('sha256').update(otp).digest('hex');

  if (inputHash !== otpData.otp_hash) {
    const attempts = await redis.hincrby(otpKey, 'attempts', 1);

    if (attempts >= 5) {
      await redis.del(otpKey);
      await redis.set(
        sessionKey,
        JSON.stringify({ ...session, step: 'otp_failed' }),
        'KEEPTTL'
      );
      
    }

    return NextResponse.json(
      { error: 'Invalid OTP' },
      { status: 403 }
    );
  }

  // OTP valid — consume it
  await redis.del(otpKey)

  recordLog({
    code: 'USL_OTP_VERIFIED',
    category: 'AUTH',
    severity: 'INFO',
  });

  // Second identifier step: skip existence check, go straight to password setup
  if (session.step === 'second_identifier') {
    return NextResponse.redirect(new URL('/password/setup', req.url));
  }

  // First identifier: check if user exists
  const res = await fetch(
    `${ENV.API_BASE_URL}/auth/identity/existence`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: session.identifier,
        method: session.method,
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Auth service error' },
      { status: 502 }
    );
  }
  const data = await res.json();

  if (data.user_exists === false) {
    return NextResponse.redirect(new URL('/register', req.url));
  }

  if (data.user_exists) {
    return NextResponse.redirect(new URL('/password/login', req.url));
  }

}
