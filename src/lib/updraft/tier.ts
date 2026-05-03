// UpDraft tier classifier.
//
// Pure deterministic logic per stage-01-intake.md §1.4. Maps three signals
// (years of relevant work, highest role level, peak direct reports) to one
// of four tier buckets that drive the depth of the interview in Stage 03.
//
// Path A (Upload): host program auto-computes signals from parsed resume.
// Path B (Talk): host asks the user the three questions deterministically.
// Either way, the user can override at any time via dropdown.
//
// No 'server-only' marker — pure functions, safe to run in client too so
// the Stage 01 UI can preview the auto-classification result before the
// user clicks Confirm.

import type { ParsedResume, UpdraftTier } from '@/types';

export type YearsBand = '0-2' | '3-7' | '8-15' | '15+';
export type RoleLevel = 'IC' | 'Team lead' | 'Manager' | 'Senior Manager' | 'VP/C-suite';
export type ReportsPeak = 'None' | '1-5' | '6-15' | '15+';

export interface TierClassifierInputs {
  years_band: YearsBand;
  role_level: RoleLevel;
  reports_peak: ReportsPeak;
}

// ---------------------------------------------------------------------------
// Pure mapping
// ---------------------------------------------------------------------------

const YEARS_FLOOR: Record<YearsBand, number> = {
  '0-2':  1,
  '3-7':  2,
  '8-15': 3,
  '15+':  4,
};

const ROLE_CEILING: Record<RoleLevel, number> = {
  IC:               2,    // never tier 3+ no matter how senior
  'Team lead':      3,    // cap at senior, not exec
  Manager:          3,
  'Senior Manager': 4,
  'VP/C-suite':     4,
};

const REPORTS_FLOOR: Record<ReportsPeak, number> = {
  None:   0,    // no floor — IC with 0 reports stays where years put them
  '1-5':  2,    // managed at all → at least Tier 2
  '6-15': 3,    // managed managers → at least Tier 3
  '15+':  3,
};

/**
 * Per spec: tier = max(min(yearsFloor, roleCeiling), reportsFloor).
 *
 * Edge cases:
 *   15-year IC, no reports        → years 4, ceiling 2 → Tier 2
 *   4-year manager, 12 reports    → years 2, ceiling 3, reports 3 → Tier 3
 *   6-year director, 8 reports    → years 2, ceiling 3, reports 3 → Tier 3
 *   20-year C-suite               → years 4, ceiling 4 → Tier 4
 */
export function classifyTier(
  yearsBand: YearsBand,
  roleLevel: RoleLevel,
  reportsPeak: ReportsPeak,
): UpdraftTier {
  const t = Math.max(
    Math.min(YEARS_FLOOR[yearsBand], ROLE_CEILING[roleLevel]),
    REPORTS_FLOOR[reportsPeak],
  );
  return Math.max(1, Math.min(4, t)) as UpdraftTier;
}

// ---------------------------------------------------------------------------
// Path A inference helpers — derive signals from parsed resume
// ---------------------------------------------------------------------------

function parseYearMonth(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return new Date(year, month - 1, 1);
}

/**
 * Sum durations across all experience entries. Doesn't yet subtract
 * overlaps for concurrent roles — the spec calls that out as the next
 * refinement; v0.1 over-counts slightly when someone has parallel roles.
 * "Present" is today.
 */
export function computeYearsExperience(experience: ParsedResume['experience']): number {
  const today = new Date();
  let totalMonths = 0;
  for (const e of experience) {
    const start = parseYearMonth(e.start_date);
    const end = e.end_date === 'Present' ? today : parseYearMonth(e.end_date);
    if (!start || !end) continue;
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (months > 0) totalMonths += months;
  }
  return Math.round((totalMonths / 12) * 10) / 10;
}

export function yearsToBand(years: number): YearsBand {
  if (years < 3) return '0-2';
  if (years < 8) return '3-7';
  if (years < 16) return '8-15';
  return '15+';
}

/**
 * Highest role level inferred across all experience titles. Higher levels
 * win — a "Director" entry beats an "IC" entry from earlier in the career.
 */
export function inferRoleLevel(experience: ParsedResume['experience']): RoleLevel {
  const HIERARCHY: RoleLevel[] = ['IC', 'Team lead', 'Manager', 'Senior Manager', 'VP/C-suite'];
  // Order matters — earlier patterns are checked first; a title matching
  // "Senior VP" should win at VP/C-suite, not match against "Senior Manager".
  const RANKED: { pattern: RegExp; level: RoleLevel }[] = [
    { pattern: /\b(C[EFITOMS]O|Chief|President|SVP|Senior Vice President|VP|Vice President)\b/i, level: 'VP/C-suite' },
    { pattern: /\b(Senior Director|Director|Head of|Senior Manager)\b/i, level: 'Senior Manager' },
    { pattern: /\b(Manager)\b/i, level: 'Manager' },
    { pattern: /\b(Tech Lead|Team Lead|Principal|Lead Engineer|Staff)\b/i, level: 'Team lead' },
  ];

  let highest: RoleLevel = 'IC';
  for (const e of experience) {
    for (const r of RANKED) {
      if (r.pattern.test(e.title)) {
        if (HIERARCHY.indexOf(r.level) > HIERARCHY.indexOf(highest)) {
          highest = r.level;
        }
        break;
      }
    }
  }
  return highest;
}

/**
 * Peak direct-reports band inferred by scanning bullets for management
 * language. "Highest detected count wins. Default to 0 if no signal" per
 * spec. Patterns are conservative — we'd rather under-detect (and let the
 * user override up) than over-detect a vague mention.
 */
export function inferReportsPeak(experience: ParsedResume['experience']): ReportsPeak {
  const PATTERNS: RegExp[] = [
    /(\d+)[ -]person team/i,
    /team of (\d+)/i,
    /managed (\d+)\s+(?:direct\s+)?reports?/i,
    /(\d+) direct reports?/i,
    /led (?:a |an )?(\d+)[ -]person/i,
    /managing\s+(\d+)\s+(?:direct\s+)?reports?/i,
  ];
  let peak = 0;
  for (const e of experience) {
    for (const bullet of e.bullets) {
      for (const p of PATTERNS) {
        const m = p.exec(bullet);
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n > peak) peak = n;
        }
      }
    }
  }
  if (peak === 0) return 'None';
  if (peak <= 5) return '1-5';
  if (peak <= 15) return '6-15';
  return '15+';
}

export interface AutoClassifyResult {
  tier: UpdraftTier;
  inputs: TierClassifierInputs;
  yearsExperience: number;
}

export function autoClassifyFromResume(parsed: ParsedResume): AutoClassifyResult {
  const yearsExperience = computeYearsExperience(parsed.experience);
  const inputs: TierClassifierInputs = {
    years_band:   yearsToBand(yearsExperience),
    role_level:   inferRoleLevel(parsed.experience),
    reports_peak: inferReportsPeak(parsed.experience),
  };
  return {
    tier: classifyTier(inputs.years_band, inputs.role_level, inputs.reports_peak),
    inputs,
    yearsExperience,
  };
}
