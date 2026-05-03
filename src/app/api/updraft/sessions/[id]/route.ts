import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { deleteSessionForUser, readSessionForUser } from '@/lib/updraft/store';

/**
 * GET /api/updraft/sessions/[id] — read full session JSON for the
 * authenticated owner. Returns 401 for anon, 404 for not-found-or-not-yours.
 *
 * DELETE /api/updraft/sessions/[id] — cascade-delete the session via
 * the FK ON DELETE CASCADE on events + exports. Used by the per-session
 * delete flow on the dashboard / account page.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const userId = readSessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const session = await readSessionForUser(id, userId);
  if (!session) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ session });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const userId = readSessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ok = await deleteSessionForUser(id, userId);
  if (!ok) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
