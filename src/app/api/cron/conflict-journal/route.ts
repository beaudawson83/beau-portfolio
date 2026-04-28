// Vercel Cron: per-conflict deep journal scan.
// For each active hotspot in Supabase, runs a focused Gemini search and
// appends fresh, deduped news rows into the journal.

import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { perConflictScan } from '@/lib/conflict-ingest';
import {
  isConflictStoreConfigured,
  readActiveHotspots,
  upsertNews,
} from '@/lib/conflict-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 min for the full sweep

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

  const hotspots = await readActiveHotspots();
  if (hotspots.length === 0) {
    return NextResponse.json({
      ok: true,
      note: 'no active hotspots — run conflict-snapshot first',
    });
  }

  let totalInserted = 0;
  const perConflict: Array<{ id: string; scanned: number; inserted: number }> = [];

  // Run scans serially to stay well under Gemini rate limits.
  for (const h of hotspots) {
    try {
      const items = await perConflictScan(h);
      const inserted = items.length
        ? await upsertNews(
            items.map((i) => ({
              conflictId: h.id,
              source: i.source,
              headline: i.headline,
              url: i.url,
              region: i.region ?? null,
              publishedAt: i.publishedAt ?? null,
            })),
          )
        : 0;
      perConflict.push({ id: h.id, scanned: items.length, inserted });
      totalInserted += inserted;
    } catch (err) {
      console.error(`conflict-journal: ${h.id} failed`, err);
      perConflict.push({ id: h.id, scanned: 0, inserted: 0 });
    }
  }

  return NextResponse.json({
    ok: true,
    hotspotsScanned: hotspots.length,
    newsInserted: totalInserted,
    perConflict,
  });
}
