// Conflict Heat Map — Gemini-powered ingestion.
// Two scans are exposed:
//   globalScan()         — discovers active conflicts + fresh stats + recent headlines
//   perConflictScan(h)   — deep search for one conflict, returns 10-20 stories with dates
//
// Both call Gemini 2.0 Flash with the google_search grounding tool.
// Validation is shape-only; semantic accuracy is the LLM's job.

import type {
  ActorConfidence,
  ActorRole,
  ConflictActor,
  ConflictData,
  ConflictHotspot,
  ConflictNewsItem,
} from './conflict-data';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function extractJson(text: string): unknown | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      // Try array form
      const fa = candidate.indexOf('[');
      const la = candidate.lastIndexOf(']');
      if (fa === -1 || la === -1 || la <= fa) return null;
      try {
        return JSON.parse(candidate.slice(fa, la + 1));
      } catch {
        return null;
      }
    }
    try {
      return JSON.parse(candidate.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

async function callGemini(prompt: string, maxTokens = 8192): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: maxTokens,
        },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Gemini error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const json = (await res.json()) as GeminiResponse;
    return (
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? null
    );
  } catch (err) {
    console.error('Gemini fetch failed:', err);
    return null;
  }
}

// ===========================================================================
// GLOBAL SCAN
// ===========================================================================

function buildGlobalPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are an autonomous research agent producing a JSON briefing on the
state of global armed conflict. Use Google Search to find current, sourced
information from reputable outlets (Reuters, AP, BBC, Al Jazeera, Guardian,
ACLED, UCDP, UN OCHA, Crisis Group). Today's date is ${today}.

Return ONE JSON object — and nothing else — wrapped in a fenced \`\`\`json code block.

Schema (all keys required):
{
  "lastUpdated": "<ISO 8601 timestamp, now>",
  "totalActive": <number>,
  "casualties7d": <number>,
  "displaced": <number>,
  "countriesInvolved": <number>,
  "weeklyDelta": { "conflicts": <int>, "casualties": <int>, "displaced": <int> },
  "hotspots": [
    {
      "id": "<short slug, e.g. 'ukr', 'gaza'>",
      "name": "<short label>",
      "lat": <decimal>, "lng": <decimal>,
      "intensity": <1|2|3|4|5>,
      "casualties7d": <int>,
      "type": "<interstate|civil-war|occupation|insurgency|criminal>",
      "since": "<year>",
      "iso": ["<ISO 3166-1 numeric, e.g. '804'>"]
    }
  ],
  "news": [
    {
      "id": <int>,
      "source": "<UPPERCASE>",
      "time": "<relative, e.g. '12 min ago'>",
      "region": "<short label>",
      "headline": "<one sentence>",
      "url": "<full https URL>",
      "publishedAt": "<ISO 8601 if known, else null>",
      "conflictId": "<matching hotspot id or null>"
    }
  ]
}

Constraints:
- Provide 15-25 hotspots covering ALL currently active armed conflicts. Be exhaustive.
- Provide 10-15 news items from the last 24 hours, ordered most recent first.
- Each news item MUST include "publishedAt" (ISO 8601) when known and "conflictId"
  matching one of the hotspot ids when the story is about that conflict.
- ISO numeric codes: Ukraine '804', Russia '643', Israel '376', Palestine '275',
  Sudan '729', Myanmar '104', DRC '180', Mali '466', Burkina Faso '854',
  Niger '562', Nigeria '566', Mexico '484', Colombia '170', Haiti '332'.
- Output JSON only.`;
}

interface GlobalScanItem extends ConflictNewsItem {
  publishedAt?: string | null;
  conflictId?: string | null;
}

export interface GlobalScanResult extends Omit<ConflictData, 'news'> {
  news: GlobalScanItem[];
}

function isValidGlobalScan(d: unknown): d is GlobalScanResult {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return (
    typeof o.totalActive === 'number' &&
    typeof o.casualties7d === 'number' &&
    typeof o.displaced === 'number' &&
    typeof o.countriesInvolved === 'number' &&
    typeof o.weeklyDelta === 'object' && o.weeklyDelta !== null &&
    Array.isArray(o.hotspots) && o.hotspots.length > 0 &&
    Array.isArray(o.news)
  );
}

export async function globalScan(): Promise<GlobalScanResult | null> {
  const text = await callGemini(buildGlobalPrompt());
  if (!text) return null;
  const parsed = extractJson(text);
  if (!isValidGlobalScan(parsed)) {
    console.error('globalScan: invalid shape');
    return null;
  }
  return parsed;
}

// ===========================================================================
// PER-CONFLICT SCAN
// ===========================================================================

function buildConflictPrompt(h: ConflictHotspot): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are a research agent compiling a news timeline for a single
ongoing armed conflict. Use Google Search to find recent reporting from
reputable outlets (Reuters, AP, BBC, Al Jazeera, Guardian, ACLED, UCDP,
UN OCHA, Crisis Group). Today's date is ${today}.

Conflict in scope:
  id:    "${h.id}"
  name:  "${h.name}"
  region: lat ${h.lat}, lng ${h.lng}
  type:  "${h.type}"
  since: ${h.since}

Return ONE JSON ARRAY — and nothing else — wrapped in a fenced \`\`\`json code block.
Each element is one news item:

[
  {
    "source": "<UPPERCASE outlet name, e.g. REUTERS>",
    "headline": "<one-sentence headline>",
    "url": "<full https URL of the article>",
    "region": "<short region label>",
    "publishedAt": "<ISO 8601 timestamp; estimate as best you can>"
  }
]

Constraints:
- Return 10-20 items, ordered most recent first.
- Each URL MUST be a real, full https URL to a published article. No placeholders.
- Skip items you cannot verify with a real URL.
- Output JSON only — no prose outside the fenced code block.`;
}

export interface ScannedNewsItem {
  source: string;
  headline: string;
  url: string;
  region?: string | null;
  publishedAt?: string | null;
}

function isValidScannedArray(d: unknown): d is ScannedNewsItem[] {
  if (!Array.isArray(d)) return false;
  return d.every(
    (i) =>
      i &&
      typeof i === 'object' &&
      typeof (i as Record<string, unknown>).source === 'string' &&
      typeof (i as Record<string, unknown>).headline === 'string' &&
      typeof (i as Record<string, unknown>).url === 'string' &&
      /^https?:\/\//.test((i as Record<string, string>).url),
  );
}

export async function perConflictScan(h: ConflictHotspot): Promise<ScannedNewsItem[]> {
  const text = await callGemini(buildConflictPrompt(h), 4096);
  if (!text) return [];
  const parsed = extractJson(text);
  if (!isValidScannedArray(parsed)) {
    console.error(`perConflictScan(${h.id}): invalid shape`);
    return [];
  }
  // Final safety: drop dupes by URL within this batch.
  const seen = new Set<string>();
  return parsed.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
}

// ===========================================================================
// PASS 2 — BELLIGERENTS
// ===========================================================================
//
// Reads the Pass-1 hotspot list and labels every state party at combat tier:
// territory, principal, direct (cross-border kinetic ops), basing.
// May also emit NEW hotspots for great-power direct ops not yet captured.

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

const SOURCE_DOMAIN_HINTS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'aljazeera.com', 'theguardian.com',
  'nytimes.com', 'ft.com', 'wsj.com', 'washingtonpost.com', 'economist.com',
  'crisisgroup.org', 'acleddata.com', 'ucdp.uu.se', 'understandingwar.org',
  'rusi.org', 'iiss.org', 'sipri.org', 'icct.nl', 'cfr.org', 'csis.org',
  'un.org', 'unhcr.org', 'unocha.org', 'icj-cij.org', 'icc-cpi.int',
  'state.gov', 'treasury.gov', 'defense.gov', 'centcom.mil',
  'gov.uk', 'bundesregierung.de', 'europa.eu', 'consilium.europa.eu',
  'natural.gc.ca', // covers Canada; rare but valid
];

function isPlausibleSource(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Pass-3 strict mode is enforced by also requiring host match a hint set.
    // Pass-2 (this function) allows any well-formed https URL — territory and
    // principal claims are usually trivially sourceable.
    void SOURCE_DOMAIN_HINTS;
    return host.includes('.');
  } catch {
    return false;
  }
}

function isReputableSource(url: string): boolean {
  if (!isPlausibleSource(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOURCE_DOMAIN_HINTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function normalizeIso(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const s = String(raw).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  return String(parseInt(s, 10)); // drops leading zeros consistently
}

function coerceActor(
  raw: unknown,
  knownConflictIds: Set<string>,
  sourceCheck: (url: string) => boolean,
): ConflictActor | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const conflictId = typeof r.conflictId === 'string' ? r.conflictId.trim() : '';
  if (!conflictId || !knownConflictIds.has(conflictId)) return null;

  const countryIso = normalizeIso(r.countryIso);
  if (!countryIso) return null;

  const role = typeof r.role === 'string' ? (r.role as ActorRole) : null;
  if (!role || !VALID_ROLES.has(role)) return null;

  const confidence: ActorConfidence =
    typeof r.confidence === 'string' && VALID_CONFIDENCE.has(r.confidence as ActorConfidence)
      ? (r.confidence as ActorConfidence)
      : 'medium';

  const sources = Array.isArray(r.sources)
    ? (r.sources as unknown[])
        .filter((s): s is string => typeof s === 'string' && sourceCheck(s))
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

function buildBelligerentsPrompt(hotspots: ConflictHotspot[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const summary = hotspots
    .map((h) => `  - ${h.id}: "${h.name}" (territory ISO ${h.iso.join(',')})`)
    .join('\n');
  return `You are a research agent labeling state actors at combat tier in
ongoing armed conflicts. Today is ${today}.

Existing hotspots:
${summary}

Your task: emit one row per (conflict, country) pair where the country
plays a role at COMBAT TIER. Roles in scope for this pass:

  - territory : the country whose soil is the battleground
  - principal : a state that is a primary party to the violence
                (e.g. Russia in Ukraine, Israel in Gaza, Saudi in Yemen)
  - direct    : a state conducting strikes, special ops, or interception
                operations in connection with this conflict on someone
                else's soil (e.g. US/UK strikes vs Houthi launchers)
  - basing    : a state operating combat-capable forces from facilities
                in the theatre (e.g. Russia at Khmeimim/Tartus, US in
                al-Tanf, Manda Bay, etc.)

Also emit ADDITIONAL hotspots for any great-power direct combat operations
not yet on the list (e.g. recurring US strikes in Somalia, Russia's Africa
Corps kinetic ops, recent India-Pakistan exchanges, etc.). Use a short
slug for the id, ISO 3166-1 numeric for affected territories.

Use Google Search to find sources. Each actor row MUST include a
"sources" array with at least one full https URL from a reputable
outlet, government statement, ICJ/ICC filing, UN report, or recognized
think-tank publication. Drop any actor you cannot source.

Return ONE JSON object — and nothing else — wrapped in \`\`\`json fence.

{
  "actors": [
    {
      "conflictId": "<existing or new hotspot id>",
      "countryIso": "<ISO 3166-1 numeric, e.g. '643', '840'>",
      "role": "territory|principal|direct|basing",
      "confidence": "high|medium|low",
      "notes": "<one-sentence relationship>",
      "sources": ["https://...", "..."]
    }
  ],
  "newHotspots": [
    {
      "id": "<short slug>",
      "name": "<short label>",
      "lat": <decimal>, "lng": <decimal>,
      "intensity": <1|2|3|4|5>,
      "casualties7d": <int>,
      "type": "<interstate|civil-war|occupation|insurgency|criminal>",
      "since": "<year>",
      "iso": ["<ISO numeric of affected territories>"]
    }
  ]
}

Output JSON only.`;
}

export interface BelligerentsScanResult {
  actors: ConflictActor[];
  newHotspots: ConflictHotspot[];
}

function isValidHotspot(raw: unknown): raw is ConflictHotspot {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.lat === 'number' &&
    typeof r.lng === 'number' &&
    typeof r.intensity === 'number' &&
    typeof r.casualties7d === 'number' &&
    typeof r.type === 'string' &&
    typeof r.since === 'string' &&
    Array.isArray(r.iso)
  );
}

export async function belligerentsScan(
  hotspots: ConflictHotspot[],
): Promise<BelligerentsScanResult> {
  if (hotspots.length === 0) return { actors: [], newHotspots: [] };

  const text = await callGemini(buildBelligerentsPrompt(hotspots), 8192);
  if (!text) return { actors: [], newHotspots: [] };

  const parsed = extractJson(text) as Record<string, unknown> | null;
  if (!parsed) return { actors: [], newHotspots: [] };

  const newHotspotsRaw = Array.isArray(parsed.newHotspots) ? parsed.newHotspots : [];
  const newHotspots = newHotspotsRaw.filter(isValidHotspot) as ConflictHotspot[];

  const known = new Set([...hotspots.map((h) => h.id), ...newHotspots.map((h) => h.id)]);
  const actorsRaw = Array.isArray(parsed.actors) ? parsed.actors : [];
  const actors = actorsRaw
    .map((a) => coerceActor(a, known, isPlausibleSource))
    .filter((a): a is ConflictActor => a !== null)
    // Pass 2 owns these four roles only.
    .filter((a) => a.role === 'territory' || a.role === 'principal' || a.role === 'direct' || a.role === 'basing');

  return { actors, newHotspots };
}

// ===========================================================================
// PASS 3 — SPONSORS / SUPPLIERS / PROXIES (DOCUMENTED ONLY)
// ===========================================================================

function buildProxyPrompt(
  hotspots: ConflictHotspot[],
  priorActors: ConflictActor[],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const summary = hotspots
    .map((h) => `  - ${h.id}: "${h.name}"`)
    .join('\n');
  const priorByConflict = new Map<string, string[]>();
  for (const a of priorActors) {
    const key = a.conflictId;
    if (!priorByConflict.has(key)) priorByConflict.set(key, []);
    priorByConflict.get(key)!.push(`${a.countryIso}/${a.role}`);
  }
  const priorSummary = Array.from(priorByConflict.entries())
    .map(([id, items]) => `  - ${id}: ${items.join(', ')}`)
    .join('\n');

  return `You are a research agent identifying EXTERNAL state actors providing
material support to ongoing armed conflicts. Today is ${today}.

Hotspots:
${summary}

Combat-tier actors already identified (do not duplicate these):
${priorSummary || '  (none)'}

Roles in scope for THIS pass only:

  - sponsor  : state providing political backing, financial assistance,
               or diplomatic cover to a party
  - supplier : state providing arms, ammunition, or dual-use equipment
               (production, training, intel sharing)
  - proxy    : state operationally directing a non-state actor that is
               party to the conflict (e.g. Iran↔Hezbollah, Iran↔Houthis,
               Russia↔Africa Corps kinetic ops in Mali / CAR, etc.)

THRESHOLD — STRICT. Include ONLY documented relationships. A relationship
is documented if it is:
  - reported by Reuters, AP, BBC, Al Jazeera, Guardian, NYT, FT, WSJ,
    Washington Post, Economist
  - named in a US Treasury / OFAC sanctions designation, EU sanctions
    list, UK HMT designation, or equivalent
  - identified in a UN Panel of Experts report, OHCHR, or UNHCR report
  - established by ICJ filings, ICC indictments, or UN Security Council
    resolutions
  - documented by a recognized institution (Crisis Group, ACLED, UCDP,
    SIPRI, ISW, RUSI, IISS, CSIS, CFR)

Do NOT include:
  - "widely suspected" or "alleged but unconfirmed" relationships
  - analyst speculation without a citation
  - historical relationships no longer active

Use Google Search. For each actor row, "sources" MUST contain at least
one full https URL pointing to such documentation, hosted on the domain
of one of the above outlets/institutions. Drop any actor you cannot
source from a reputable host.

Return ONE JSON object wrapped in \`\`\`json fence:

{
  "actors": [
    {
      "conflictId": "<hotspot id>",
      "countryIso": "<ISO 3166-1 numeric>",
      "role": "sponsor|supplier|proxy",
      "confidence": "high|medium|low",
      "notes": "<one-sentence specific relationship>",
      "sources": ["https://...", "..."]
    }
  ]
}

Output JSON only.`;
}

export async function proxyScan(
  hotspots: ConflictHotspot[],
  priorActors: ConflictActor[],
): Promise<ConflictActor[]> {
  if (hotspots.length === 0) return [];

  const text = await callGemini(buildProxyPrompt(hotspots, priorActors), 8192);
  if (!text) return [];

  const parsed = extractJson(text) as Record<string, unknown> | null;
  if (!parsed) return [];
  const raw = Array.isArray(parsed.actors) ? parsed.actors : [];

  const known = new Set(hotspots.map((h) => h.id));
  return raw
    .map((a) => coerceActor(a, known, isReputableSource))
    .filter((a): a is ConflictActor => a !== null)
    .filter((a) => a.role === 'sponsor' || a.role === 'supplier' || a.role === 'proxy');
}
