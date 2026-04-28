import type { NextRequest } from 'next/server';

function fingerprint(s: string): string {
  if (s.length <= 8) return `len=${s.length}`;
  return `len=${s.length} ${s.slice(0, 4)}…${s.slice(-4)}`;
}

/**
 * Verifies a request was made by Vercel Cron (or a trusted caller).
 * Vercel Cron sends `Authorization: Bearer ${process.env.CRON_SECRET}`.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error('cron-auth: CRON_SECRET env var is not set on this deployment');
    return false;
  }
  const auth = req.headers.get('authorization');
  if (!auth) {
    console.error('cron-auth: no Authorization header on request');
    return false;
  }
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    console.error('cron-auth: Authorization header does not look like "Bearer <token>"');
    return false;
  }
  // Constant-time-ish: lengths match and equal-by-char.
  const provided = match[1];
  if (provided.length !== expected.length) {
    console.error(
      `cron-auth: length mismatch — expected ${fingerprint(expected)}, got ${fingerprint(provided)}`,
    );
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  if (mismatch !== 0) {
    console.error(
      `cron-auth: token mismatch — expected ${fingerprint(expected)}, got ${fingerprint(provided)}`,
    );
    return false;
  }
  return true;
}
