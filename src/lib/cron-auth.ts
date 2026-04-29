import type { NextRequest } from 'next/server';

/**
 * Verifies a request was made by Vercel Cron (or a trusted caller).
 * Vercel Cron sends `Authorization: Bearer ${process.env.CRON_SECRET}`.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // No secret set — refuse to run rather than expose an unauthenticated job.
    return false;
  }
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Constant-time-ish: lengths match and equal-by-char.
  const provided = match[1];
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}
