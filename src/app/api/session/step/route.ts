import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('usl_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session' }, { status: 401 });
  }

  const sessionRaw = await redis.get(`usl:session:${sessionId}`);
  if (!sessionRaw) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const session = JSON.parse(sessionRaw);
  return NextResponse.json({ step: session.step ?? 'identifier_entry' });
}
