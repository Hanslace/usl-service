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


  const email =
    session.method === 'email'
      ? session.identifier
      : session.second_method === 'email'
      ? session.second_identifier : undefined;

  const phone =
    session.method === 'phone'
      ? session.identifier
      : session.second_method === 'phone'
      ? session.second_identifier
      : undefined;

  const res = await fetch(
    `${ENV.API_BASE_URL}/auth/identity/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        ...(email && { email }),
        ...(phone && { phone }),
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
  await redis.del(sessionKey);

  // optional but strongly recommended
  recordLog({
    code: 'USL_PASSWORD_SETUP_COMPLETED',
    category: 'AUTH',
    severity: 'INFO',
    note: `User completed password setup using ${session.method} returned code ${code}`,
  });


    // build final redirect url (string)
  const finalUrl = `${redirectUrl.toString()}?code=${encodeURIComponent(code)}`;

  // return JSON (no 302)
  return NextResponse.json({ redirectTo: finalUrl }, { status: 200 });
}
