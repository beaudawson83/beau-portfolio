import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { logEvent, setSessionKeepFlag } from '@/lib/updraft/store';

interface PatchBody {
  keep?: boolean;
}

/**
 * PATCH /api/updraft/sessions/[id]/keep
 *
 * Toggles the keep_indefinitely flag on a session, opting it out of the
 * 30-day inactivity purge. Body: { keep: boolean }.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;

  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (typeof body.keep !== 'boolean') {
    return NextResponse.json({ error: 'invalid-keep' }, { status: 400 });
  }

  const ok = await setSessionKeepFlag({ sessionId, userId, keep: body.keep });
  if (!ok) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  await logEvent({
    sessionId,
    stage: 'system',
    eventType: 'keep_flag_changed',
    data: { keep: body.keep },
  });

  return NextResponse.json({ ok: true, keep: body.keep });
}
