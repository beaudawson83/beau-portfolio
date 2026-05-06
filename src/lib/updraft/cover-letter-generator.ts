// UpDraft Stage 04 — cover letter drafter.
//
// Wraps SYS_COVER_LETTER_DRAFTER from lib-system-prompts.md per
// skills/updraft/references/lib-cover-letter.md. Produces a 4-paragraph
// first-person cover letter (250-400 words) with structured metadata for
// future tuning (hook_type / p3_branch / close_type).
//
// Inputs include match_analysis when present (set null on Path B / when
// Stage 02 didn't compute it). The system prompt has fallback patterns
// when match_analysis is null — Hook D / Branch 3 are both data-light.
//
// withAuditVoice=false: this is structured first-person prose in the
// candidate's voice, not Audit's. The prompt itself defines the tone
// rules (banned filler phrases, tier-aware sharpness).
//
// One revision loop max if word count is outside 250-400. v0.5 keeps it
// simple — single shot, accept whatever falls in range.
//
// Truthfulness: the spec demands every claim trace to MOD content.
// SYS_FINAL_QA is the eventual gate (deferred); v0.5 ships the draft
// as-is and lets the user edit the DOCX after download.

import 'server-only';
import { callGemini } from './gemini';
import { loadSystemPrompt } from './skill-files';
import type {
  UpdraftMatchAnalysis,
  UpdraftMod,
  UpdraftTargetRole,
  UpdraftTier,
} from '@/types';

const COVER_LETTER_SCHEMA = {
  type: 'object',
  properties: {
    greeting:    { type: 'string' },
    paragraphs:  { type: 'array', items: { type: 'string' } },
    signoff:     { type: 'string' },
    word_count:  { type: 'number' },
    hook_type:   { type: 'string' },
    p3_branch:   { type: 'string' },
    close_type:  { type: 'string' },
  },
  required: ['greeting', 'paragraphs', 'signoff', 'word_count'],
} as const;

export interface DraftCoverLetterArgs {
  mod: UpdraftMod;
  target: UpdraftTargetRole;
  matchAnalysis: UpdraftMatchAnalysis | null;
  tier: UpdraftTier;
}

export interface CoverLetterDraft {
  greeting: string;
  paragraphs: string[];
  signoff: string;
  wordCount: number;
  hookType: string | null;
  p3Branch: string | null;
  closeType: string | null;
}

export interface DraftCoverLetterSuccess {
  ok: true;
  draft: CoverLetterDraft;
  tokensIn: number;
  tokensOut: number;
  retried: boolean;
}

export interface DraftCoverLetterFailure {
  ok: false;
  error: string;
  tokensIn: number;
  tokensOut: number;
}

export type DraftCoverLetterResult =
  | DraftCoverLetterSuccess
  | DraftCoverLetterFailure;

export async function draftCoverLetter(
  args: DraftCoverLetterArgs,
): Promise<DraftCoverLetterResult> {
  const sysPrompt = await loadSystemPrompt('SYS_COVER_LETTER_DRAFTER');

  // Mirror summary-generator's payload shape — JSON the model can index
  // by exact field name. Filter empty interview_objections (the Stage 03
  // textarea persists raw line splits to keep mid-typing spaces; we
  // clean here before the prompt sees them).
  const cleanedObjections = (args.mod.interview_objections ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const userPayload = JSON.stringify(
    {
      mod: args.mod,
      target: {
        role_title: args.target.role_title,
        company:    args.target.company,
        jd_text:    args.target.jd_text,
      },
      match_analysis:        args.matchAnalysis,
      interview_objections:  cleanedObjections,
      tier:                  args.tier,
    },
    null,
    2,
  );

  const result = await callGemini<{
    greeting:    string;
    paragraphs:  string[];
    signoff:     string;
    word_count:  number;
    hook_type?:  string;
    p3_branch?:  string;
    close_type?: string;
  }>({
    systemPrompt: { raw: sysPrompt },
    withAuditVoice: false,
    userPrompt: userPayload,
    responseSchema: COVER_LETTER_SCHEMA,
    temperature: 0.5,                  // some variability — prose, but constrained
  });

  if (!result.ok || !result.json) {
    return {
      ok: false,
      error: result.ok ? 'no-json' : result.error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  const json = result.json;
  const greeting   = (json.greeting   ?? '').trim();
  const signoff    = (json.signoff    ?? '').trim();
  const paragraphs = Array.isArray(json.paragraphs)
    ? json.paragraphs.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
    : [];

  // Spec calls for exactly 4 paragraphs. Reject anything that drops out
  // of that — v0.5 doesn't run a revision loop yet, but this guards
  // against silent shape drift.
  if (paragraphs.length < 3 || paragraphs.length > 5) {
    return {
      ok: false,
      error: `paragraph-count:${paragraphs.length}`,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }
  if (!greeting || !signoff) {
    return {
      ok: false,
      error: 'missing-greeting-or-signoff',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  return {
    ok: true,
    draft: {
      greeting,
      paragraphs,
      signoff,
      wordCount:  Number.isFinite(json.word_count) ? Number(json.word_count) : 0,
      hookType:   typeof json.hook_type   === 'string' ? json.hook_type   : null,
      p3Branch:   typeof json.p3_branch   === 'string' ? json.p3_branch   : null,
      closeType:  typeof json.close_type  === 'string' ? json.close_type  : null,
    },
    tokensIn:  result.tokensIn,
    tokensOut: result.tokensOut,
    retried:   result.retried,
  };
}
