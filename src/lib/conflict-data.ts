// Conflict Heat Map — types, static fallback, and live-data fetcher (Gemini + Google Search).

export type ConflictType =
  | 'interstate'
  | 'civil-war'
  | 'occupation'
  | 'insurgency'
  | 'criminal';

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
};

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are an autonomous research agent producing a JSON briefing on the
state of global armed conflict. Use Google Search to find current, sourced
information from reputable outlets (Reuters, AP, BBC, Al Jazeera, Guardian,
ACLED, UCDP, UN OCHA, Crisis Group). Today's date is ${today}.

Return ONE JSON object — and nothing else — wrapped in a fenced \`\`\`json code block.

Schema (all keys required):

{
  "lastUpdated": "<ISO 8601 timestamp, now>",
  "totalActive": <number — count of currently active armed conflicts globally>,
  "casualties7d": <number — reported fatalities across all conflicts in the last 7 days>,
  "displaced": <number — total forcibly displaced persons globally, cumulative>,
  "countriesInvolved": <number — countries involved as principal or proxy>,
  "weeklyDelta": {
    "conflicts": <signed integer — change in active conflicts vs previous week>,
    "casualties": <signed integer — change in 7d casualties vs prior 7d>,
    "displaced": <signed integer — change in displacement this week>
  },
  "hotspots": [
    {
      "id": "<short slug, e.g. 'ukr', 'gaza'>",
      "name": "<short label, e.g. 'Ukraine — Eastern Front'>",
      "lat": <decimal latitude>,
      "lng": <decimal longitude>,
      "intensity": <1|2|3|4|5 — 5 = severe>,
      "casualties7d": <reported fatalities last 7 days>,
      "type": "<one of: interstate | civil-war | occupation | insurgency | criminal>",
      "since": "<year conflict began, e.g. '2022'>",
      "iso": ["<ISO 3166-1 numeric country code(s) as strings, e.g. '804'>"]
    }
  ],
  "news": [
    {
      "id": <integer>,
      "source": "<UPPERCASE source name>",
      "time": "<relative time, e.g. '12 min ago' | '2h 14m ago' | '14h ago'>",
      "region": "<short region label>",
      "headline": "<one sentence>",
      "url": "<full URL to the article, https://...>"
    }
  ]
}

Constraints:
- Provide 15-25 hotspots covering all currently active armed conflicts.
- Provide 10-15 news items, all from the last 24 hours, ordered most recent first.
- Casualty figures are reported lower bounds — use the most recent published figures.
- ISO numeric codes: e.g. Ukraine '804', Russia '643', Israel '376', Palestine
  '275', Sudan '729', Myanmar '104', DRC '180', Mali '466', Burkina Faso '854',
  Niger '562', Nigeria '566', Mexico '484', Colombia '170', Haiti '332'.
- Output JSON only. No prose outside the fenced code block.`;
}

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
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(candidate.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

function isValidConflictData(d: unknown): d is ConflictData {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return (
    typeof o.lastUpdated === 'string' &&
    typeof o.totalActive === 'number' &&
    typeof o.casualties7d === 'number' &&
    typeof o.displaced === 'number' &&
    typeof o.countriesInvolved === 'number' &&
    typeof o.weeklyDelta === 'object' && o.weeklyDelta !== null &&
    Array.isArray(o.hotspots) && o.hotspots.length > 0 &&
    Array.isArray(o.news)
  );
}

export async function getConflictData(): Promise<ConflictPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return { ...FALLBACK_CONFLICT_DATA, lastUpdated: new Date().toISOString(), source: 'fallback' };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt() }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 8192,
        },
      }),
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.error('Gemini conflict-data error:', res.status);
      return { ...FALLBACK_CONFLICT_DATA, lastUpdated: new Date().toISOString(), source: 'fallback' };
    }

    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const parsed = extractJson(text);
    if (!isValidConflictData(parsed)) {
      console.error('Gemini conflict-data: invalid shape');
      return { ...FALLBACK_CONFLICT_DATA, lastUpdated: new Date().toISOString(), source: 'fallback' };
    }

    return { ...parsed, source: 'live' };
  } catch (err) {
    console.error('Gemini conflict-data fetch failed:', err);
    return { ...FALLBACK_CONFLICT_DATA, lastUpdated: new Date().toISOString(), source: 'fallback' };
  }
}
