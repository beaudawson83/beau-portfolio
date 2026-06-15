// Conflict Heat Map — types and the high-level read path.
//
// Read order at request time:
//   1. Supabase (latest snapshot + active hotspots + last-24h news)
//   2. Otherwise an empty payload — the page renders an explicit empty
//      state rather than synthetic data.
//
// The daily Claude Routine is responsible for keeping Supabase populated;
// this file is intentionally read-only.

export type ConflictType =
  | 'interstate'
  | 'civil-war'
  | 'occupation'
  | 'insurgency'
  | 'criminal';

// Phase 1 of the multi-pass identification protocol — the role a country plays
// relative to a given conflict.  See CLAUDE.md → "Global Conflict Index" for
// the full taxonomy.
export type ActorRole =
  | 'territory'   // soil where kinetic events occur
  | 'principal'   // primary state party to the violence
  | 'direct'      // state conducting strikes / ops in another's territory
  | 'sponsor'     // funding / political backing
  | 'supplier'    // arms / dual-use materiel
  | 'proxy'       // operationally directing a non-state actor
  | 'basing'      // forward-deployed combat-capable forces
  | 'mediator';   // formal third-party negotiation role

export type ActorConfidence = 'high' | 'medium' | 'low';

export interface ConflictActor {
  conflictId: string;
  countryIso: string;            // ISO 3166-1 numeric, no leading zeros
  role: ActorRole;
  confidence: ActorConfidence;
  notes?: string | null;
  sources: string[];             // ≥1 https:// URL required by ingest validation
  firstDocumented?: string | null; // ISO date
  lastConfirmed?: string | null;
}

export interface ConflictHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  casualties7d: number;
  /** People newly displaced from this conflict in the last 7 days. */
  displaced7d: number;
  type: ConflictType;
  since: string;
  iso: string[];
  /** 1–2 sentence narrative summary written by the Routine. Null until populated. */
  summary: string | null;
  /** Short note on resolution outlook written by the Routine. Null until populated. */
  resolutionOutlook: string | null;
  /** Last 7 daily casualty snapshots (oldest → newest) from conflict_daily_stats. */
  casualtyTrend: number[];
}

export interface ConflictNewsItem {
  id: number;
  source: string;
  time: string;
  region: string;
  headline: string;
  url: string;
}

export interface ConflictData {
  lastUpdated: string;
  totalActive: number;
  casualties7d: number;
  displaced: number;
  countriesInvolved: number;
  weeklyDelta: {
    conflicts: number;
    casualties: number;
    displaced: number;
  };
  hotspots: ConflictHotspot[];
  news: ConflictNewsItem[];
  actors: ConflictActor[]; // multi-pass actor model; empty pre-Phase-1
}

export interface ConflictPayload extends ConflictData {
  source: 'live' | 'empty';
}

const EMPTY_PAYLOAD: ConflictPayload = {
  lastUpdated: new Date(0).toISOString(),
  totalActive: 0,
  casualties7d: 0,
  displaced: 0,
  countriesInvolved: 0,
  weeklyDelta: { conflicts: 0, casualties: 0, displaced: 0 },
  hotspots: [],
  news: [],
  actors: [],
  source: 'empty',
};


export async function getConflictData(): Promise<ConflictPayload> {
  // Read the persistent journal in Supabase, populated daily by the Claude
  // Routine. If unconfigured or empty, return EMPTY_PAYLOAD — the page
  // renders an explicit empty state instead of synthetic data.
  try {
    const { readConflictData, isConflictStoreConfigured } = await import('./conflict-store');
    if (isConflictStoreConfigured()) {
      const stored = await readConflictData();
      if (stored) return { ...stored, source: 'live' };
    }
  } catch (err) {
    console.error('getConflictData: Supabase read failed:', err);
  }
  return EMPTY_PAYLOAD;
}
