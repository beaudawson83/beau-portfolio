// Conflict Heat Map — Supabase persistence layer.
// All functions gracefully no-op (or return empty/null) when Supabase is unconfigured,
// matching the pattern in src/lib/supabase.ts.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorConfidence,
  ActorRole,
  ConflictActor,
  ConflictData,
  ConflictHotspot,
  ConflictNewsItem,
  ConflictType,
} from './conflict-data';

// Resolve Supabase config in priority order:
//   1. BEAU_SUPABASE_*      — owned by us; Marketplace integration can't touch these
//   2. SUPABASE_URL / *_SECRET_KEY / *_PUBLISHABLE_KEY — Marketplace native
//   3. NEXT_PUBLIC_SUPABASE_URL / *_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — legacy
// Server-side only — no NEXT_PUBLIC_ prefix needed.
const SUPABASE_URL =
  process.env.BEAU_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const SUPABASE_SERVICE_KEY =
  process.env.BEAU_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';
const SUPABASE_ANON_KEY =
  process.env.BEAU_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export function isConflictStoreConfigured(): boolean {
  return Boolean(SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY));
}

function getReadClient(): SupabaseClient | null {
  if (!SUPABASE_URL) return null;
  // Prefer the service key on the server (it's only present server-side); fall back to anon.
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key);
}

function getWriteClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      'conflict-store: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for writes',
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ===========================================================================
// READ
// ===========================================================================

interface SnapshotRow {
  captured_at: string;
  total_active: number;
  casualties_7d: number;
  displaced: number;
  countries_involved: number;
  weekly_delta: { conflicts: number; casualties: number; displaced: number };
}

interface HotspotRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  intensity: number;
  type: string;
  since: string | null;
  iso: string[];
  casualties_7d: number;
  is_active: boolean;
  last_seen: string;
}

interface NewsRow {
  id: string;
  conflict_id: string | null;
  source: string;
  headline: string;
  url: string;
  region: string | null;
  published_at: string | null;
  ingested_at: string;
}

function rowToHotspot(r: HotspotRow): ConflictHotspot {
  const intensity = Math.max(1, Math.min(5, Math.round(r.intensity))) as 1 | 2 | 3 | 4 | 5;
  return {
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    intensity,
    type: r.type as ConflictType,
    since: r.since ?? '',
    iso: Array.isArray(r.iso) ? r.iso : [],
    casualties7d: r.casualties_7d,
  };
}

function rowToNewsItem(r: NewsRow, idx: number): ConflictNewsItem {
  return {
    id: idx + 1,
    source: r.source,
    headline: r.headline,
    url: r.url,
    region: r.region ?? '',
    time: relativeTime(r.published_at ?? r.ingested_at),
  };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function readLatestSnapshot(): Promise<SnapshotRow | null> {
  const sb = getReadClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('conflict_snapshots')
    .select(
      'captured_at,total_active,casualties_7d,displaced,countries_involved,weekly_delta',
    )
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle<SnapshotRow>();
  if (error) {
    console.error('readLatestSnapshot:', error);
    return null;
  }
  return data;
}

export async function readActiveHotspots(): Promise<ConflictHotspot[]> {
  const sb = getReadClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('conflict_hotspots')
    .select('id,name,lat,lng,intensity,type,since,iso,casualties_7d,is_active,last_seen')
    .eq('is_active', true)
    .order('intensity', { ascending: false });
  if (error) {
    console.error('readActiveHotspots:', error);
    return [];
  }
  return ((data ?? []) as HotspotRow[]).map(rowToHotspot);
}

export interface NewsQuery {
  conflictId?: string;
  sinceHours?: number;
  before?: string; // ISO string for cursor pagination (published_at < before)
  limit?: number;
}

async function queryNewsRows(q: NewsQuery): Promise<NewsRow[]> {
  const sb = getReadClient();
  if (!sb) return [];
  const limit = Math.max(1, Math.min(100, q.limit ?? 12));
  let query = sb
    .from('conflict_news')
    .select('id,conflict_id,source,headline,url,region,published_at,ingested_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (q.conflictId) query = query.eq('conflict_id', q.conflictId);
  if (q.sinceHours !== undefined) {
    const since = new Date(Date.now() - q.sinceHours * 3600 * 1000).toISOString();
    query = query.gte('published_at', since);
  }
  if (q.before) query = query.lt('published_at', q.before);

  const { data, error } = await query;
  if (error) {
    console.error('readNews:', error);
    return [];
  }
  return (data ?? []) as NewsRow[];
}

export async function readNews(q: NewsQuery = {}): Promise<ConflictNewsItem[]> {
  const rows = await queryNewsRows(q);
  return rows.map(rowToNewsItem);
}

export interface TimelineItem {
  source: string;
  headline: string;
  url: string;
  region: string | null;
  publishedAt: string | null;
  ingestedAt: string;
}

export async function readNewsTimeline(q: NewsQuery = {}): Promise<TimelineItem[]> {
  const rows = await queryNewsRows(q);
  return rows.map((r) => ({
    source: r.source,
    headline: r.headline,
    url: r.url,
    region: r.region,
    publishedAt: r.published_at,
    ingestedAt: r.ingested_at,
  }));
}

/**
 * Reads stats + active hotspots + last-24h news + actors from Supabase.
 * Returns null if the store is empty (caller should fall back).
 */
export async function readConflictData(): Promise<ConflictData | null> {
  if (!isConflictStoreConfigured()) return null;

  const [snapshot, hotspots, news, actors] = await Promise.all([
    readLatestSnapshot(),
    readActiveHotspots(),
    readNews({ sinceHours: 24, limit: 12 }),
    readActors(),
  ]);

  if (!snapshot || hotspots.length === 0) return null;

  return {
    lastUpdated: snapshot.captured_at,
    totalActive: snapshot.total_active,
    casualties7d: snapshot.casualties_7d,
    displaced: snapshot.displaced,
    countriesInvolved: snapshot.countries_involved,
    weeklyDelta: snapshot.weekly_delta,
    hotspots,
    news,
    actors,
  };
}

// ===========================================================================
// ACTORS — multi-pass identification protocol
// ===========================================================================

interface ActorRow {
  conflict_id: string;
  country_iso: string;
  role: string;
  confidence: string;
  notes: string | null;
  sources: unknown;
  first_documented: string | null;
  last_confirmed: string;
}

const VALID_ROLES: ReadonlySet<ActorRole> = new Set([
  'territory',
  'principal',
  'direct',
  'sponsor',
  'supplier',
  'proxy',
  'basing',
  'mediator',
]);

const VALID_CONFIDENCE: ReadonlySet<ActorConfidence> = new Set(['high', 'medium', 'low']);

function rowToActor(r: ActorRow): ConflictActor {
  const role = (VALID_ROLES.has(r.role as ActorRole) ? r.role : 'sponsor') as ActorRole;
  const confidence = (
    VALID_CONFIDENCE.has(r.confidence as ActorConfidence) ? r.confidence : 'medium'
  ) as ActorConfidence;
  const sources = Array.isArray(r.sources)
    ? (r.sources as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  return {
    conflictId: r.conflict_id,
    countryIso: r.country_iso,
    role,
    confidence,
    notes: r.notes,
    sources,
    firstDocumented: r.first_documented,
    lastConfirmed: r.last_confirmed,
  };
}

export interface ActorQuery {
  conflictId?: string;
  countryIso?: string;
  role?: ActorRole;
  minConfidence?: ActorConfidence;
}

export async function readActors(q: ActorQuery = {}): Promise<ConflictActor[]> {
  const sb = getReadClient();
  if (!sb) return [];
  let query = sb
    .from('conflict_actors')
    .select(
      'conflict_id,country_iso,role,confidence,notes,sources,first_documented,last_confirmed',
    );
  if (q.conflictId) query = query.eq('conflict_id', q.conflictId);
  if (q.countryIso) query = query.eq('country_iso', q.countryIso);
  if (q.role) query = query.eq('role', q.role);
  // Confidence filter handled client-side because Supabase has no enum ordering for it.
  const { data, error } = await query;
  if (error) {
    console.error('readActors:', error);
    return [];
  }
  let rows = ((data ?? []) as ActorRow[]).map(rowToActor);
  if (q.minConfidence) {
    const order: Record<ActorConfidence, number> = { low: 0, medium: 1, high: 2 };
    const min = order[q.minConfidence];
    rows = rows.filter((a) => order[a.confidence] >= min);
  }
  return rows;
}

/**
 * Upserts actor relationships keyed by (conflict_id, country_iso, role).
 * Caller is responsible for source validation (≥1 https URL) — we trust input.
 */
export async function upsertActors(actors: ConflictActor[]): Promise<number> {
  if (actors.length === 0) return 0;
  const sb = getWriteClient();
  const now = new Date().toISOString();
  const rows = actors.map((a) => ({
    conflict_id: a.conflictId,
    country_iso: a.countryIso,
    role: a.role,
    confidence: a.confidence,
    notes: a.notes ?? null,
    sources: a.sources,
    first_documented: a.firstDocumented ?? null,
    last_confirmed: now,
  }));
  const { data, error } = await sb
    .from('conflict_actors')
    .upsert(rows, { onConflict: 'conflict_id,country_iso,role' })
    .select('country_iso');
  if (error) throw error;
  return data?.length ?? 0;
}

// ===========================================================================
// WRITE
// ===========================================================================

export interface SnapshotInput {
  totalActive: number;
  casualties7d: number;
  displaced: number;
  countriesInvolved: number;
  weeklyDelta: { conflicts: number; casualties: number; displaced: number };
  source: 'live';
}

export async function writeSnapshot(s: SnapshotInput): Promise<void> {
  const sb = getWriteClient();
  const { error } = await sb.from('conflict_snapshots').insert({
    total_active: s.totalActive,
    casualties_7d: s.casualties7d,
    displaced: s.displaced,
    countries_involved: s.countriesInvolved,
    weekly_delta: s.weeklyDelta,
    source: s.source,
  });
  if (error) throw error;
}

/**
 * Upserts hotspots from a live scan.
 * Marks any prior-active hotspots NOT in the new list as is_active=false.
 */
export async function upsertHotspots(hotspots: ConflictHotspot[]): Promise<void> {
  const sb = getWriteClient();
  if (hotspots.length === 0) return;

  const now = new Date().toISOString();
  const rows = hotspots.map((h) => ({
    id: h.id,
    name: h.name,
    lat: h.lat,
    lng: h.lng,
    intensity: h.intensity,
    type: h.type,
    since: h.since,
    iso: h.iso,
    casualties_7d: h.casualties7d,
    is_active: true,
    last_seen: now,
  }));

  const { error: upsertErr } = await sb
    .from('conflict_hotspots')
    .upsert(rows, { onConflict: 'id' });
  if (upsertErr) throw upsertErr;

  const seenIds = hotspots.map((h) => h.id);
  const { error: deactivateErr } = await sb
    .from('conflict_hotspots')
    .update({ is_active: false })
    .eq('is_active', true)
    .not('id', 'in', `(${seenIds.map((id) => `"${id}"`).join(',')})`);
  if (deactivateErr) {
    console.error('upsertHotspots deactivate:', deactivateErr);
  }
}

export interface IncomingNews {
  conflictId?: string | null;
  source: string;
  headline: string;
  url: string;
  region?: string | null;
  publishedAt?: string | null; // ISO
}

/**
 * Inserts news items, deduplicating on the URL unique index.
 * Returns the count of new (non-duplicate) rows written.
 */
export async function upsertNews(items: IncomingNews[]): Promise<number> {
  const sb = getWriteClient();
  const cleaned = items
    .filter((i) => i.url && /^https?:\/\//.test(i.url))
    .map((i) => ({
      conflict_id: i.conflictId ?? null,
      source: i.source.slice(0, 64),
      headline: i.headline.slice(0, 500),
      url: i.url,
      region: i.region ?? null,
      published_at: i.publishedAt ?? null,
    }));
  if (cleaned.length === 0) return 0;

  // upsert with ignoreDuplicates so we don't bump the existing row
  const { data, error } = await sb
    .from('conflict_news')
    .upsert(cleaned, { onConflict: 'url', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
