// Per-conflict news timeline.
//
// GET /api/global-conflict/news?conflict=ukr&limit=25&before=<iso>
//   - conflict: required hotspot id
//   - limit: 1..100 (default 25)
//   - before: optional ISO cursor (returns items with published_at < before)
//
// Response: { items, nextBefore } where nextBefore is the ISO timestamp to
// pass back as `before` to fetch the next page (or null if there are no more).

import { NextResponse, type NextRequest } from 'next/server';
import { isConflictStoreConfigured, readNewsTimeline } from '@/lib/conflict-store';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conflictId = searchParams.get('conflict');
  if (!conflictId) {
    return NextResponse.json({ error: 'conflict param required' }, { status: 400 });
  }
  if (!/^[a-z0-9_-]{1,32}$/.test(conflictId)) {
    return NextResponse.json({ error: 'invalid conflict id' }, { status: 400 });
  }

  const limitRaw = parseInt(searchParams.get('limit') ?? '25', 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 25;

  const before = searchParams.get('before') ?? undefined;
  if (before && Number.isNaN(new Date(before).getTime())) {
    return NextResponse.json({ error: 'invalid before cursor' }, { status: 400 });
  }

  if (!isConflictStoreConfigured()) {
    return NextResponse.json({
      items: [],
      nextBefore: null,
      note: 'journal not configured',
    });
  }

  const rows = await readNewsTimeline({ conflictId, limit, before });
  const last = rows[rows.length - 1];
  const nextBefore = rows.length === limit && last?.publishedAt ? last.publishedAt : null;

  return NextResponse.json(
    { items: rows, nextBefore, conflictId, limit },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } },
  );
}
