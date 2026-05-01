import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Verifies an `Authorization: Bearer <BLOG_EDITOR_SECRET>` header.
 * Mirrors isCronAuthorized in cron-auth.ts but reads a separate env var so
 * the cron secret and editor secret can rotate independently.
 */
export function isBlogEditorAuthorized(req: NextRequest): boolean {
  const expected = process.env.BLOG_EDITOR_SECRET;
  if (!expected) return false;

  const match = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
