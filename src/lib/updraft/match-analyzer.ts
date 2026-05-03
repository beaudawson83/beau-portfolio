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

  return {
    ok: true,
    analysis: result.json,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    retried: result.retried,
  };
}
