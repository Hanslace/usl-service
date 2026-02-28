// app/api/auth/google/route.ts
import { google } from '@/lib/oauth/google';
import { generateState, generateCodeVerifier } from 'arctic';
import { cookies } from 'next/headers';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ message: 'Missing session' }, { status: 401 });
  }

  const redisKey = `usl:session:${sessionId}`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const session = JSON.parse(raw);

  await redis.set(
    redisKey,
    JSON.stringify({
      ...session,
      google_oauth_state: state,
      google_code_verifier: codeVerifier,
    }),
    'KEEPTTL',
  );

  const url = google.createAuthorizationURL(state, codeVerifier, ['email']);

  return Response.redirect(url.toString());
}