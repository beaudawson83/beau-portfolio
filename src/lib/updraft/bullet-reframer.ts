// UpDraft Stage 04 — bullet reframer.
//
// Adapts strong existing bullets to a specific JD without changing facts.
// Uses SYS_BULLET_REFRAMER from lib-system-prompts.md with one Gemini call
// per role (not per-bullet — the cost/quality balance per RETAILOR-SCOPE.md
// decision #3). Produces a shallow-cloned tailoredMod used ONLY for the
// resume render; the canonical MOD stays untailored.
//
// The 4 reframing strategies (keyword-alignment, emphasis-shift,
// abstraction-level, scale-emphasis) are model-chosen per bullet. The
// Truth Line is enforced: every reframed bullet must pass the 4-part
// truth check or the original is returned unchanged.
//
// Non-blocking by design — any failure (network, parse, truth-check)
// returns the original MOD unmodified + an error in the log. The caller
// (generate-files) surfaces a banner but still ships the resume.

import 'server-only';
import { callGemini } from './gemini';
import { loadSystemPrompt } from './skill-files';
import type {
  UpdraftBullet,
  UpdraftMatchAnalysis,
  UpdraftMod,
  UpdraftRoleInMod,
  UpdraftTargetRole,
} from '@/types';

// ---------------------------------------------------------------------------
// JD signal derivation
// ---------------------------------------------------------------------------

export interface TargetJdSignal {
  terminology: string[];
  outcome_type: string;
  abstraction_preference: 'high' | 'low';
  scale_signal: 'individual' | 'team' | 'org' | 'enterprise';
}

function deriveJdSignal(
  target: UpdraftTargetRole,
  matchAnalysis: UpdraftMatchAnalysis | null,
): TargetJdSignal {
  const terminology: string[] = [];

  if (matchAnalysis) {
    for (const s of matchAnalysis.industry_terms) terminology.push(s);
    for (const s of matchAnalysis.required_skills) {
      if (s.skill) terminology.push(s.skill);
    }
    for (const s of matchAnalysis.preferred_skills) {
      if (s.skill) terminology.push(s.skill);
    }
  }

  const jdLower = target.jd_text.toLowerCase();

  // outcome_type — scan for dominant signal
  const revenueSignals = ['revenue', 'arr', 'mrr', 'gmv', 'sales', 'profit', 'margin', 'p&l'];
  const retentionSignals = ['retention', 'churn', 'nps', 'csat', 'satisfaction', 'loyalty'];
  const operationalSignals = ['efficiency', 'throughput', 'latency', 'uptime', 'sla', 'cycle time'];

  let outcome_type = 'operational';
  const revCount = revenueSignals.filter((s) => jdLower.includes(s)).length;
  const retCount = retentionSignals.filter((s) => jdLower.includes(s)).length;
  const opsCount = operationalSignals.filter((s) => jdLower.includes(s)).length;
  if (revCount >= retCount && revCount >= opsCount && revCount > 0) outcome_type = 'revenue';
  else if (retCount >= opsCount && retCount > 0) outcome_type = 'retention';

  // abstraction_preference — technical depth indicators
  const techSignals = [
    'python', 'java', 'typescript', 'sql', 'api', 'sdk', 'aws', 'gcp',
    'azure', 'kubernetes', 'docker', 'ci/cd', 'terraform', 'react',
  ];
  const execSignals = [
    'strategy', 'vision', 'stakeholder', 'board', 'executive', 'c-suite',
    'transformation', 'portfolio', 'governance',
  ];
  const techHits = techSignals.filter((s) => jdLower.includes(s)).length;
  const execHits = execSignals.filter((s) => jdLower.includes(s)).length;
  const abstraction_preference: 'high' | 'low' = techHits > execHits ? 'low' : 'high';

  // scale_signal — org scope
  const enterpriseSignals = ['enterprise', 'global', 'multi-region', 'fortune', 'billion'];
  const orgSignals = ['cross-functional', 'organization', 'department', 'division', 'company-wide'];
  const teamSignals = ['team', 'squad', 'pod', 'direct reports', 'manage'];
  if (enterpriseSignals.some((s) => jdLower.includes(s))) {
    return { terminology, outcome_type, abstraction_preference, scale_signal: 'enterprise' };
  }
  if (orgSignals.some((s) => jdLower.includes(s))) {
    return { terminology, outcome_type, abstraction_preference, scale_signal: 'org' };
  }
  if (teamSignals.some((s) => jdLower.includes(s))) {
    return { terminology, outcome_type, abstraction_preference, scale_signal: 'team' };
  }
  return { terminology, outcome_type, abstraction_preference, scale_signal: 'individual' };
}

// ---------------------------------------------------------------------------
// Gemini response schema (per-role batch)
// ---------------------------------------------------------------------------

const REFRAME_ROLE_SCHEMA = {
  type: 'object',
  properties: {
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original_index:     { type: 'number' },
          reframed_bullet:    { type: 'string' },
          strategy_used:      { type: 'string' },
          truth_check_passed: { type: 'boolean' },
        },
        required: ['original_index', 'reframed_bullet', 'strategy_used', 'truth_check_passed'],
      },
    },
  },
  required: ['bullets'],
} as const;

interface GeminiReframedBullet {
  original_index: number;
  reframed_bullet: string;
  strategy_used: string;
  truth_check_passed: boolean;
}

interface GeminiReframeRoleResponse {
  bullets: GeminiReframedBullet[];
}

// ---------------------------------------------------------------------------
// Reframe log entry (persisted to stage_04 for transparency)
// ---------------------------------------------------------------------------

export type ReframeStrategy =
  | 'keyword-alignment'
  | 'emphasis-shift'
  | 'abstraction-level'
  | 'scale-emphasis'
  | 'none';

export interface ReframeLogEntry {
  role_index: number;
  company: string;
  title: string;
  bullet_index: number;
  original: string;
  reframed: string;
  strategy_used: ReframeStrategy;
  truth_check_passed: boolean;
  changed: boolean;
}

export interface ReframeRoleError {
  role_index: number;
  company: string;
  title: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ReframeBulletsArgs {
  mod: UpdraftMod;
  target: UpdraftTargetRole;
  matchAnalysis: UpdraftMatchAnalysis | null;
}

export interface ReframeBulletsResult {
  ok: boolean;
  tailoredMod: UpdraftMod;
  log: ReframeLogEntry[];
  errors: ReframeRoleError[];
  tokensIn: number;
  tokensOut: number;
}

export async function reframeBullets(
  args: ReframeBulletsArgs,
): Promise<ReframeBulletsResult> {
  const { mod, target, matchAnalysis } = args;
  const jdSignal = deriveJdSignal(target, matchAnalysis);
  const sysPrompt = await loadSystemPrompt('SYS_BULLET_REFRAMER');

  const log: ReframeLogEntry[] = [];
  const errors: ReframeRoleError[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  // Deep-clone experience so we can mutate bullets without touching the original.
  const tailoredExperience: UpdraftRoleInMod[] = mod.experience.map((role) => ({
    ...role,
    bullets: role.bullets.map((b) => ({ ...b })),
  }));

  // Process each role sequentially (one Gemini call per role).
  // Sequential keeps cost predictable and avoids blast-radius on a bad call.
  for (let ri = 0; ri < tailoredExperience.length; ri++) {
    const role = tailoredExperience[ri];
    if (role.bullets.length === 0) continue;

    const roleResult = await reframeOneRole({
      sysPrompt,
      jdSignal,
      target,
      role,
      roleIndex: ri,
    });

    totalTokensIn += roleResult.tokensIn;
    totalTokensOut += roleResult.tokensOut;

    if (!roleResult.ok) {
      errors.push({
        role_index: ri,
        company: role.company,
        title: role.title,
        error: roleResult.error,
      });
      // Leave bullets untouched for this role — original ships.
      for (let bi = 0; bi < role.bullets.length; bi++) {
        log.push({
          role_index: ri,
          company: role.company,
          title: role.title,
          bullet_index: bi,
          original: role.bullets[bi].text,
          reframed: role.bullets[bi].text,
          strategy_used: 'none',
          truth_check_passed: true,
          changed: false,
        });
      }
      continue;
    }

    // Apply reframed bullets, respecting truth check.
    const reframedMap = new Map<number, GeminiReframedBullet>();
    for (const rb of roleResult.bullets) {
      reframedMap.set(rb.original_index, rb);
    }

    for (let bi = 0; bi < role.bullets.length; bi++) {
      const original = role.bullets[bi];
      const reframed = reframedMap.get(bi);

      if (reframed && reframed.truth_check_passed && reframed.reframed_bullet.trim()) {
        const newText = reframed.reframed_bullet.trim();
        const changed = newText !== original.text;
        if (changed) {
          role.bullets[bi] = {
            ...original,
            text: newText,
          };
        }
        log.push({
          role_index: ri,
          company: role.company,
          title: role.title,
          bullet_index: bi,
          original: original.text,
          reframed: newText,
          strategy_used: normalizeStrategy(reframed.strategy_used),
          truth_check_passed: true,
          changed,
        });
      } else {
        // Truth check failed or missing — keep original.
        log.push({
          role_index: ri,
          company: role.company,
          title: role.title,
          bullet_index: bi,
          original: original.text,
          reframed: original.text,
          strategy_used: reframed ? normalizeStrategy(reframed.strategy_used) : 'none',
          truth_check_passed: reframed?.truth_check_passed ?? false,
          changed: false,
        });
      }
    }
  }

  const tailoredMod: UpdraftMod = {
    ...mod,
    experience: tailoredExperience,
  };

  return {
    ok: errors.length === 0,
    tailoredMod,
    log,
    errors,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
  };
}

// ---------------------------------------------------------------------------
// Per-role Gemini call
// ---------------------------------------------------------------------------

interface ReframeOneRoleArgs {
  sysPrompt: string;
  jdSignal: TargetJdSignal;
  target: UpdraftTargetRole;
  role: UpdraftRoleInMod;
  roleIndex: number;
}

interface ReframeOneRoleSuccess {
  ok: true;
  bullets: GeminiReframedBullet[];
  tokensIn: number;
  tokensOut: number;
}

interface ReframeOneRoleFailure {
  ok: false;
  error: string;
  tokensIn: number;
  tokensOut: number;
}

type ReframeOneRoleResult = ReframeOneRoleSuccess | ReframeOneRoleFailure;

async function reframeOneRole(args: ReframeOneRoleArgs): Promise<ReframeOneRoleResult> {
  const { sysPrompt, jdSignal, target, role } = args;

  const bulletsPayload = role.bullets.map((b: UpdraftBullet, i: number) => ({
    index: i,
    text: b.text,
  }));

  const userPayload = JSON.stringify(
    {
      role_context: {
        company: role.company,
        title: role.title,
        start_date: role.start_date,
        end_date: role.end_date,
      },
      target_role: target.role_title,
      target_company: target.company,
      target_jd_signal: jdSignal,
      bullets: bulletsPayload,
    },
    null,
    2,
  );

  const result = await callGemini<GeminiReframeRoleResponse>({
    systemPrompt: { raw: sysPrompt },
    withAuditVoice: false,
    userPrompt: userPayload,
    responseSchema: REFRAME_ROLE_SCHEMA,
    temperature: 0.3,
  });

  if (!result.ok || !result.json) {
    return {
      ok: false,
      error: result.ok ? 'no-json' : (result as { error: string }).error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  const bullets = result.json.bullets;
  if (!Array.isArray(bullets)) {
    return {
      ok: false,
      error: 'invalid-bullets-shape',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }

  return {
    ok: true,
    bullets,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_STRATEGIES = new Set<ReframeStrategy>([
  'keyword-alignment',
  'emphasis-shift',
  'abstraction-level',
  'scale-emphasis',
  'none',
]);

function normalizeStrategy(raw: string): ReframeStrategy {
  const lower = raw.toLowerCase().trim();
  if (VALID_STRATEGIES.has(lower as ReframeStrategy)) return lower as ReframeStrategy;
  return 'none';
}
