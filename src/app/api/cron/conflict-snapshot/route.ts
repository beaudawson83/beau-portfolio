// Vercel Cron: global conflict snapshot — runs the full multi-pass identification
// protocol and persists the result.
//
//   Pass 1  globalScan          territorial/event-level scan (ACLED-style framing)
//   Pass 2  belligerentsScan    principals, direct ops, basing — sourced
//   Pass 3  proxyScan           sponsors, suppliers, proxies — STRICTLY documented
//
// All three passes use Gemini 2.0 Flash with Google Search grounding.
// Every actor row must carry ≥1 plausible source URL or it gets dropped.

import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import {
  belligerentsScan,
  globalScan,
  proxyScan,
} from '@/lib/conflict-ingest';
import {
  isConflictStoreConfigured,
  upsertActors,
  upsertHotspots,
  upsertNews,
  writeSnapshot,
} from '@/lib/conflict-store';
import type { ConflictHotspot } from '@/lib/conflict-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isConflictStoreConfigured()) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 503 });
  }

  // Pass 1 — territorial scan
  const scan = await globalScan();
  if (!scan) {
    return NextResponse.json({ error: 'pass-1 (global) scan failed' }, { status: 502 });
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

  // Stash global-scan headlines (they merge with the per-conflict journal via URL unique).
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

  // Pass 2 — belligerents (principals / direct / basing)
  const belligerents = await belligerentsScan(scan.hotspots);
  // Pass 2 may discover new hotspots (e.g. great-power direct ops not yet on the list).
  const allHotspots: ConflictHotspot[] = [...scan.hotspots];
  if (belligerents.newHotspots.length) {
    const seen = new Set(allHotspots.map((h) => h.id));
    for (const h of belligerents.newHotspots) {
      if (!seen.has(h.id)) {
        allHotspots.push(h);
        seen.add(h.id);
      }
    }
    await upsertHotspots(belligerents.newHotspots);
  }
  const insertedBelligerents = belligerents.actors.length
    ? await upsertActors(belligerents.actors)
    : 0;

  // Pass 3 — sponsors / suppliers / proxies (strict documentation threshold)
  const proxies = await proxyScan(allHotspots, belligerents.actors);
  const insertedProxies = proxies.length ? await upsertActors(proxies) : 0;

  return NextResponse.json({
    ok: true,
    snapshotAt: new Date().toISOString(),
    pass1: {
      hotspots: scan.hotspots.length,
      newsInserted: insertedNews,
    },
    pass2: {
      newHotspots: belligerents.newHotspots.length,
      actorsInserted: insertedBelligerents,
      actorsRejected: 'see logs', // shape-only validation drops unsourced rows silently
    },
    pass3: {
      actorsInserted: insertedProxies,
    },
  });
}
