// Conflict Heat Map — Gemini-powered ingestion.
// Two scans are exposed:
//   globalScan()         — discovers active conflicts + fresh stats + recent headlines
//   perConflictScan(h)   — deep search for one conflict, returns 10-20 stories with dates
//
// Both call Gemini 2.0 Flash with the google_search grounding tool.
// Validation is shape-only; semantic accuracy is the LLM's job.

import type {
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
