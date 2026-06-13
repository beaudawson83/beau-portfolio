import { NextRequest, NextResponse } from 'next/server';
import {
  readSessionCookieValue,
  SESSION_COOKIE_NAME,
  isUpdraftOwner,
} from '@/lib/updraft/auth';
import {
  createRetailoredSession,
  findUserById,
  logEvent,
} from '@/lib/updraft/store';
import { canStartSession, recordQuotaUsage } from '@/lib/updraft/quotas';

/**
 * POST /api/updraft/sessions/retailor
 *
 * Starts a re-tailoring session: a fresh session pre-seeded with a source
 * session's master profile (stage_01 + stage_03), so the user skips intake
 * and the interview and lands directly on Stage 02 to enter a new JD.
 *
 * Body: { sourceSessionId?: string }. When omitted, defaults to the user's
 * active-MOD pointer. Either way the store re-validates ownership + that the
 * source holds a generation-ready MOD.
 *
 * Same quota gate as POST /api/updraft/sessions — a re-tailor still spins up
 * a billable session.
 *
 * Auth: session cookie.
 */
export async function POST(request: NextRequest) {
  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sourceSessionId?: unknown;
  };
  const raw = body.sourceSessionId;
  const sourceSessionId =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : user.activeModSessionId;

  if (!sourceSessionId) {
    return NextResponse.json(
      {
        error: 'no-source',
        detail: 'No source session given and no active MOD is set.',
      },
      { status: 400 },
    );
  }

  // Quota gate mirrors plain session creation — a re-tailor is still a session.
  const quota = await canStartSession(request);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.message ?? 'Session limit reached.',
        reason: quota.reason,
        retryAt: quota.retryAt?.toISOString(),
      },
      { status: 429 },
    );
  }

  const result = await createRetailoredSession({ userId, sourceSessionId });
  if (!result.ok) {
    const status =
      result.error === 'not-found'
        ? 404
        : result.error === 'no-mod' || result.error === 'no-tier'
          ? 409
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  await recordQuotaUsage({ sessions: 1 });
  await logEvent({
    sessionId: result.session.id,
    stage: '02',
    eventType: 'retailor_started',
    data: { source_session_id: sourceSessionId, owner: isUpdraftOwner(request) },
  });

  return NextResponse.json({
    sessionId: result.session.id,
    redirectTo: `/updraft/${result.session.id}`,
  });
}
