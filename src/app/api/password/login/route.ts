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

  const res = await fetch(
    `${session.backend_url}/auth/identity/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        method: session.method,
        identifier: session.identifier,
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { message: body?.message ?? 'Login failed' },
      { status: res.status }
    );
  }

  const { code } = await res.json();

  if (!code) {
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

  await redis.del(sessionKey);

  recordLog({
    code: 'USL_LOGIN_COMPLETED',
    category: 'AUTH',
    severity: 'INFO',
    note: `User completed login using ${session.method} returned code ${code}`,
  });

  const finalUrl = `${redirectUrl.toString()}?code=${encodeURIComponent(code)}`;

  return NextResponse.json({ redirectTo: finalUrl }, { status: 200 });
}
