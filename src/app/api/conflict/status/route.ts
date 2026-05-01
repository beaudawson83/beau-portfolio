// GET /api/conflict/status
//
// Diagnostic heartbeat. Returns the live state of the conflict-module
// data pipeline — which env vars are populated, whether the database
// is reachable, row counts per table, freshness of the latest snapshot.
// Reveals only metadata; no secret values are returned.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url =
    process.env.BEAU_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.BEAU_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  const anonKey =
    process.env.BEAU_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const cronSecret = process.env.CRON_SECRET || '';

  // Which name family resolved? Lets us see at a glance whether BEAU_* won,
  // Marketplace native won, or legacy fell through.
  const sourceOfUrl = process.env.BEAU_SUPABASE_URL
    ? 'BEAU_*'
    : process.env.SUPABASE_URL
      ? 'marketplace-native'
      : process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'legacy'
        : 'none';

  const env = {
    SUPABASE_URL: url ? new URL(url).hostname : null,
    sourceOfUrl,
    serviceKeyPresent: serviceKey.length > 0,
    serviceKeyLength: serviceKey.length,
    serviceKeyKind: serviceKey.startsWith('sb_secret_')
      ? 'new-opaque'
      : serviceKey.includes('.')
        ? 'legacy-jwt'
        : serviceKey.length === 0
          ? 'missing'
          : 'unknown',
    anonKeyPresent: anonKey.length > 0,
    anonKeyKind: anonKey.startsWith('sb_publishable_')
      ? 'new-opaque'
      : anonKey.includes('.')
        ? 'legacy-jwt'
        : anonKey.length === 0
          ? 'missing'
          : 'unknown',
    cronSecretPresent: cronSecret.length > 0,
  };

  if (!url || !serviceKey) {
    return NextResponse.json({
      ok: false,
      reason: 'env vars missing',
      env,
    });
  }

  // Use the service-role key to bypass RLS. Each query is isolated so a
  // single failure doesn't mask the others.
  const sb = createClient(url, serviceKey);
  const tables = ['conflict_snapshots', 'conflict_hotspots', 'conflict_news', 'conflict_actors'];
  const tableStatus: Record<string, { ok: boolean; count: number | null; error: string | null }> = {};

  for (const t of tables) {
    const { count, error } = await sb
      .from(t)
      .select('*', { count: 'exact', head: true });
    tableStatus[t] = {
      ok: !error,
      count: count ?? null,
      error: error ? `${error.code ?? ''}: ${error.message}` : null,
    };
  }

  const { data: latestSnap, error: snapErr } = await sb
    .from('conflict_snapshots')
    .select('captured_at,total_active,source')
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestNews } = await sb
    .from('conflict_news')
    .select('ingested_at,headline')
    .order('ingested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: activeHotspots } = await sb
    .from('conflict_hotspots')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  return NextResponse.json({
    ok: !snapErr && (latestSnap !== null) && (activeHotspots ?? 0) > 0,
    env,
    tables: tableStatus,
    latestSnapshot: latestSnap
      ? {
          capturedAt: latestSnap.captured_at,
          totalActive: latestSnap.total_active,
          source: latestSnap.source,
        }
      : null,
    latestNews: latestNews
      ? {
          ingestedAt: latestNews.ingested_at,
          headline: latestNews.headline.slice(0, 80),
        }
      : null,
    activeHotspotCount: activeHotspots ?? 0,
  });
}
