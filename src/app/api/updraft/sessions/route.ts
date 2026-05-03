import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { createSessionForUser, findUserById, logEvent } from '@/lib/updraft/store';
import { canStartSession, recordQuotaUsage } from '@/lib/updraft/quotas';
import { isUpdraftOwner } from '@/lib/updraft/auth';

/**
 * POST /api/updraft/sessions
 *
 * Auth-gated session creation. Three-layer kill switch evaluated cheapest-
 * first: owner bypass → per-IP daily → global daily. On success, writes a
 * fresh row, increments quota, logs a stage_entered event, and returns the
 * new session id for client redirect.
 */
export async function POST(request: NextRequest) {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = readSessionCookieValue(cookieValue);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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

  const session = await createSessionForUser(user.id);
  if (!session) {
    return NextResponse.json({ error: 'create-failed' }, { status: 500 });
  }

  await recordQuotaUsage({ sessions: 1 });
  await logEvent({
    sessionId: session.id,
    stage: '01',
    eventType: 'stage_entered',
    data: { owner: isUpdraftOwner(request) },
  });

  return NextResponse.json({
    sessionId: session.id,
    redirectTo: `/updraft/${session.id}`,
  });
}
