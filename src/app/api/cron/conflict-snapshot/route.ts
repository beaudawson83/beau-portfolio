// Vercel Cron: global conflict scan.
// Runs the broad Gemini search to discover active conflicts and current stats,
// then writes a snapshot row + upserts hotspots into Supabase.

import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { globalScan } from '@/lib/conflict-ingest';
import {
  isConflictStoreConfigured,
  upsertHotspots,
  upsertNews,
  writeSnapshot,
} from '@/lib/conflict-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isConflictStoreConfigured()) {
    return NextResponse.json(
      { error: 'supabase not configured' },
      { status: 503 },
    );
  }

  const scan = await globalScan();
  if (!scan) {
    return NextResponse.json({ error: 'gemini scan failed' }, { status: 502 });
  }

  await writeSnapshot({
    totalActive: scan.totalActive,
    casualties7d: scan.casualties7d,
    displaced: scan.displaced,
    countriesInvolved: scan.countriesInvolved,
    weeklyDelta: scan.weeklyDelta,
    source: 'live',
  });

  await upsertHotspots(scan.hotspots);

  // Stash the global-scan headlines too — they'll merge with the per-conflict
  // journal via the URL unique constraint.
  const newRows = scan.news
    .filter((n) => n.url && /^https?:\/\//.test(n.url))
    .map((n) => ({
      conflictId: n.conflictId ?? null,
      source: n.source,
      headline: n.headline,
      url: n.url,
      region: n.region ?? null,
      publishedAt: n.publishedAt ?? null,
    }));
  const insertedNews = newRows.length ? await upsertNews(newRows) : 0;

  return NextResponse.json({
    ok: true,
    hotspotsUpserted: scan.hotspots.length,
    newsInserted: insertedNews,
    snapshotAt: new Date().toISOString(),
  });
}
