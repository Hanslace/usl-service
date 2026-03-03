import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));

  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return NextResponse.json({ message: 'Invalid password' }, { status: 400 });
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

  if (session.step !== 'password_reset') {
    return NextResponse.json({ message: 'Invalid session state' }, { status: 403 });
  }

  const res = await fetch(`${ENV.API_BASE_URL}/auth/identity/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: session.method,
      identifier: session.identifier,
      new_password: password,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { message: body?.message ?? 'Password reset failed' },
      { status: res.status }
    );
  }

  // Strip the forgot-flow state, keep the rest of the session so the user
  // can immediately sign in with their new password on /password/login
  const { step: _step, forgot_method: _fm, forgot_identifier: _fi, ...cleanSession } = session;
  await redis.set(sessionKey, JSON.stringify(cleanSession), 'KEEPTTL');

  recordLog({
    code: 'USL_PASSWORD_RESET_COMPLETED',
    category: 'AUTH',
    severity: 'INFO',
    note: `Password reset completed for ${session.method} user`,
  });

  return NextResponse.redirect(new URL('/password/login', req.url));
}
