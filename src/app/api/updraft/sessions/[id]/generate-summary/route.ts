import { NextRequest, NextResponse } from 'next/server';
import {
  isUpdraftOwner,
  readSessionCookieValue,
  SESSION_COOKIE_NAME,
} from '@/lib/updraft/auth';
import {
  logEvent,
  patchSessionStage,
  readSessionForUser,
} from '@/lib/updraft/store';
import { canMakeAiCall, recordQuotaUsage } from '@/lib/updraft/quotas';
import { generateSummary } from '@/lib/updraft/summary-generator';
import type {
  UpdraftMod,
  UpdraftTargetRole,
  UpdraftTier,
} from '@/types';

/**
 * POST /api/updraft/sessions/[id]/generate-summary
 *
 * Stage 03 closing phase. Reads the in-progress MOD off
 * stage_outputs.stage_03 (or falls back to the parsed resume from
 * stage_01 for first-time-summary), assembles the inputs that
 * SYS_SUMMARY_GENERATOR expects, and runs the call. On success, persists
 * the generated summary to stage_03.mod.summary AND returns it so the
 * client can preview before the user accepts.
 *
 * The user can edit the generated text in the UI; whatever they save
 * later via the generic stage/[n] PATCH overwrites this draft.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;

  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const session = await readSessionForUser(sessionId, userId);
  if (!session) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const stage03 = (session.stageOutputs.stage_03 ?? {}) as { mod?: UpdraftMod };
  const mod = stage03.mod;
  if (!mod || !mod.experience || mod.experience.length === 0) {
    return NextResponse.json(
      {
        error: 'mod-empty',
        message:
          "I need at least one role with bullets before I can draft a summary.",
      },
      { status: 409 },
    );
  }

  const tier = (session.tier as UpdraftTier | null | undefined) ?? null;
  if (!tier) {
    return NextResponse.json(
      { error: 'stage-01-incomplete' },
      { status: 409 },
    );
  }

  const stage02 = (session.stageOutputs.stage_02 ?? {}) as { target?: UpdraftTargetRole | null };
  const targetRoleTitle = stage02.target?.role_title ?? null;

  const quota = await canMakeAiCall(request);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Capacity limit reached.', reason: quota.reason },
      { status: 429 },
    );
  }

  // The summary_seed accumulates user input over the conversational
  // interview in the spec. v0.1 doesn't run that interview, so we build
  // a serviceable seed from whatever Tier 2 deepening fields the user
  // filled in — through_line, tools_stack, interview_objections.
  const seedParts: string[] = [];
  if (mod.through_line?.trim()) {
    seedParts.push(`Cross-role through-line: ${mod.through_line.trim()}`);
  }
  if (mod.tools_stack?.trim()) {
    seedParts.push(`Tools / stack: ${mod.tools_stack.trim()}`);
  }
  if (mod.interview_objections && mod.interview_objections.length > 0) {
    seedParts.push(
      `Things to preempt on the resume: ${mod.interview_objections.join('; ')}`,
    );
  }
  const summarySeed = seedParts.length
    ? seedParts.join('\n\n')
    : 'No deepening notes captured — synthesize from experience alone.';

  const result = await generateSummary({
    summarySeed,
    tier,
    targetRoleTitle,
    experience: mod.experience,
    leadershipBrand: mod.leadership_brand ?? null,
    transformationArc: mod.transformation_arc ?? null,
  });

  await recordQuotaUsage({
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  });

  if (!result.ok) {
    await logEvent({
      sessionId,
      stage: '03',
      eventType: 'summary_failed',
      data: {
        error: result.error,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        owner: isUpdraftOwner(request),
      },
    });
    return NextResponse.json(
      {
        error: 'Summary generation failed. Try again, or write your own.',
        detail: result.error.slice(0, 240),
      },
      { status: 502 },
    );
  }

  // Persist the generated summary + the seed we used to produce it (for
  // future re-generation context) directly into mod.summary / mod.summary_seed.
  await patchSessionStage({
    sessionId,
    userId,
    stageKey: 'stage_03',
    payload: {
      mod: { ...mod, summary: result.summary, summary_seed: summarySeed },
    },
  });

  await logEvent({
    sessionId,
    stage: '03',
    eventType: 'summary_succeeded',
    data: {
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      retried: result.retried,
      owner: isUpdraftOwner(request),
    },
  });

  return NextResponse.json({ summary: result.summary });
}
