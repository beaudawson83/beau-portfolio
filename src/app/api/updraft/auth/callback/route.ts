import { NextRequest, NextResponse } from 'next/server';
import {
  hashMagicLinkToken,
  mintSessionCookieValue,
  SESSION_COOKIE_NAME,
  sessionCookieFlags,
} from '@/lib/updraft/auth';
import { consumeMagicToken, findOrCreateUserByEmail } from '@/lib/updraft/store';

/**
 * GET /api/updraft/auth/callback?token=<raw>
 *
 * The link the user clicks in their email. We hash the URL token, atomically
 * mark it consumed (only succeeds if unconsumed + unexpired), look up or
 * create the user by email, mint a 30-day session cookie, and redirect to
 * /updraft. On any failure path we redirect back to /updraft/login with a
 * `?err=<code>` so the page can render an actionable message.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get('token')?.trim() ?? '';
  const origin = url.origin;
  const loginUrl = (code: string) => new URL(`/updraft/login?err=${code}`, origin);

  if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) {
    console.warn('updraft-auth.callback: malformed token in URL');
    return NextResponse.redirect(loginUrl('bad-link'));
  }

  const tokenHash = hashMagicLinkToken(rawToken);
  const email = await consumeMagicToken(tokenHash);
  if (!email) {
    // consumeMagicToken returns null for unknown / expired / already-consumed.
    // The store already logs DB errors; this line catches the redirect path.
    return NextResponse.redirect(loginUrl('expired-or-used'));
  }

  const user = await findOrCreateUserByEmail(email);
  if (!user) {
    console.error('updraft-auth.callback: findOrCreateUserByEmail returned null', { email });
    return NextResponse.redirect(loginUrl('account-error'));
  }

  const { value, expiresAt } = mintSessionCookieValue(user.id);
  const response = NextResponse.redirect(new URL('/updraft', origin));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value,
    ...sessionCookieFlags(expiresAt),
  });
  return response;
}
