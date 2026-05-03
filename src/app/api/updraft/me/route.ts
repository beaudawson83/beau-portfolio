import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { findUserById } from '@/lib/updraft/store';

/**
 * GET /api/updraft/me
 *
 * Returns the current user (if signed in) plus the user's active MOD pointer.
 * Returns { user: null } for anonymous callers — this is intentionally a
 * 200 response, not a 401, so the dashboard can probe-and-redirect cleanly.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const userId = readSessionCookieValue(cookieValue);
    if (!userId) return NextResponse.json({ user: null });

    const user = await findUserById(userId);
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        activeModSessionId: user.activeModSessionId,
      },
    });
  } catch (error) {
    console.error('updraft.me:', error);
    return NextResponse.json({ user: null });
  }
}
