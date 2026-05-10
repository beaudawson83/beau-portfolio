// UpDraft Stage 02.3 — JD analysis + match scoring.
//
// Calls SYS_MATCH_ANALYZER from lib-system-prompts.md with lib-confidence-
// rubric.md loaded into the system instruction (the prompt explicitly
// references the rubric by name and requires it in context). Silent
// extraction — no Audit voice on this call.
//
// Returns the structured match_analysis JSON the spec defines for Stage 02
// output. Path B (resume_parsed=null) gets the minimal-analysis treatment
// the prompt describes: skills/red_flags from JD only, overall_match_pct
// and confidence_band null, gaps and strengths empty.

import 'server-only';
import { callGemini } from './gemini';
import { loadConfidenceRubric, loadSystemPrompt } from './skill-files';
import type {
  ParsedResume,
  UpdraftMatchAnalysis,
  UpdraftTier,
} from '@/types';

// Additional instruction layered on top of SYS_MATCH_ANALYZER. The
// canonical prompt at lib-system-prompts.md handles scoring; we tack on
// target-metadata extraction here so a single Gemini call produces both
// the match analysis AND the parsed target fields. That collapses the
// Stage 02 form to "paste your JD" — no need to retype role/company.
//
// Quality-tuning notes for this prompt (v0.5+ work) live in
// skills/updraft/CALIBRATION.md. v0.1 ships with known generosity in
// keyword-level matching — that file documents the failure modes,
// benchmark cases, expected post-tune results, and the test-harness
// shape we'll build before iterating. Read it before editing this
// prompt or the canonical SYS_MATCH_ANALYZER.
const TARGET_EXTRACTION_INSTRUCTION = `--- ADDITIONAL TASK: TARGET METADATA EXTRACTION ---

Beyond the match analysis, also extract target role metadata into an
"extracted_target" object. Pull these fields from the JD text:

- role_title: the job title from the JD header (e.g., "Senior Backend
  Engineer"). If the input is a fuzzy description ("any junior data role
  at a startup"), extract the role-shape that's described.
- company: the hiring company's name. Use null if the input is generic
  or no company is named.
- industry: the industry/sector inferred from the JD. Use null if unclear.
- seniority: the seniority level (e.g., "Junior", "Mid", "Senior",
  "Staff", "Director", "VP"). Use null if unclear.
- location: the location/remote policy from the JD (e.g., "Remote · US",
  "New York, NY"). Use null if not stated.
- compensation_range: the comp range from the JD (e.g., "$180-220k",
  "$140k base + equity"). Use null if not stated.

Return null for any field that isn't present or can't be inferred with
high confidence. Do not guess or fabricate.`;

// Gemini-flavored JSON schema for the SYS_MATCH_ANALYZER output. Mirrors
// the Stage 02 output contract in stage-02-target.md, extended with
// extracted_target for the target metadata extraction task above.
const MATCH_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    overall_match_pct: { type: 'number', nullable: true },
    required_skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill:    { type: 'string' },
          match:    { type: 'boolean' },
          evidence: { type: 'string', nullable: true },
        },
        required: ['skill', 'match', 'evidence'],
      },
    },
    preferred_skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill:    { type: 'string' },
          match:    { type: 'boolean' },
          evidence: { type: 'string', nullable: true },
        },
        required: ['skill', 'match', 'evidence'],
      },
    },
    soft_skills:    { type: 'array', items: { type: 'string' } },
    industry_terms: { type: 'array', items: { type: 'string' } },
    red_flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type:        { type: 'string' },
          description: { type: 'string' },
        },
        required: ['type', 'description'],
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requirement: { type: 'string' },
          severity:    { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['requirement', 'severity'],
      },
    },
    strengths_to_emphasize: { type: 'array', items: { type: 'string' } },
    confidence_band: {
      type: 'string',
      enum: ['DIRECT', 'TRANSFERABLE', 'ADJACENT', 'WEAK', 'GAP'],
      nullable: true,
    },
    extracted_target: {
      type: 'object',
      properties: {
        role_title:         { type: 'string', nullable: true },
        company:            { type: 'string', nullable: true },
        industry:           { type: 'string', nullable: true },
        seniority:          { type: 'string', nullable: true },
        location:           { type: 'string', nullable: true },
        compensation_range: { type: 'string', nullable: true },
      },
      required: ['role_title', 'company', 'industry', 'seniority', 'location', 'compensation_range'],
    },
  },
  required: [
    'overall_match_pct',
    'required_skills',
    'preferred_skills',
    'soft_skills',
    'industry_terms',
    'red_flags',
    'gaps',
    'strengths_to_emphasize',
    'confidence_band',
    'extracted_target',
  ],
} as const;

export interface AnalyzeMatchSuccess {
  ok: true;
  analysis: UpdraftMatchAnalysis;
  tokensIn: number;
  tokensOut: number;
  retried: boolean;
  /**
   * True when the model returned null overall_match_pct / confidence_band
   * despite resume_parsed being non-null (a prompt-contract violation), and
   * the analyzer synthesized the band/pct from the coverage data the model
   * did return. Callers should log this to `updraft_events` for monitoring —
   * frequent occurrence means the prompt needs another tightening pass.
   */
  bandSynthesized: boolean;
}

export interface AnalyzeMatchFailure {
  ok: false;
  error: string;
  tokensIn: number;
  tokensOut: number;
}

export type AnalyzeMatchResult = AnalyzeMatchSuccess | AnalyzeMatchFailure;

export interface AnalyzeMatchArgs {
  jdText: string;
  resumeParsed: ParsedResume | null;
  tier: UpdraftTier;
}

export async function analyzeMatch(
  args: AnalyzeMatchArgs,
): Promise<AnalyzeMatchResult> {
  // Build system instruction = SYS_MATCH_ANALYZER + the rubric. The prompt
  // expects the rubric in context; concatenating with a clear separator
  // keeps both files visible to the model without a separate cache step.
  const [sysPrompt, rubric] = await Promise.all([
    loadSystemPrompt('SYS_MATCH_ANALYZER'),
    loadConfidenceRubric(),
  ]);
  const combinedSystem = `${sysPrompt}\n\n--- CONFIDENCE RUBRIC ---\n${rubric}\n\n${TARGET_EXTRACTION_INSTRUCTION}`;

  // Encode inputs as a single JSON payload — clearer than multi-line prose
  // for a structured-output extraction call.
  const userPayload = JSON.stringify(
    {
      jd_text: args.jdText,
      resume_parsed: args.resumeParsed,
      tier: args.tier,
    },
    null,
    2,
  );

  const result = await callGemini<UpdraftMatchAnalysis>({
    systemPrompt: { raw: combinedSystem },
    withAuditVoice: false,
    userPrompt: userPayload,
    responseSchema: MATCH_ANALYSIS_SCHEMA,
    temperature: 0,
  });

  if (!result.ok || !result.json) {
    return {
      ok: false,
      error: result.ok ? 'no-json' : result.error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  // Contract-violation salvage: SYS_MATCH_ANALYZER is required to emit non-null
  // overall_match_pct and confidence_band whenever resume_parsed is non-null
  // (Path A). Calibration shows it occasionally violates this — once per ~50
  // calls — leaving the Stage 02 UI to render the Path B "no resume yet" copy
  // to a user who did upload a resume. When that happens, synthesize the band
  // from the coverage data the model did return so the briefing is renderable.
  const analysis = result.json;
  let bandSynthesized = false;
  if (
    args.resumeParsed !== null &&
    (analysis.overall_match_pct === null || analysis.confidence_band === null)
  ) {
    const { pct, band } = synthesizeBand(analysis);
    analysis.overall_match_pct = pct;
    analysis.confidence_band = band;
    bandSynthesized = true;
  }

  return {
    ok: true,
    analysis,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    retried: result.retried,
    bandSynthesized,
  };
}

/**
 * Synthesize an approximate match score + band from the coverage data the
 * analyzer returned. Used only when the model violates its contract by
 * nulling band/pct on a Path A call. Formula matches the prompt's documented
 * weighting (70% required-skill coverage, 30% preferred-skill coverage),
 * mapped to band thresholds from the Confidence Rubric. Less nuanced than
 * the rubric's 4-dimension scoring — it's a salvage path, not a substitute.
 */
function synthesizeBand(
  analysis: UpdraftMatchAnalysis,
): { pct: number; band: import('@/types').UpdraftConfidenceBand } {
  const reqs = analysis.required_skills ?? [];
  const prefs = analysis.preferred_skills ?? [];
  const reqMatched = reqs.filter((s) => s.match).length;
  const prefMatched = prefs.filter((s) => s.match).length;

  const reqPct = reqs.length > 0 ? (reqMatched / reqs.length) * 100 : 0;
  const prefPct = prefs.length > 0 ? (prefMatched / prefs.length) * 100 : 0;

  // No requirements extracted at all → GAP/0 (matches prompt's thin-jd guidance)
  if (reqs.length === 0 && prefs.length === 0) {
    return { pct: 0, band: 'GAP' };
  }

  // Weight preferred only when there are preferreds to score; otherwise the
  // required-coverage carries the full signal (avoids penalizing JDs that
  // happen not to list any nice-to-haves).
  const pct = prefs.length > 0 ? reqPct * 0.7 + prefPct * 0.3 : reqPct;
  const rounded = Math.round(pct * 10) / 10;

  let band: import('@/types').UpdraftConfidenceBand;
  if (rounded >= 90) band = 'DIRECT';
  else if (rounded >= 75) band = 'TRANSFERABLE';
  else if (rounded >= 60) band = 'ADJACENT';
  else if (rounded >= 45) band = 'WEAK';
  else band = 'GAP';

  return { pct: rounded, band };
}
