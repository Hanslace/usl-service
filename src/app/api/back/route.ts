import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

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
  const step: string = session.step ?? 'identifier_entry';
  const otpKey = `usl:otp:${sessionId}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { method, identifier, second_method, second_identifier, forgot_method, forgot_identifier, ...base } = session;

  switch (step) {
    case 'otp_first': {
      // Revert: clear method/identifier, delete pending OTP → back to start
      await redis
        .multi()
        .set(sessionKey, JSON.stringify({ ...base, step: 'identifier_entry' }), 'KEEPTTL')
        .del(otpKey)
        .exec();
      return NextResponse.json({ redirectTo: '/' });
    }

    case 'register': {
      // Revert: clear method/identifier → back to start (re-enter identifier)
      await redis.set(
        sessionKey,
        JSON.stringify({ ...base, step: 'identifier_entry' }),
        'KEEPTTL'
      );
      return NextResponse.json({ redirectTo: '/' });
    }

    case 'otp_second': {
      // Revert: clear second identifier fields, delete pending OTP → back to register
      const restored = { ...base, method, identifier, step: 'register' };
      await redis
        .multi()
        .set(sessionKey, JSON.stringify(restored), 'KEEPTTL')
        .del(otpKey)
        .exec();
      return NextResponse.json({ redirectTo: '/register' });
    }

    case 'password_login': {
      // Revert: clear method/identifier → back to start
      await redis.set(
        sessionKey,
        JSON.stringify({ ...base, step: 'identifier_entry' }),
        'KEEPTTL'
      );
      return NextResponse.json({ redirectTo: '/' });
    }

    case 'forgot_password': {
      // Revert: clear forgot fields, delete pending OTP → back to password login
      const restored = { ...base, method, identifier, step: 'password_login' };
      await redis
        .multi()
        .set(sessionKey, JSON.stringify(restored), 'KEEPTTL')
        .del(otpKey)
        .exec();
      return NextResponse.json({ redirectTo: '/password/login' });
    }

    case 'password_reset': {
      // Revert: clear forgot fields → back to password login
      const restored = { ...base, method, identifier, step: 'password_login' };
      await redis.set(sessionKey, JSON.stringify(restored), 'KEEPTTL');
      return NextResponse.json({ redirectTo: '/password/login' });
    }

    case 'password_setup': {
      // Revert: clear second identifier fields → back to register
      const restored = { ...base, method, identifier, step: 'register' };
      await redis.set(sessionKey, JSON.stringify(restored), 'KEEPTTL');
      return NextResponse.json({ redirectTo: '/register' });
    }

    default:
      // identifier_entry or unknown — already at the start, nowhere to go back
      return NextResponse.json({ redirectTo: null });
  }
}
