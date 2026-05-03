import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/updraft/auth';

/**
 * POST /api/updraft/auth/logout
 *
 * Clears the session cookie. Stateless — there's nothing server-side to
 * revoke (cookie is HMAC-signed; setting expires=epoch invalidates this
 * device immediately).
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
