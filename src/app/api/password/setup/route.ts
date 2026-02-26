import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));

  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { message: 'Invalid password' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json(
      { message: 'Missing session' },
      { status: 401 }
    );
  }


  const sessionKey = `usl:session:${sessionId}`;
  const sessionRaw = await redis.get(sessionKey);

  if (!sessionRaw) {
    return NextResponse.json(
      { message: 'Session expired' },
      { status: 401 }
    );
  }

  const session = JSON.parse(sessionRaw);

  if (session.step !== 'password_setup') {
    return NextResponse.json(
      { message: 'Invalid session state' },
      { status: 409 }
    );
  }

  const res = await fetch(
    `${ENV.API_BASE_URL}/auth/identity/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        method: session.method,
        identifier: session.identifier,
        device_id: session.device_id,
        client_id: session.client_id
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { message: body?.message ?? 'Profile setup failed' },
      { status: res.status }
    );
  }

  const { code } = await res.json();

  if (!code ) {
    return NextResponse.json(
      { message: 'Invalid backend response' },
      { status: 502 }
    );
  }

  let redirectUrl: URL;
    try {
      redirectUrl = new URL(session.redirect_uri);
    } catch {
      return NextResponse.json(
        { message: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

  // advance / finalize session
  await redis.set(
    sessionKey,
    JSON.stringify({ ...session, step: 'completed' }),
    'KEEPTTL'
  );

  // optional but strongly recommended
  recordLog({
    code: 'USL_PASSWORD_SETUP_COMPLETED',
    category: 'AUTH',
    severity: 'INFO',
  });


  return NextResponse.redirect(
    new URL(`${redirectUrl}?code=${encodeURIComponent(code)}`, req.url),
    { status: 302 }
  );
}
