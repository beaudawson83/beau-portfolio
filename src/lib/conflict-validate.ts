// Conflict Heat Map — payload validation for the /api/conflict/ingest endpoint.
//
// Inputs come from the daily Claude Code Routine, which does the research and
// builds JSON.  This module's job is to harden the payload before it touches
// Supabase: enforce shape, drop unsourced rows, and normalize ISO codes.

import type {
  ActorConfidence,
  ActorRole,
  ConflictActor,
  ConflictHotspot,
  ConflictType,
} from './conflict-data';

// ===========================================================================
// SOURCE URL VALIDATION
// ===========================================================================

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

const VALID_HOTSPOT_TYPES: ReadonlySet<ConflictType> = new Set([
  'interstate',
  'civil-war',
  'occupation',
  'insurgency',
  'criminal',
]);

// Reputable hosts.  Any URL whose hostname is one of these (or a subdomain of
// one) counts as a "documented" source for actor rows.  Pass 3 (sponsors /
// suppliers / proxies) is enforced strictly against this list; territory and
// principal claims allow any well-formed https URL since they're trivially
// sourceable.
const REPUTABLE_HOSTS = [
  'reuters.com', 'apnews.com', 'afp.com', 'bbc.com', 'aljazeera.com',
  'theguardian.com', 'nytimes.com', 'ft.com', 'wsj.com',
  'washingtonpost.com', 'economist.com',
  'crisisgroup.org', 'acleddata.com', 'ucdp.uu.se', 'sipri.org',
  'understandingwar.org', 'rusi.org', 'iiss.org', 'csis.org', 'cfr.org',
  'icct.nl',
  'un.org', 'unhcr.org', 'unocha.org', 'icj-cij.org', 'icc-cpi.int',
  'state.gov', 'treasury.gov', 'defense.gov', 'centcom.mil',
  'gov.uk', 'bundesregierung.de', 'europa.eu', 'consilium.europa.eu',
];

function isPlausibleSource(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isReputableSource(url: string): boolean {
  if (!isPlausibleSource(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return REPUTABLE_HOSTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function normalizeIso(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const s = String(raw).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  return String(parseInt(s, 10));
}

// ===========================================================================
// HOTSPOT VALIDATION
// ===========================================================================

export function coerceHotspot(raw: unknown): ConflictHotspot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id.trim().toLowerCase() : '';
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!id || !name) return null;

  const lat = typeof r.lat === 'number' ? r.lat : Number.NaN;
  const lng = typeof r.lng === 'number' ? r.lng : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const intensity = typeof r.intensity === 'number' ? Math.round(r.intensity) : 0;
  if (intensity < 1 || intensity > 5) return null;

  const type = typeof r.type === 'string' ? (r.type as ConflictType) : null;
  if (!type || !VALID_HOTSPOT_TYPES.has(type)) return null;

  const since = typeof r.since === 'string' ? r.since : '';

  const isoRaw = Array.isArray(r.iso) ? r.iso : [];
  const iso = isoRaw
    .map((v) => normalizeIso(v))
    .filter((v): v is string => v !== null);

  const casualties7d =
    typeof r.casualties7d === 'number'
      ? Math.max(0, Math.round(r.casualties7d))
      : typeof r.casualties_7d === 'number'
      ? Math.max(0, Math.round(r.casualties_7d))
      : 0;

  return {
    id, name, lat, lng,
    intensity: intensity as ConflictHotspot['intensity'],
    casualties7d, type, since, iso,
  };
}

// ===========================================================================
// ACTOR VALIDATION
// ===========================================================================

interface CoerceActorOpts {
  knownConflictIds: ReadonlySet<string>;
  // Combat-tier roles (territory, principal, direct, basing) may use any
  // plausible https URL.  Support-tier roles (sponsor, supplier, proxy) must
  // cite a host on the reputable allowlist.  This is the "documented & sourced
  // only" threshold doing its work in code.
}

export function coerceActor(
  raw: unknown,
  opts: CoerceActorOpts,
): ConflictActor | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const conflictId = typeof r.conflictId === 'string'
    ? r.conflictId.trim().toLowerCase()
    : typeof r.conflict_id === 'string'
    ? r.conflict_id.trim().toLowerCase()
    : '';
  if (!conflictId || !opts.knownConflictIds.has(conflictId)) return null;

  const countryIso = normalizeIso(r.countryIso ?? r.country_iso);
  if (!countryIso) return null;

  const role = typeof r.role === 'string' ? (r.role as ActorRole) : null;
  if (!role || !VALID_ROLES.has(role)) return null;

  const confidence: ActorConfidence =
    typeof r.confidence === 'string' && VALID_CONFIDENCE.has(r.confidence as ActorConfidence)
      ? (r.confidence as ActorConfidence)
      : 'medium';

  const isCombatTier =
    role === 'territory' || role === 'principal' || role === 'direct' || role === 'basing';
  const sourceCheck = isCombatTier ? isPlausibleSource : isReputableSource;

  const sources = Array.isArray(r.sources)
    ? (r.sources as unknown[]).filter(
        (s): s is string => typeof s === 'string' && sourceCheck(s),
      )
    : [];
  if (sources.length === 0) return null; // strict: no source = drop

  return {
    conflictId,
    countryIso,
    role,
    confidence,
    notes: typeof r.notes === 'string' ? r.notes.slice(0, 280) : null,
    sources,
  };
}

// ===========================================================================
// NEWS VALIDATION
// ===========================================================================

export interface IngestedNews {
  conflictId: string | null;
  source: string;
  headline: string;
  url: string;
  region: string | null;
  publishedAt: string | null;
}

export function coerceNews(
  raw: unknown,
  knownConflictIds: ReadonlySet<string>,
): IngestedNews | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const url = typeof r.url === 'string' ? r.url.trim() : '';
  if (!isPlausibleSource(url)) return null;

  const source = typeof r.source === 'string' ? r.source.trim().toUpperCase() : '';
  const headline = typeof r.headline === 'string' ? r.headline.trim() : '';
  if (!source || !headline) return null;

  const conflictIdRaw = typeof r.conflictId === 'string'
    ? r.conflictId
    : typeof r.conflict_id === 'string'
    ? r.conflict_id
    : '';
  const conflictId = conflictIdRaw.trim().toLowerCase() || null;
  // If a conflictId is provided but doesn't match a known hotspot, null it out
  // rather than dropping the news item (the FK is nullable).
  const validConflictId = conflictId && knownConflictIds.has(conflictId) ? conflictId : null;

  const region = typeof r.region === 'string' ? r.region.trim() : null;

  const publishedAtRaw =
    typeof r.publishedAt === 'string'
      ? r.publishedAt
      : typeof r.published_at === 'string'
      ? r.published_at
      : null;
  // Loose ISO 8601 check; if it doesn't parse, store null.
  let publishedAt: string | null = null;
  if (publishedAtRaw) {
    const parsed = Date.parse(publishedAtRaw);
    if (!Number.isNaN(parsed)) publishedAt = new Date(parsed).toISOString();
  }

  return {
    conflictId: validConflictId,
    source,
    headline,
    url,
    region,
    publishedAt,
  };
}

// ===========================================================================
// SNAPSHOT VALIDATION
// ===========================================================================

export interface IngestedSnapshot {
  totalActive: number;
  casualties7d: number;
  displaced: number;
  countriesInvolved: number;
  weeklyDelta: { conflicts: number; casualties: number; displaced: number };
  source: 'live';
}

function toInt(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) return parseInt(raw, 10);
  return 0;
}

export function coerceSnapshot(raw: unknown): IngestedSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const totalActive = toInt(r.totalActive ?? r.total_active);
  if (totalActive < 0) return null;
  const casualties7d = toInt(r.casualties7d ?? r.casualties_7d);
  const displaced = toInt(r.displaced);
  const countriesInvolved = toInt(r.countriesInvolved ?? r.countries_involved);

  const wd = r.weeklyDelta ?? r.weekly_delta;
  const wdr = (wd && typeof wd === 'object' ? wd : {}) as Record<string, unknown>;
  const weeklyDelta = {
    conflicts: toInt(wdr.conflicts),
    casualties: toInt(wdr.casualties),
    displaced: toInt(wdr.displaced),
  };

  return {
    totalActive,
    casualties7d,
    displaced,
    countriesInvolved,
    weeklyDelta,
    source: 'live',
  };
}

// ===========================================================================
// FULL PAYLOAD VALIDATION
// ===========================================================================

export interface IngestPayload {
  snapshot: IngestedSnapshot;
  hotspots: ConflictHotspot[];
  actors: ConflictActor[];
  news: IngestedNews[];
}

export interface IngestStats {
  hotspots: { received: number; written: number };
  actors: { received: number; written: number; droppedUnsourced: number };
  news: { received: number; written: number };
  snapshot: { written: number };
}

/**
 * Validates the raw payload from the Routine.  Returns the cleaned payload
 * plus a stats object describing what was dropped.  Returns null if the
 * payload is structurally invalid (no hotspots, no snapshot).
 */
export function validatePayload(
  raw: unknown,
): { payload: IngestPayload; stats: IngestStats } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const snapshot = coerceSnapshot(r.snapshot);
  if (!snapshot) return null;

  const hotspotsRaw = Array.isArray(r.hotspots) ? r.hotspots : [];
  const hotspots = hotspotsRaw
    .map(coerceHotspot)
    .filter((h): h is ConflictHotspot => h !== null);
  if (hotspots.length === 0) return null;

  const knownIds = new Set(hotspots.map((h) => h.id));

  const actorsRaw = Array.isArray(r.actors) ? r.actors : [];
  const actors = actorsRaw
    .map((a) => coerceActor(a, { knownConflictIds: knownIds }))
    .filter((a): a is ConflictActor => a !== null);

  const newsRaw = Array.isArray(r.news) ? r.news : [];
  const news = newsRaw
    .map((n) => coerceNews(n, knownIds))
    .filter((n): n is IngestedNews => n !== null);

  return {
    payload: { snapshot, hotspots, actors, news },
    stats: {
      hotspots: { received: hotspotsRaw.length, written: hotspots.length },
      actors: {
        received: actorsRaw.length,
        written: actors.length,
        droppedUnsourced: actorsRaw.length - actors.length,
      },
      news: { received: newsRaw.length, written: news.length },
      snapshot: { written: 1 },
    },
  };
}
