// POST /api/conflict/ingest
//
// Receives a pre-built JSON payload from the daily Claude Code Routine and
// writes it to Supabase.  The Routine does the AI research (web_search via
// Anthropic's infrastructure, billed against the user's Max plan); this
// endpoint owns the validation + database-write half of the pipeline so the
// Supabase service-role key never has to live anywhere outside Vercel.
//
// Auth: bearer token (CRON_SECRET) — same pattern as the prior cron routes.
// The token grants permission to push validated conflict data and nothing
// else.  If it leaks, the worst an attacker can do is push junk that gets
// dropped by validation.

import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import {
  isConflictStoreConfigured,
  upsertActors,
  upsertHotspots,
  upsertNews,
  writeSnapshot,
} from '@/lib/conflict-store';
import { validatePayload } from '@/lib/conflict-validate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isConflictStoreConfigured()) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body is not valid JSON' }, { status: 400 });
  }

  const validated = validatePayload(body);
  if (!validated) {
    return NextResponse.json(
      { error: 'payload missing required fields (snapshot + ≥1 valid hotspot)' },
      { status: 400 },
    );
  }
  const { payload, stats } = validated;

  // Hotspots first — actors and news both reference hotspots via FK, so they
  // must exist in the table before the dependent rows go in.
  await upsertHotspots(payload.hotspots);

  const [actorsWritten, newsWritten] = await Promise.all([
    upsertActors(payload.actors),
    upsertNews(payload.news),
  ]);

  await writeSnapshot(payload.snapshot);

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    hotspots: stats.hotspots,
    actors: { ...stats.actors, dbWritten: actorsWritten },
    news: { ...stats.news, dbWritten: newsWritten },
    snapshot: stats.snapshot,
  });
}
