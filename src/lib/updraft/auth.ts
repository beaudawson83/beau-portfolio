// UpDraft auth — magic-link issuance + session cookie HMAC.
//
// Magic link: server generates a random 32-byte token, hashes it (sha256),
// stores the hash + email + 15-min expiry in updraft_magic_tokens, and emails
// the raw token in a URL. On callback, server hashes the URL token and
// atomically marks consumed if unconsumed + unexpired. Single-use by design.
//
// Session cookie: HMAC-signed payload {uid, exp}. HttpOnly + Secure +
// SameSite=Lax. Pattern adapted from src/lib/pi-challenge/token.ts.
//
// Owner bypass: requests with Authorization: Bearer $UPDRAFT_OWNER_SECRET
// are flagged owner=true. Quotas/caps consult that flag (owner skips all
// caps; events tag owner=true for clean analytics).

import 'server-only';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Magic-link tokens
// ---------------------------------------------------------------------------

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

/** Returns { rawToken, tokenHash, expiresAt }. Caller stores hash, emails raw. */
export function issueMagicLinkToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

/** sha256-hex of a raw magic-link token. Used both at issue + callback. */
export function hashMagicLinkToken(rawToken: string): string {
  return sha256Hex(rawToken);
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// Session cookie
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'updraft_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionPayload {
  uid: string;
  exp: number;
}

function getCookieSecret(): string {
  const secret = process.env.UPDRAFT_SESSION_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('UPDRAFT_SESSION_COOKIE_SECRET must be set (>= 32 chars)');
  }
  return secret;
}

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad),
    'base64',
  );
}

function sign(body: string): string {
  return base64urlEncode(createHmac('sha256', getCookieSecret()).update(body).digest());
}

/** Mints a new signed cookie value carrying {uid, exp}. */
export function mintSessionCookieValue(userId: string): {
  value: string;
  expiresAt: Date;
} {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const payload: SessionPayload = { uid: userId, exp: expiresAt.getTime() };
  const body = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body);
  return { value: `${body}.${sig}`, expiresAt };
}

/** Verifies a signed cookie value. Returns the userId, or null if invalid/expired. */
export function readSessionCookieValue(value: string | undefined): string | null {
  if (!value || typeof value !== 'string' || !value.includes('.')) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp < Date.now()) return null;
  return payload.uid;
}

/** Cookie flags shared by Set-Cookie writers. */
export function sessionCookieFlags(expiresAt: Date): {
  httpOnly: true;
  secure: true;
  sameSite: 'lax';
  path: '/';
  expires: Date;
} {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Owner bypass (UPDRAFT_OWNER_SECRET)
// ---------------------------------------------------------------------------

/** True iff the request carries Authorization: Bearer $UPDRAFT_OWNER_SECRET. */
export function isUpdraftOwner(req: NextRequest | Request): boolean {
  const expected = process.env.UPDRAFT_OWNER_SECRET;
  if (!expected) return false;
  const headers = (req as Request).headers;
  const match = headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Server-component helper (App Router)
// ---------------------------------------------------------------------------

/**
 * Reads + verifies the session cookie from a server component / page.
 * Returns the user_id on success, null on missing/invalid/expired.
 *
 * Usage:
 *   const userId = await readSessionUserIdFromCookies();
 *   if (!userId) redirect('/updraft/login');
 */
export async function readSessionUserIdFromCookies(): Promise<string | null> {
  // Lazy import so this module stays usable from non-server contexts that
  // never call this function (e.g. test fixtures that just verify cookies).
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return readSessionCookieValue(store.get(SESSION_COOKIE_NAME)?.value);
}
