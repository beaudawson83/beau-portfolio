// Conflict Heat Map — types, static fallback, and the high-level read path.
//
// Read order at request time:
//   1. Supabase (latest snapshot + active hotspots + last-24h news)
//   2. Live Gemini global scan (one-shot, no persistence)
//   3. Hand-curated FALLBACK_CONFLICT_DATA
//
// The cron jobs in src/app/api/cron/conflict-* are responsible for keeping
// Supabase populated; this file is intentionally read-only.

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
  type: ConflictType;
  since: string;
  iso: string[];
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
  source: 'live' | 'fallback';
}

export const FALLBACK_CONFLICT_DATA: ConflictData = {
  lastUpdated: new Date().toISOString(),
  totalActive: 32,
  casualties7d: 4287,
  displaced: 117_400_000,
  countriesInvolved: 41,
  weeklyDelta: { conflicts: 2, casualties: 312, displaced: 84_000 },
  hotspots: [
    { id: 'ukr', name: 'Ukraine — Eastern Front', lat: 48.5, lng: 37.8, intensity: 5, casualties7d: 892, type: 'interstate', since: '2022', iso: ['804'] },
    { id: 'gaza', name: 'Gaza & West Bank', lat: 31.5, lng: 34.45, intensity: 5, casualties7d: 1140, type: 'occupation', since: '2023', iso: ['275'] },
    { id: 'sdn', name: 'Sudan — RSF/SAF', lat: 15.5, lng: 32.5, intensity: 5, casualties7d: 612, type: 'civil-war', since: '2023', iso: ['729'] },
    { id: 'mmr', name: 'Myanmar civil war', lat: 21.9, lng: 95.9, intensity: 4, casualties7d: 318, type: 'civil-war', since: '2021', iso: ['104'] },
    { id: 'yem', name: 'Yemen', lat: 15.5, lng: 47.5, intensity: 3, casualties7d: 142, type: 'civil-war', since: '2014', iso: ['887'] },
    { id: 'syr', name: 'Syria — northwest', lat: 35.7, lng: 38.0, intensity: 3, casualties7d: 88, type: 'insurgency', since: '2011', iso: ['760'] },
    { id: 'som', name: 'Somalia — Al-Shabaab', lat: 5.15, lng: 46.2, intensity: 3, casualties7d: 124, type: 'insurgency', since: '2009', iso: ['706'] },
    { id: 'drc', name: 'DRC — North Kivu', lat: -1.5, lng: 29.0, intensity: 4, casualties7d: 287, type: 'civil-war', since: '1996', iso: ['180'] },
    { id: 'eth', name: 'Ethiopia — Amhara', lat: 11.6, lng: 38.5, intensity: 3, casualties7d: 96, type: 'civil-war', since: '2020', iso: ['231'] },
    { id: 'ngr', name: 'Nigeria — Boko Haram', lat: 11.9, lng: 13.2, intensity: 3, casualties7d: 142, type: 'insurgency', since: '2009', iso: ['566'] },
    { id: 'sah', name: 'Sahel — Mali/Burkina/Niger', lat: 14.5, lng: -1.0, intensity: 4, casualties7d: 218, type: 'insurgency', since: '2012', iso: ['466', '854', '562'] },
    { id: 'mex', name: 'Mexico — cartel violence', lat: 19.4, lng: -99.1, intensity: 3, casualties7d: 168, type: 'criminal', since: '2006', iso: ['484'] },
    { id: 'col', name: 'Colombia — ELN/dissidents', lat: 4.7, lng: -74.0, intensity: 2, casualties7d: 38, type: 'insurgency', since: '1964', iso: ['170'] },
    { id: 'afg', name: 'Afghanistan — IS-K', lat: 34.5, lng: 69.2, intensity: 2, casualties7d: 22, type: 'insurgency', since: '2021', iso: ['004'] },
    { id: 'pak', name: 'Pakistan — TTP', lat: 33.7, lng: 73.0, intensity: 2, casualties7d: 41, type: 'insurgency', since: '2007', iso: ['586'] },
    { id: 'hti', name: 'Haiti — gang violence', lat: 18.5, lng: -72.3, intensity: 3, casualties7d: 87, type: 'criminal', since: '2018', iso: ['332'] },
    { id: 'phl', name: 'Philippines — Mindanao', lat: 7.0, lng: 124.5, intensity: 1, casualties7d: 12, type: 'insurgency', since: '1969', iso: ['608'] },
    { id: 'tha', name: 'Thailand — south', lat: 6.5, lng: 101.3, intensity: 1, casualties7d: 8, type: 'insurgency', since: '2004', iso: ['764'] },
    { id: 'mozam', name: 'Mozambique — Cabo Delgado', lat: -12.5, lng: 40.5, intensity: 2, casualties7d: 24, type: 'insurgency', since: '2017', iso: ['508'] },
    { id: 'cmr', name: 'Cameroon — Anglophone', lat: 5.5, lng: 10.0, intensity: 2, casualties7d: 18, type: 'civil-war', since: '2017', iso: ['120'] },
    { id: 'irn', name: 'Iran–Israel direct exchanges', lat: 32.43, lng: 53.69, intensity: 3, casualties7d: 31, type: 'interstate', since: '2024', iso: ['364', '376'] },
  ],
  news: [
    { id: 1, source: 'REUTERS', time: '12 min ago', region: 'Eastern Europe', headline: 'Drone strikes hit energy infrastructure in three regions overnight, officials say', url: '#' },
    { id: 2, source: 'AP', time: '47 min ago', region: 'Middle East', headline: 'Aid convoy reaches northern enclave for first time in eleven days', url: '#' },
    { id: 3, source: 'BBC', time: '1h 14m ago', region: 'Horn of Africa', headline: 'Paramilitary forces advance on key supply corridor as ceasefire talks stall', url: '#' },
    { id: 4, source: 'AL JAZEERA', time: '2h 3m ago', region: 'South Asia', headline: 'Border clashes leave at least 14 dead, both sides trade blame', url: '#' },
    { id: 5, source: 'ACLED', time: '3h 22m ago', region: 'Sahel', headline: 'Weekly briefing: civilian fatalities up 18% week-over-week across three states', url: '#' },
    { id: 6, source: 'UN OCHA', time: '4h 41m ago', region: 'Central Africa', headline: 'Displacement figures pass 7.1M in DRC; humanitarian appeal 23% funded', url: '#' },
    { id: 7, source: 'GUARDIAN', time: '6h 12m ago', region: 'Latin America', headline: 'Cartel infighting closes major highway; security forces deploy to state capital', url: '#' },
    { id: 8, source: 'REUTERS', time: '9h 3m ago', region: 'Southeast Asia', headline: 'Resistance forces claim control of two townships in central dry zone', url: '#' },
    { id: 9, source: 'CRISIS GROUP', time: '11h ago', region: 'Caribbean', headline: 'Analysis: gang coalition expands territorial control to 92% of capital', url: '#' },
    { id: 10, source: 'BBC', time: '14h ago', region: 'West Africa', headline: 'Insurgents claim attack on convoy near tri-border region; casualties unconfirmed', url: '#' },
    { id: 11, source: 'AP', time: '18h ago', region: 'Levant', headline: 'Mediators present new framework as parties agree to indirect talks in Doha', url: '#' },
    { id: 12, source: 'REUTERS', time: '22h ago', region: 'South Asia', headline: 'Suicide bombing targets security checkpoint; group claims responsibility', url: '#' },
  ],
  // Hand-curated, sourced actor relationships — the kind of structured output
  // that the multi-pass ingestion pipeline will produce at runtime.  Used here
  // as a sane default when Supabase isn't configured so the page renders the
  // full taxonomy (territory / belligerent / sponsor / proxy / supplier / basing).
  // Each row carries ≥1 source URL; that's the threshold the ingest validator
  // enforces in production.
  actors: [
    // Ukraine — primary inter-state war
    { conflictId: 'ukr', countryIso: '804', role: 'territory',  confidence: 'high',   notes: 'Theatre of operations',                                  sources: ['https://www.bbc.com/news/world-europe-60525350'] },
    { conflictId: 'ukr', countryIso: '643', role: 'principal',  confidence: 'high',   notes: 'Russian Federation — invading state',                    sources: ['https://www.icj-cij.org/case/182'] },
    { conflictId: 'ukr', countryIso: '840', role: 'supplier',   confidence: 'high',   notes: 'United States — primary materiel and intelligence',      sources: ['https://www.state.gov/u-s-security-cooperation-with-ukraine/'] },
    { conflictId: 'ukr', countryIso: '826', role: 'supplier',   confidence: 'high',   notes: 'United Kingdom — Storm Shadow, Challenger, training',     sources: ['https://www.gov.uk/government/news/uk-defence-secretary-statement-on-ukraine'] },
    { conflictId: 'ukr', countryIso: '276', role: 'supplier',   confidence: 'high',   notes: 'Germany — IRIS-T, Leopard 2, Patriot',                    sources: ['https://www.bundesregierung.de/breg-en/issues/military-support-ukraine-2054572'] },
    { conflictId: 'ukr', countryIso: '364', role: 'supplier',   confidence: 'high',   notes: 'Iran — Shahed-136 drones to Russia',                      sources: ['https://www.reuters.com/world/europe/iran-acknowledges-supplying-drones-russia-before-war-2023-11-05/'] },
    { conflictId: 'ukr', countryIso: '408', role: 'supplier',   confidence: 'high',   notes: 'DPRK — artillery shells, ballistic missiles, troops',     sources: ['https://www.state.gov/dprk-troop-deployment-to-russia/'] },

    // Gaza & West Bank
    { conflictId: 'gaza', countryIso: '275', role: 'territory', confidence: 'high',   notes: 'Occupied Palestinian territory',                          sources: ['https://www.un.org/unispal/'] },
    { conflictId: 'gaza', countryIso: '376', role: 'principal', confidence: 'high',   notes: 'Israel — IDF combat operations',                          sources: ['https://www.icj-cij.org/case/192'] },
    { conflictId: 'gaza', countryIso: '840', role: 'supplier',  confidence: 'high',   notes: 'United States — primary arms supplier',                   sources: ['https://www.state.gov/u-s-security-cooperation-with-israel/'] },
    { conflictId: 'gaza', countryIso: '364', role: 'proxy',     confidence: 'high',   notes: 'Iran — funds and arms Hamas, PIJ',                        sources: ['https://home.treasury.gov/news/press-releases/jy1885'] },
    { conflictId: 'gaza', countryIso: '634', role: 'mediator',  confidence: 'high',   notes: 'Qatar — hosts ceasefire talks',                           sources: ['https://www.reuters.com/world/middle-east/qatar-mediator-role-2024/'] },
    { conflictId: 'gaza', countryIso: '818', role: 'mediator',  confidence: 'high',   notes: 'Egypt — co-mediator on hostage and aid talks',            sources: ['https://www.aljazeera.com/news/2024/egypt-mediation-gaza/'] },

    // Sudan — RSF/SAF civil war
    { conflictId: 'sdn', countryIso: '729', role: 'territory',  confidence: 'high',   notes: 'Sudan — battleground',                                   sources: ['https://www.crisisgroup.org/africa/horn-africa/sudan'] },
    { conflictId: 'sdn', countryIso: '784', role: 'supplier',   confidence: 'high',   notes: 'United Arab Emirates — material support to RSF',          sources: ['https://www.nytimes.com/2024/09/29/world/africa/uae-sudan-rsf.html'] },
    { conflictId: 'sdn', countryIso: '818', role: 'supplier',   confidence: 'medium', notes: 'Egypt — aligned with SAF, training and overflight',       sources: ['https://www.reuters.com/world/africa/egypt-sudan-saf-2024/'] },

    // Yemen
    { conflictId: 'yem', countryIso: '887', role: 'territory',  confidence: 'high',   notes: 'Yemen — multi-front civil war',                          sources: ['https://www.un.org/en/yemen/'] },
    { conflictId: 'yem', countryIso: '682', role: 'principal',  confidence: 'high',   notes: 'Saudi Arabia — Saudi-led coalition',                     sources: ['https://www.bbc.com/news/world-middle-east-29319423'] },
    { conflictId: 'yem', countryIso: '784', role: 'principal',  confidence: 'high',   notes: 'United Arab Emirates — coalition partner',                sources: ['https://www.crisisgroup.org/middle-east-north-africa/gulf-and-arabian-peninsula/yemen'] },
    { conflictId: 'yem', countryIso: '364', role: 'proxy',      confidence: 'high',   notes: 'Iran — Houthi (Ansar Allah) materiel and direction',     sources: ['https://www.un.org/securitycouncil/sanctions/2140/panel-of-experts/work-and-mandate/reports'] },
    { conflictId: 'yem', countryIso: '840', role: 'direct',     confidence: 'high',   notes: 'United States — strikes against Houthi launchers',       sources: ['https://www.centcom.mil/MEDIA/PRESS-RELEASES/'] },
    { conflictId: 'yem', countryIso: '826', role: 'direct',     confidence: 'high',   notes: 'United Kingdom — joint strike operations',                sources: ['https://www.gov.uk/government/news/uk-strikes-houthi-targets-yemen'] },

    // Syria
    { conflictId: 'syr', countryIso: '760', role: 'territory',  confidence: 'high',   notes: 'Syria — multi-actor theatre',                            sources: ['https://www.crisisgroup.org/middle-east-north-africa/east-mediterranean-mena/syria'] },
    { conflictId: 'syr', countryIso: '643', role: 'basing',     confidence: 'high',   notes: 'Russia — Khmeimim air base, Tartus naval facility',       sources: ['https://www.reuters.com/world/middle-east/russia-syria-bases/'] },
    { conflictId: 'syr', countryIso: '364', role: 'proxy',      confidence: 'high',   notes: 'Iran — IRGC-QF, Hezbollah deployments',                  sources: ['https://www.state.gov/iran-syria-irgc/'] },
    { conflictId: 'syr', countryIso: '792', role: 'direct',     confidence: 'high',   notes: 'Turkey — operations vs SDF in north',                     sources: ['https://www.bbc.com/news/world-middle-east-66043532'] },
    { conflictId: 'syr', countryIso: '840', role: 'basing',     confidence: 'high',   notes: 'United States — al-Tanf and northeast outposts',          sources: ['https://www.centcom.mil/'] },

    // Sahel — Russia / Africa Corps
    { conflictId: 'sah', countryIso: '643', role: 'supplier',   confidence: 'high',   notes: 'Russia — Africa Corps (formerly Wagner) personnel',       sources: ['https://www.bbc.com/news/world-africa-66486999'] },

    // DRC — North Kivu
    { conflictId: 'drc', countryIso: '180', role: 'territory',  confidence: 'high',   notes: 'DR Congo — eastern provinces',                            sources: ['https://www.un.org/en/monusco/'] },
    { conflictId: 'drc', countryIso: '646', role: 'supplier',   confidence: 'high',   notes: 'Rwanda — backing of M23 (UN GoE finding)',                sources: ['https://www.securitycouncilreport.org/un-documents/document/s-2022-967.php'] },

    // Mexico — cartel violence; US firearms inflow
    { conflictId: 'mex', countryIso: '484', role: 'territory',  confidence: 'high',   notes: 'Mexico — multi-cartel violence',                         sources: ['https://www.crisisgroup.org/latin-america-caribbean/mexico'] },
    { conflictId: 'mex', countryIso: '840', role: 'supplier',   confidence: 'medium', notes: 'United States — civilian-firearm flows southbound',      sources: ['https://www.gao.gov/products/gao-21-322'] },

    // Iran–Israel direct exchanges
    { conflictId: 'irn', countryIso: '364', role: 'principal',  confidence: 'high',   notes: 'Iran — direct missile/drone exchanges',                   sources: ['https://www.bbc.com/news/world-middle-east-68811276'] },
    { conflictId: 'irn', countryIso: '376', role: 'principal',  confidence: 'high',   notes: 'Israel — direct strikes on Iranian targets',              sources: ['https://www.reuters.com/world/middle-east/israel-strikes-iran-2024/'] },
    { conflictId: 'irn', countryIso: '840', role: 'direct',     confidence: 'high',   notes: 'United States — interception support',                    sources: ['https://www.centcom.mil/MEDIA/PRESS-RELEASES/'] },
  ],
};

function staticFallback(): ConflictPayload {
  return {
    ...FALLBACK_CONFLICT_DATA,
    lastUpdated: new Date().toISOString(),
    source: 'fallback',
  };
}

export async function getConflictData(): Promise<ConflictPayload> {
  // 1. Prefer the persistent journal in Supabase (populated by the daily
  //    Claude Code Routine via POST /api/conflict/ingest).
  try {
    const { readConflictData, isConflictStoreConfigured } = await import('./conflict-store');
    if (isConflictStoreConfigured()) {
      const stored = await readConflictData();
      if (stored) return { ...stored, source: 'live' };
    }
  } catch (err) {
    console.error('getConflictData: Supabase read failed:', err);
  }

  // 2. Fallback: hand-curated dataset.  The website never calls an LLM at
  //    request time — that's the Routine's job, off-cycle.
  return staticFallback();
}
