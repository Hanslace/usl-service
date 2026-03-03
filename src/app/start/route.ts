import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';

export const runtime = 'nodejs';

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const redirectUri = sp.get('redirect_uri')?.trim();
  const backendUrl = sp.get("backend_url")?.trim();

  

  if (!redirectUri || !backendUrl) {
    recordLog({
      code: 'USL_START_INVALID_REQUEST',
      category: 'SECURITY',
      severity: 'WARN',
      note: 'Redirect URI missing or empty',
      payload: {
        has_redirect_uri: Boolean(redirectUri),
        has_backend_url: Boolean(backendUrl),
      },
    });

    

    return new NextResponse('Missing required parameters', { status: 400 });
  }

  const isAllowed = await redis.sismember("usl:allowed_backends", backendUrl);

  if (!isAllowed) {
    recordLog({
      code: 'USL_START_INVALID_BACKEND',
      category: 'SECURITY',
      severity: 'WARN',
      note: 'Backend URL not in allowlist',
      payload: { backend_url: backendUrl },
    });
    return new NextResponse('Invalid backend URL', { status: 403 });
  }

  const sessionId = randomUUID();
  const redisKey = `usl:session:${sessionId}`;

  const sessionPayload = {
    redirect_uri: redirectUri,
    backend_url: backendUrl,
    step: 'identifier_entry',
  };

  try {
    await redis.set(
      redisKey,
      JSON.stringify(sessionPayload),
      'EX',
      SESSION_TTL_SECONDS
    );
  } catch (err) {
    recordLog({
      code: 'USL_SESSION_PERSIST_FAILED',
      category: 'SYSTEM',
      severity: 'ERROR',
      note: 'Redis write failed while creating USL session',
      payload: {
        redis_key: redisKey,
        error: String(err),
      },
    });

    return new NextResponse('Service unavailable', { status: 503 });
  }

  recordLog({
    code: 'USL_SESSION_CREATED',
    category: 'AUTH',
    severity: 'INFO',
    payload: {
      ttl_seconds: SESSION_TTL_SECONDS,
    },
  });


  const response = NextResponse.redirect(new URL('/', url));

  response.cookies.set('usl_session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  recordLog({
    code: 'USL_SESSION_COOKIE_ISSUED',
    category: 'AUTH',
    severity: 'INFO',
  });

  return response;
}
