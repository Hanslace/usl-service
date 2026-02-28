// app/api/auth/callback/route.ts
import { google } from '@/lib/oauth/google';
import { redis } from '@/lib/redis';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const incomingCode = searchParams.get('code');
  const incomingState = searchParams.get('state');

  // ---- load session ----
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
  const { google_oauth_state, google_code_verifier, redirect_uri } = session;

  // ---- validate state + params ----
  if (!incomingCode || !incomingState || !google_code_verifier || !redirect_uri) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  if (incomingState !== google_oauth_state) {
    return NextResponse.json({ message: 'State mismatch — possible CSRF' }, { status: 400 });
  }

  // ---- exchange Google code for tokens ----
  let tokens;
  try {
    tokens = await google.validateAuthorizationCode(incomingCode, google_code_verifier);
  } catch (err) {
    return NextResponse.json({ message: 'Google token exchange failed' }, { status: 400 });
  }

  // ---- fetch Google user profile ----
  const googleUserRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  });

  if (!googleUserRes.ok) {
    return NextResponse.json({ message: 'Failed to fetch Google user' }, { status: 502 });
  }

  const googleUser = await googleUserRes.json();

  if (!googleUser.sub || !googleUser.email) {
    return NextResponse.json({ message: 'Incomplete Google profile' }, { status: 400 });
  }

  // ---- exchange with NestJS for your own auth code ----
  const nestRes = await fetch(`${ENV.API_BASE_URL}/auth/identity/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      email: googleUser.email,
      provider_user_id: googleUser.sub,
    }),
  });

  if (!nestRes.ok) {
    return NextResponse.json({ message: 'Auth service error' }, { status: 502 });
  }

  const { code } = await nestRes.json();

  if (!code) {
    return NextResponse.json({ message: 'No auth code returned' }, { status: 502 });
  }

  const finalUrl = `${redirect_uri}?code=${encodeURIComponent(code)}`;

    // clean up
    await redis.del(sessionKey);

    // redirect to a page that will do window.location.href
    return Response.redirect(new URL(`/auth/complete?redirectTo=${encodeURIComponent(finalUrl)}`, request.url));
}