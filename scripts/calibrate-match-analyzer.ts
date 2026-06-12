// SYS_MATCH_ANALYZER calibration harness.
//
// Iterates a corpus of (resume × JD × tier × expected) cases, calls the
// production analyzeMatch() against each, prints a comparison table.
// Designed for the v0.5 prompt-tuning pass — see skills/updraft/CALIBRATION.md
// for workflow + acceptance criteria.
//
// Usage:
//   npm run calibrate:match                       # run cases in cases/*.yaml
//   npm run calibrate:match -- --case vaughan     # filter cases by substring
//   npm run calibrate:match -- --all-pairs        # run every resume × every JD (no cases needed)
//   npm run calibrate:match -- --all-pairs --limit 5    # smoke-test with 5 pairs
//   npm run calibrate:match -- --all-pairs --pair marketing  # filter all-pairs to a substring of "resume × jd"
//   npm run calibrate:parse                       # (re)parse all corpus resumes
//   npm run calibrate:parse -- --resume marketing
//
// Verdict states:
//   ✓ PASS         — has assertions, all met
//   ✗ FAIL         — has assertions, some failed
//   ○ REVIEW       — no assertions; treat output as the artifact to judge
//   ✗ ANALYZE-FAIL — Gemini returned an error
//   ✗ ERROR        — exception during the run
//
// Every run also writes a markdown report to
// skills/updraft/calibration-fixtures/last-run.md with per-pair detail.
// Pass --out <path> to write elsewhere; pass --no-report to skip.
//
// Costs: each parse call burns ~SYS_RESUME_PARSER tokens (cached per resume
// in skills/updraft/calibration-fixtures/resumes/*.parsed.json — re-run
// `calibrate:parse` only when the parser changes). Each analyze call burns
// ~SYS_MATCH_ANALYZER tokens. Real numbers print in the result table.
//
// Requires `GEMINI_API_KEY` in env (loaded from .env.local via dotenv).
// The harness skips quota counters / kill switches — calibration is
// owner-only work, not user traffic.

import { config } from 'dotenv';
// Load .env.local first (Next-style local secrets), then .env. dotenv keeps
// the first occurrence of each key, so .env.local wins. Plain `dotenv/config`
// only reads .env, which is why GEMINI_API_KEY in .env.local was invisible.
config({ path: ['.env.local', '.env'] });
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { parseResumeFromText } from '@/lib/updraft/resume-parser';
import { analyzeMatch } from '@/lib/updraft/match-analyzer';
import { autoClassifyFromResume } from '@/lib/updraft/tier';
import type { ParsedResume, UpdraftTier } from '@/types';

const FIXTURES = path.resolve(
  process.cwd(),
  'skills',
  'updraft',
  'calibration-fixtures',
);
const RESUMES = path.join(FIXTURES, 'resumes');
const JDS = path.join(FIXTURES, 'jds');
const CASES = path.join(FIXTURES, 'cases');
const DEFAULT_REPORT = path.join(FIXTURES, 'last-run.md');

type Band = 'DIRECT' | 'TRANSFERABLE' | 'ADJACENT' | 'WEAK' | 'GAP';

interface ExpectedShape {
  band?: Band;
  min_pct?: number;
  max_pct?: number;
  critical_gap_keywords?: string[];
}

interface Case {
  name: string;
  resume: string;
  jd: string;
  tier?: UpdraftTier;
  expected?: ExpectedShape;
  notes?: string;
}

interface RunResult {
  name: string;
  resume: string;
  jd: string;
  verdict: string;
  band?: Band | null;
  pct?: number | null;
  tier?: UpdraftTier;
  requiredMatched?: number;
  requiredTotal?: number;
  preferredMatched?: number;
  preferredTotal?: number;
  criticalGaps?: string[];
  majorGaps?: string[];
  strengths?: string[];
  /** Full per-skill arrays from the analyzer, for audit of evidence
   * thresholds and internal consistency (e.g. strengths_to_emphasize
   * naming a skill that the analyzer marked match=false). */
  requiredSkills?: { skill: string; match: boolean; evidence: string | null }[];
  preferredSkills?: { skill: string; match: boolean; evidence: string | null }[];
  extractedRole?: string | null;
  extractedCompany?: string | null;
  detail?: string;
  tokensIn?: number;
  tokensOut?: number;
  hadAssertions: boolean;
  /** True when match-analyzer.ts synthesized band/pct from coverage after
   * the model nulled them despite resume_parsed being present. Should be
   * rare (~1/50) post-prompt-fix; high incidence = prompt regressed. */
  bandSynthesized?: boolean;
}

function expectedHasAssertions(e: ExpectedShape | undefined): boolean {
  if (!e) return false;
  return (
    (e.band !== undefined && e.band !== null) ||
    (e.min_pct !== undefined && e.min_pct !== null) ||
    (e.max_pct !== undefined && e.max_pct !== null) ||
    (e.critical_gap_keywords?.length ?? 0) > 0
  );
}

async function loadOrParseResume(resumeName: string): Promise<ParsedResume> {
  const cached = path.join(RESUMES, `${resumeName}.parsed.json`);
  try {
    const raw = await fs.readFile(cached, 'utf8');
    return JSON.parse(raw) as ParsedResume;
  } catch {
    // fall through to parse
  }
  const txtPath = path.join(RESUMES, `${resumeName}.txt`);
  const txt = await fs.readFile(txtPath, 'utf8');
  console.log(`  [parse] ${resumeName} (cache miss — calling Gemini)`);
  const result = await parseResumeFromText(txt);
  if (!result.ok) {
    throw new Error(`parse failed for ${resumeName}: ${result.message}`);
  }
  await fs.writeFile(cached, JSON.stringify(result.parsed, null, 2));
  console.log(
    `  [parse] ${resumeName} cached → ${path.relative(process.cwd(), cached)}`,
  );
  return result.parsed;
}

async function loadJd(jdName: string): Promise<string> {
  return fs.readFile(path.join(JDS, `${jdName}.txt`), 'utf8');
}

async function listResumeNames(): Promise<string[]> {
  const entries = await fs.readdir(RESUMES);
  return entries
    .filter((f) => f.endsWith('.txt'))
    .map((f) => f.replace(/\.txt$/, ''))
    .sort();
}

async function listJdNames(): Promise<string[]> {
  const entries = await fs.readdir(JDS);
  return entries
    .filter((f) => f.endsWith('.txt'))
    .map((f) => f.replace(/\.txt$/, ''))
    .sort();
}

async function loadCases(filter?: string): Promise<Case[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(CASES);
  } catch {
    return [];
  }
  const files = entries.filter(
    (f) =>
      (f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json')) &&
      !f.startsWith('_') &&
      f !== 'README.md',
  );
  const all: Case[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(CASES, f), 'utf8');
    const parsed = f.endsWith('.json')
      ? JSON.parse(raw)
      : (yaml.load(raw) as unknown);
    if (Array.isArray(parsed)) {
      for (const c of parsed) all.push(c as Case);
    } else if (parsed && typeof parsed === 'object') {
      all.push(parsed as Case);
    }
  }
  return filter ? all.filter((c) => c.name.includes(filter)) : all;
}

async function buildAllPairsCases(): Promise<Case[]> {
  const [resumes, jds] = await Promise.all([listResumeNames(), listJdNames()]);
  const cases: Case[] = [];
  for (const r of resumes) {
    for (const j of jds) {
      cases.push({
        name: `${r} × ${j}`,
        resume: r,
        jd: j,
      });
    }
  }
  return cases;
}

function checkExpected(
  expected: ExpectedShape,
  band: Band | null,
  pct: number | null,
  criticalGaps: string[],
): string[] {
  const issues: string[] = [];
  if (expected.band && band !== expected.band) {
    issues.push(`band ${band ?? 'null'} != expected ${expected.band}`);
  }
  if (expected.min_pct !== undefined && (pct ?? 0) < expected.min_pct) {
    issues.push(`pct ${pct ?? 'null'} < min ${expected.min_pct}`);
  }
  if (expected.max_pct !== undefined && (pct ?? 0) > expected.max_pct) {
    issues.push(`pct ${pct ?? 'null'} > max ${expected.max_pct}`);
  }
  if (expected.critical_gap_keywords?.length) {
    const lc = criticalGaps.map((g) => g.toLowerCase());
    for (const kw of expected.critical_gap_keywords) {
      if (!lc.some((g) => g.includes(kw.toLowerCase()))) {
        issues.push(`missing critical-gap keyword: "${kw}"`);
      }
    }
  }
  return issues;
}

async function runOne(c: Case): Promise<RunResult> {
  const resume = await loadOrParseResume(c.resume);
  const jd = await loadJd(c.jd);
  const tier = c.tier ?? autoClassifyFromResume(resume).tier;
  const hadAssertions = expectedHasAssertions(c.expected);

  const result = await analyzeMatch({
    jdText: jd,
    resumeParsed: resume,
    tier,
  });

  if (!result.ok) {
    return {
      name: c.name,
      resume: c.resume,
      jd: c.jd,
      verdict: '✗ ANALYZE-FAIL',
      detail: result.error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      hadAssertions,
    };
  }

  const a = result.analysis;
  const band = (a.confidence_band ?? null) as Band | null;
  const pct = a.overall_match_pct ?? null;
  const required = a.required_skills ?? [];
  const preferred = a.preferred_skills ?? [];
  const allGaps = a.gaps ?? [];
  const criticalGaps = allGaps
    .filter((g) => g.severity === 'critical')
    .map((g) => g.requirement);
  const majorGaps = allGaps
    .filter((g) => g.severity === 'major')
    .map((g) => g.requirement);
  const strengths = a.strengths_to_emphasize ?? [];

  let verdict: string;
  let detail = '';
  if (hadAssertions && c.expected) {
    const issues = checkExpected(c.expected, band, pct, criticalGaps);
    verdict = issues.length === 0 ? '✓ PASS' : '✗ FAIL';
    detail = issues.join('; ');
  } else {
    verdict = '○ REVIEW';
  }

  return {
    name: c.name,
    resume: c.resume,
    jd: c.jd,
    verdict,
    band,
    pct,
    tier,
    requiredMatched: required.filter((s) => s.match).length,
    requiredTotal: required.length,
    preferredMatched: preferred.filter((s) => s.match).length,
    preferredTotal: preferred.length,
    criticalGaps,
    majorGaps,
    strengths,
    requiredSkills: required.map((s) => ({
      skill: s.skill,
      match: s.match,
      evidence: s.evidence ?? null,
    })),
    preferredSkills: preferred.map((s) => ({
      skill: s.skill,
      match: s.match,
      evidence: s.evidence ?? null,
    })),
    extractedRole: a.extracted_target?.role_title ?? null,
    extractedCompany: a.extracted_target?.company ?? null,
    detail,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    hadAssertions,
    bandSynthesized: result.bandSynthesized,
  };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function renderSummaryTable(results: RunResult[]): string {
  const lines: string[] = [];
  const header = `${pad('Pair', 60)} | ${pad('Verdict', 14)} | ${pad('Band', 12)} | ${pad('Pct', 4)} | ${pad('Reqd', 5)} | Tier | Tokens`;
  lines.push(header);
  lines.push('-'.repeat(header.length));
  for (const r of results) {
    const reqd =
      r.requiredTotal != null
        ? `${r.requiredMatched ?? 0}/${r.requiredTotal}`
        : '-';
    const pct = r.pct == null ? '-' : String(r.pct);
    const tier = r.tier == null ? '-' : `T${r.tier}`;
    const tokens = r.tokensIn != null ? `${r.tokensIn}/${r.tokensOut}` : '-';
    lines.push(
      `${pad(r.name, 60)} | ${pad(r.verdict, 14)} | ${pad(r.band ?? '-', 12)} | ${pad(pct, 4)} | ${pad(reqd, 5)} | ${pad(tier, 4)} | ${tokens}`,
    );
  }
  return lines.join('\n');
}

function renderMarkdownReport(results: RunResult[]): string {
  const ts = new Date().toISOString();
  const totalTokIn = results.reduce((s, r) => s + (r.tokensIn ?? 0), 0);
  const totalTokOut = results.reduce((s, r) => s + (r.tokensOut ?? 0), 0);
  const failed = results.filter(
    (r) => r.verdict.startsWith('✗') || r.verdict.startsWith('✗'),
  ).length;

  const synthCount = results.filter((r) => r.bandSynthesized).length;

  const lines: string[] = [];
  lines.push(`# Match-analyzer calibration run — ${ts}`);
  lines.push('');
  lines.push(
    `${results.length} pair${results.length === 1 ? '' : 's'}, ${failed} failed/erred. Total tokens in/out: ${totalTokIn}/${totalTokOut}.`,
  );
  if (synthCount > 0) {
    lines.push('');
    lines.push(
      `⚠ ${synthCount} band${synthCount === 1 ? '' : 's'} synthesized by the analyzer fallback (model returned null despite resume_parsed being present). Rows marked with ⚠ in the table below.`,
    );
  }
  lines.push('');
  lines.push('## Summary table');
  lines.push('');
  lines.push(
    '| Pair | Verdict | Band | Pct | Reqd matched | Pref matched | Critical gaps | Tier | Tokens |',
  );
  lines.push(
    '|---|---|---|---|---|---|---|---|---|',
  );
  for (const r of results) {
    const reqd =
      r.requiredTotal != null
        ? `${r.requiredMatched ?? 0}/${r.requiredTotal}`
        : '-';
    const pref =
      r.preferredTotal != null
        ? `${r.preferredMatched ?? 0}/${r.preferredTotal}`
        : '-';
    const pct = r.pct == null ? '-' : String(r.pct);
    const tier = r.tier == null ? '-' : `T${r.tier}`;
    const tokens = r.tokensIn != null ? `${r.tokensIn}/${r.tokensOut}` : '-';
    const critCount = r.criticalGaps?.length ?? 0;
    lines.push(
      `| ${r.name} | ${r.verdict} | ${(r.band ?? '-') + (r.bandSynthesized ? ' ⚠' : '')} | ${pct} | ${reqd} | ${pref} | ${critCount} | ${tier} | ${tokens} |`,
    );
  }
  lines.push('');
  lines.push('## Per-pair detail');
  lines.push('');
  for (const r of results) {
    lines.push(`### ${r.name}  ${r.verdict}`);
    lines.push('');
    if (r.extractedRole || r.extractedCompany) {
      lines.push(
        `- **Extracted target:** ${r.extractedRole ?? 'unknown role'} @ ${r.extractedCompany ?? 'unknown co'}`,
      );
    }
    lines.push(`- **Tier (auto):** ${r.tier ?? '—'}`);
    lines.push(
      `- **Band:** ${r.band ?? '—'} (${r.pct ?? '—'}%)${r.bandSynthesized ? ' ⚠ synthesized from coverage (model nulled)' : ''}`,
    );
    if (r.requiredTotal != null) {
      lines.push(
        `- **Required skills matched:** ${r.requiredMatched ?? 0}/${r.requiredTotal}`,
      );
    }
    if (r.preferredTotal != null) {
      lines.push(
        `- **Preferred skills matched:** ${r.preferredMatched ?? 0}/${r.preferredTotal}`,
      );
    }
    if (r.requiredSkills?.length) {
      lines.push(`- **Required skills (per-skill):**`);
      for (const s of r.requiredSkills) {
        const mark = s.match ? '✓' : '✗';
        const ev = s.evidence ? ` — _${s.evidence}_` : '';
        lines.push(`  - ${mark} ${s.skill}${ev}`);
      }
    }
    if (r.preferredSkills?.length) {
      lines.push(`- **Preferred skills (per-skill):**`);
      for (const s of r.preferredSkills) {
        const mark = s.match ? '✓' : '✗';
        const ev = s.evidence ? ` — _${s.evidence}_` : '';
        lines.push(`  - ${mark} ${s.skill}${ev}`);
      }
    }
    if (r.criticalGaps?.length) {
      lines.push(`- **Critical gaps (${r.criticalGaps.length}):**`);
      for (const g of r.criticalGaps) lines.push(`  - ${g}`);
    } else {
      lines.push(`- **Critical gaps:** _none_`);
    }
    if (r.majorGaps?.length) {
      lines.push(`- **Major gaps (${r.majorGaps.length}):**`);
      for (const g of r.majorGaps) lines.push(`  - ${g}`);
    }
    if (r.strengths?.length) {
      lines.push(`- **Strengths to emphasize:**`);
      for (const s of r.strengths) lines.push(`  - ${s}`);
    }
    if (r.detail) lines.push(`- **Detail:** ${r.detail}`);
    lines.push(
      `- **Tokens (in/out):** ${r.tokensIn ?? '—'} / ${r.tokensOut ?? '—'}`,
    );
    lines.push('');
  }
  return lines.join('\n');
}

function parseArgs(argv: string[]) {
  const out: {
    case?: string;
    parseOnly: boolean;
    resume?: string;
    allPairs: boolean;
    pair?: string;
    limit?: number;
    out?: string;
    noReport: boolean;
  } = { parseOnly: false, allPairs: false, noReport: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--case') out.case = argv[++i];
    else if (a === '--parse-only') out.parseOnly = true;
    else if (a === '--resume') out.resume = argv[++i];
    else if (a === '--all-pairs') out.allPairs = true;
    else if (a === '--pair') out.pair = argv[++i];
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--no-report') out.noReport = true;
  }
  return out;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      'GEMINI_API_KEY not set. Add it to .env.local or export it before running.',
    );
    process.exit(2);
  }

  const args = parseArgs(process.argv.slice(2));

  if (args.parseOnly) {
    const names = args.resume ? [args.resume] : await listResumeNames();
    console.log(`Parsing ${names.length} resume(s)...\n`);
    for (const name of names) {
      const cached = path.join(RESUMES, `${name}.parsed.json`);
      try {
        await fs.access(cached);
        console.log(
          `  [parse] ${name} already cached (skip — delete .parsed.json to re-parse)`,
        );
      } catch {
        await loadOrParseResume(name);
      }
    }
    return;
  }

  let cases: Case[];
  if (args.allPairs) {
    cases = await buildAllPairsCases();
    if (args.pair) {
      const needle = args.pair.toLowerCase();
      cases = cases.filter((c) => c.name.toLowerCase().includes(needle));
    }
    if (args.limit && cases.length > args.limit) {
      cases = cases.slice(0, args.limit);
    }
    console.log(
      `\n--all-pairs mode: ${cases.length} pair${cases.length === 1 ? '' : 's'}${args.pair ? ` filtered by "${args.pair}"` : ''} (no expected scores asserted; verdicts will read REVIEW).`,
    );
    console.log(
      `Estimate: ~${cases.length} analyzer calls (Gemini Flash, ~$0.001-0.002 each).\n`,
    );
  } else {
    cases = await loadCases(args.case);
    if (cases.length === 0) {
      console.error(
        `No cases found${args.case ? ` matching "${args.case}"` : ''}.`,
      );
      console.error(
        `Add YAML/JSON case files at ${path.relative(process.cwd(), CASES)}/, or pass --all-pairs.`,
      );
      console.error(`See cases/README.md for the schema.`);
      process.exit(1);
    }
    console.log(
      `\nRunning ${cases.length} case${cases.length === 1 ? '' : 's'}...\n`,
    );
  }

  const results: RunResult[] = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.name}... `);
    try {
      const r = await runOne(c);
      results.push(r);
      const synth = r.bandSynthesized ? ' ⚠synth' : '';
      const tail =
        r.band && r.pct != null
          ? `${r.verdict}  (${r.band} ${r.pct}%${synth})`
          : r.verdict;
      console.log(tail);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ERROR: ${msg}`);
      results.push({
        name: c.name,
        resume: c.resume,
        jd: c.jd,
        verdict: '✗ ERROR',
        detail: msg,
        hadAssertions: expectedHasAssertions(c.expected),
      });
    }
  }

  console.log('\n--- Summary ---\n');
  console.log(renderSummaryTable(results));

  const passed = results.filter((r) => r.verdict.startsWith('✓')).length;
  const failed = results.filter((r) => r.verdict.startsWith('✗')).length;
  const review = results.filter((r) => r.verdict.startsWith('○')).length;
  const synth = results.filter((r) => r.bandSynthesized).length;
  console.log(
    `\n${passed} pass · ${failed} fail · ${review} review · ${results.length} total.${synth > 0 ? ` ⚠ ${synth} band(s) synthesized by fallback (model nulled).` : ''}`,
  );
  for (const r of results) {
    if (r.verdict.startsWith('✗') && r.detail) {
      console.log(`  ${r.name}: ${r.detail}`);
    }
  }

  if (!args.noReport) {
    const reportPath = args.out ?? DEFAULT_REPORT;
    await fs.writeFile(reportPath, renderMarkdownReport(results));
    console.log(
      `\nReport written → ${path.relative(process.cwd(), reportPath)}`,
    );
  }

  // Exit code semantics:
  //   0 = no real failures (everything passed or was REVIEW-only)
  //   1 = at least one assertion failed or a run errored
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
