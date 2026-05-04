// UpDraft Stage 03 closing phase — executive summary generator.
//
// Wraps SYS_SUMMARY_GENERATOR from lib-system-prompts.md. Takes the
// accumulated MOD content (summary_seed + tier + experience + optional
// leadership_brand / transformation_arc) and produces a 4-6 sentence
// third-person executive paragraph that opens the resume.
//
// withAuditVoice=false because this is structured content production,
// not a user-facing conversational turn — the prompt itself defines the
// voice (third-person executive summary, banned filler phrases).

import 'server-only';
import { callGemini } from './gemini';
import { loadSystemPrompt } from './skill-files';
import type {
  UpdraftRoleInMod,
  UpdraftTier,
} from '@/types';

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
  },
  required: ['summary'],
} as const;

export interface GenerateSummaryArgs {
  summarySeed: string;
  tier: UpdraftTier;
  targetRoleTitle?: string | null;
  experience: UpdraftRoleInMod[];
  /** Tier 3+ — included when present. */
  leadershipBrand?: string | null;
  /** Tier 4 — included when present. */
  transformationArc?: string | null;
}

export interface GenerateSummarySuccess {
  ok: true;
  summary: string;
  tokensIn: number;
  tokensOut: number;
  retried: boolean;
}

export interface GenerateSummaryFailure {
  ok: false;
  error: string;
  tokensIn: number;
  tokensOut: number;
}

export type GenerateSummaryResult =
  | GenerateSummarySuccess
  | GenerateSummaryFailure;

export async function generateSummary(
  args: GenerateSummaryArgs,
): Promise<GenerateSummaryResult> {
  const sysPrompt = await loadSystemPrompt('SYS_SUMMARY_GENERATOR');

  // The prompt expects a structured payload of the inputs. JSON-stringify
  // gets the model exact field names + nesting it can reference.
  const userPayload = JSON.stringify(
    {
      summary_seed: args.summarySeed,
      tier: args.tier,
      target_role_title: args.targetRoleTitle ?? null,
      experience: args.experience,
      leadership_brand: args.leadershipBrand ?? null,
      transformation_arc: args.transformationArc ?? null,
    },
    null,
    2,
  );

  const result = await callGemini<{ summary: string }>({
    systemPrompt: { raw: sysPrompt },
    withAuditVoice: false,
    userPrompt: userPayload,
    responseSchema: SUMMARY_SCHEMA,
    temperature: 0.4,                  // a touch of variability for prose
  });

  if (!result.ok || !result.json) {
    return {
      ok: false,
      error: result.ok ? 'no-json' : result.error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  const summary = (result.json.summary ?? '').trim();
  if (!summary) {
    return {
      ok: false,
      error: 'empty-summary',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  return {
    ok: true,
    summary,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    retried: result.retried,
  };
}
