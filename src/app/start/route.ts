import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { recordLog } from '@/lib/logger';

export const runtime = 'nodejs';

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const deviceId = sp.get('device_id')?.trim();
  const clientId = sp.get('client_id')?.trim();
  const redirectUri = sp.get('redirect_uri')?.trim();

  /* ---------------------------
     Validation (strict)
  ---------------------------- */
  const missing =
    !deviceId ||
    !clientId ||
    !redirectUri;

  if (missing) {
    recordLog({
      code: 'USL_START_INVALID_REQUEST',
      category: 'SECURITY',
      severity: 'WARN',
      note: 'Required query parameters missing or empty',
      payload: {
        has_device_id: Boolean(deviceId),
        has_client_id: Boolean(clientId),
        has_redirect_uri: Boolean(redirectUri),
      },
    });

    return new NextResponse('Missing required parameters', { status: 400 });
  }

  /* ---------------------------
     Session creation
  ---------------------------- */
  const sessionId = randomUUID();
  const redisKey = `usl:session:${sessionId}`;

  const sessionPayload = {
    device_id: deviceId,
    client_id: clientId,
    redirect_uri: redirectUri,
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

  /* ---------------------------
     Cookie + redirect
  ---------------------------- */
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
