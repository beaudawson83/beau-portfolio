import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { setActiveModSession } from '@/lib/updraft/store';

/**
 * PATCH /api/updraft/me/active-mod
 *
 * Sets — or clears — the signed-in user's active-MOD pointer, the master
 * profile the re-tailoring flow starts from. Body: { sessionId: string }
 * to set, { sessionId: null } to clear.
 *
 * The store validates ownership and that the target session actually holds
 * a generation-ready MOD; we surface its verdict as a status code rather
 * than trusting the client's eligibility check.
 *
 * Auth: session cookie.
 */
export async function PATCH(request: NextRequest) {
  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: unknown;
  };
  const raw = body.sessionId;

  // Accept exactly: a non-empty string (set) or null (clear). Anything else
  // — missing, empty, wrong type — is a bad request.
  let sessionId: string | null;
  if (raw === null) {
    sessionId = null;
  } else if (typeof raw === 'string' && raw.trim()) {
    sessionId = raw.trim();
  } else {
    return NextResponse.json(
      { error: 'bad-request', detail: 'sessionId must be a session id or null' },
      { status: 400 },
    );
  }

  const result = await setActiveModSession({ userId, sessionId });
  if (!result.ok) {
    const status =
      result.error === 'not-found'
        ? 404
        : result.error === 'no-mod'
          ? 409
          : 500;
    return NextResponse.json({ error: result.error ?? 'failed' }, { status });
  }

  return NextResponse.json({ ok: true, activeModSessionId: sessionId });
}
