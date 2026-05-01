import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Verifies a `Authorization: Bearer <CRON_SECRET>` header.
 * Used to gate /api/conflict/status and any future privileged endpoints.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const match = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
