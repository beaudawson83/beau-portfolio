import { NextRequest, NextResponse } from 'next/server';
import { isUpdraftOwner, readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import {
  logEvent,
  patchSessionStage,
  readSessionForUser,
} from '@/lib/updraft/store';
import { canMakeAiCall, recordQuotaUsage } from '@/lib/updraft/quotas';
import { analyzeMatch } from '@/lib/updraft/match-analyzer';
import type { ParsedResume, UpdraftTargetRole, UpdraftTier } from '@/types';

interface RequestBody {
  target?: Partial<UpdraftTargetRole>;
}

const MAX_JD_CHARS = 50_000;

/**
 * POST /api/updraft/sessions/[id]/match-analyze
 *
 * Stage 02.3 endpoint. Body: { target: { role_title, company, jd_text, ... } }.
 * Server reads stage_01 from the session for resume_parsed + tier (we don't
 * trust client-supplied copies of those — they could be stale or tampered).
 * Runs SYS_MATCH_ANALYZER, persists the target + match_analysis +
 * confidence_band into stage_02, returns the analysis to the client.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;

  // Auth + ownership
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = readSessionCookieValue(cookieValue);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const session = await readSessionForUser(sessionId, userId);
  if (!session) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Stage 01 must be far enough along that we have the bits we need.
  const stage01 = (session.stageOutputs.stage_01 ?? {}) as {
    resume_parsed?: ParsedResume | null;
    tier?: UpdraftTier;
  };
  const tier = (stage01.tier ?? session.tier) as UpdraftTier | null | undefined;
  if (!tier) {
    return NextResponse.json({ error: 'stage-01-incomplete' }, { status: 409 });
  }

  // Body validation
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const t = body.target;
  if (!t || !t.role_title?.trim() || !t.company?.trim() || !t.jd_text?.trim()) {
    return NextResponse.json({ error: 'missing-required-target-fields' }, { status: 400 });
  }
  if (t.jd_text.length > MAX_JD_CHARS) {
    return NextResponse.json(
      { error: `JD exceeds ${MAX_JD_CHARS.toLocaleString()} characters.` },
      { status: 400 },
    );
  }

  // Quota
  const quota = await canMakeAiCall(request);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Capacity limit reached.', reason: quota.reason },
      { status: 429 },
    );
  }

  // Build the persisted target (normalize empty optional fields to null).
  const target: UpdraftTargetRole = {
    role_title:         t.role_title.trim(),
    company:            t.company.trim(),
    industry:           normalize(t.industry),
    seniority:          normalize(t.seniority),
    location:           normalize(t.location),
    compensation_range: normalize(t.compensation_range),
    jd_text:            t.jd_text.trim(),
  };

  // Run the analyzer
  const result = await analyzeMatch({
    jdText: target.jd_text,
    resumeParsed: stage01.resume_parsed ?? null,
    tier,
  });

  await recordQuotaUsage({
    tokensIn:  result.tokensIn,
    tokensOut: result.tokensOut,
  });

  if (!result.ok) {
    // Persist the target so the user can retry without re-entering the form.
    await patchSessionStage({
      sessionId,
      userId,
      stageKey: 'stage_02',
      payload: { target, match_analysis: null, confidence_band: null },
    });
    await logEvent({
      sessionId,
      stage: '02',
      eventType: 'analyze_failed',
      data: {
        error: result.error,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        owner: isUpdraftOwner(request),
      },
    });
    return NextResponse.json(
      { error: 'AI analysis failed. Try again, or revise the JD.' },
      { status: 502 },
    );
  }

  // Persist target + analysis + confidence band
  await patchSessionStage({
    sessionId,
    userId,
    stageKey: 'stage_02',
    payload: {
      target,
      match_analysis: result.analysis,
      confidence_band: result.analysis.confidence_band ?? null,
    },
  });

  await logEvent({
    sessionId,
    stage: '02',
    eventType: 'analyze_succeeded',
    data: {
      overall_match_pct: result.analysis.overall_match_pct,
      confidence_band: result.analysis.confidence_band,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      retried: result.retried,
      owner: isUpdraftOwner(request),
    },
  });

  return NextResponse.json({
    target,
    analysis: result.analysis,
  });
}

function normalize(s: string | null | undefined): string | null {
  if (s === undefined || s === null) return null;
  const trimmed = s.trim();
  return trimmed === '' ? null : trimmed;
}
