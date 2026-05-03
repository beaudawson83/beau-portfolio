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

  // Body validation — only jd_text is required. role_title and company
  // are optional user overrides; if not supplied, the analyzer extracts
  // them from the JD itself.
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const t = body.target;
  if (!t || !t.jd_text?.trim()) {
    return NextResponse.json({ error: 'missing-jd-text' }, { status: 400 });
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

  // Run the analyzer — analyzer extracts target metadata from the JD as part
  // of its single Gemini call (see TARGET_EXTRACTION_INSTRUCTION).
  const userSupplied: Partial<UpdraftTargetRole> = {
    role_title:         normalize(t.role_title) ?? undefined,
    company:            normalize(t.company) ?? undefined,
    industry:           normalize(t.industry) ?? undefined,
    seniority:          normalize(t.seniority) ?? undefined,
    location:           normalize(t.location) ?? undefined,
    compensation_range: normalize(t.compensation_range) ?? undefined,
  };

  const result = await analyzeMatch({
    jdText: t.jd_text.trim(),
    resumeParsed: stage01.resume_parsed ?? null,
    tier,
  });

  await recordQuotaUsage({
    tokensIn:  result.tokensIn,
    tokensOut: result.tokensOut,
  });

  if (!result.ok) {
    // No AI extraction available on failure. Persist whatever the user
    // supplied (plus the JD) so they can retry without re-entering the
    // form. Empty strings are fine — the user can override on retry.
    const failureTarget: UpdraftTargetRole = {
      role_title:         userSupplied.role_title ?? '',
      company:            userSupplied.company ?? '',
      industry:           userSupplied.industry ?? null,
      seniority:          userSupplied.seniority ?? null,
      location:           userSupplied.location ?? null,
      compensation_range: userSupplied.compensation_range ?? null,
      jd_text:            t.jd_text.trim(),
    };
    await patchSessionStage({
      sessionId,
      userId,
      stageKey: 'stage_02',
      payload: { target: failureTarget, match_analysis: null, confidence_band: null },
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

  // Merge user-supplied fields with AI-extracted fields. User-supplied
  // values win when present (the user told us explicitly). AI extraction
  // fills in anything the user left blank.
  const ai = result.analysis.extracted_target ?? null;
  const target: UpdraftTargetRole = {
    role_title:         userSupplied.role_title         ?? ai?.role_title         ?? '',
    company:            userSupplied.company            ?? ai?.company            ?? '',
    industry:           userSupplied.industry           ?? ai?.industry           ?? null,
    seniority:          userSupplied.seniority          ?? ai?.seniority          ?? null,
    location:           userSupplied.location           ?? ai?.location           ?? null,
    compensation_range: userSupplied.compensation_range ?? ai?.compensation_range ?? null,
    jd_text:            t.jd_text.trim(),
  };

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
      ai_extracted_role: !userSupplied.role_title && Boolean(ai?.role_title),
      ai_extracted_company: !userSupplied.company && Boolean(ai?.company),
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
