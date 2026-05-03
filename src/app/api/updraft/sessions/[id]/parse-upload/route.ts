import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME, isUpdraftOwner } from '@/lib/updraft/auth';
import {
  logEvent,
  patchSessionStage,
  readSessionForUser,
} from '@/lib/updraft/store';
import { canMakeAiCall, recordQuotaUsage } from '@/lib/updraft/quotas';
import { extractResumeText, parseResumeFromText } from '@/lib/updraft/resume-parser';

/**
 * POST /api/updraft/sessions/[id]/parse-upload
 *
 * Stage 01.2A end-to-end: multipart file upload → text extraction
 * (deterministic) → SYS_RESUME_PARSER (AI, silent extraction). On success
 * persists resume_raw + resume_parsed + path='upload' to stage_01 and
 * returns the parsed JSON for client display.
 *
 * On extraction failure (image-only PDF, unsupported type, too-large)
 * returns 400 with a user-actionable message — does NOT bill quota or
 * persist anything.
 *
 * On AI parse failure returns 502 with a generic message and persists
 * resume_raw so the user could retry without re-uploading.
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

  // Quota — only the AI call burns budget; extraction is local CPU
  const quota = await canMakeAiCall(request);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Capacity limit reached.', reason: quota.reason },
      { status: 429 },
    );
  }

  // Multipart parse
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid-multipart' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'no-file' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  // Step 1 — deterministic extraction
  const extracted = await extractResumeText(buffer);
  if (!extracted.ok) {
    await logEvent({
      sessionId,
      stage: '01',
      eventType: 'extract_failed',
      data: { error: extracted.error, fileType: extracted.fileType ?? null, size: buffer.length },
    });
    return NextResponse.json(
      { error: extracted.message, code: extracted.error },
      { status: 400 },
    );
  }

  // Step 2 — AI parse
  const aiResult = await parseResumeFromText(extracted.text);
  await recordQuotaUsage({
    tokensIn: aiResult.tokensIn,
    tokensOut: aiResult.tokensOut,
  });

  if (!aiResult.ok) {
    // Persist resume_raw + path so the user can retry parsing without
    // re-uploading. resume_parsed stays null until we have a clean parse.
    await patchSessionStage({
      sessionId,
      userId,
      stageKey: 'stage_01',
      payload: {
        path: 'upload',
        resume_raw: extracted.text,
        resume_parsed: null,
      },
      path: 'upload',
    });
    await logEvent({
      sessionId,
      stage: '01',
      eventType: 'parse_failed',
      data: {
        error: aiResult.error,
        tokensIn: aiResult.tokensIn,
        tokensOut: aiResult.tokensOut,
        owner: isUpdraftOwner(request),
      },
    });
    return NextResponse.json(
      { error: 'AI parsing failed. Try again, or pick "Talk it through".' },
      { status: 502 },
    );
  }

  // Persist resume_raw + resume_parsed + path
  await patchSessionStage({
    sessionId,
    userId,
    stageKey: 'stage_01',
    payload: {
      path: 'upload',
      resume_raw: extracted.text,
      resume_parsed: aiResult.parsed,
    },
    path: 'upload',
  });

  await logEvent({
    sessionId,
    stage: '01',
    eventType: 'parse_succeeded',
    data: {
      fileType: extracted.fileType,
      tokensIn: aiResult.tokensIn,
      tokensOut: aiResult.tokensOut,
      retried: aiResult.retried,
      owner: isUpdraftOwner(request),
    },
  });

  return NextResponse.json({
    parsed: aiResult.parsed,
    fileType: extracted.fileType,
  });
}
