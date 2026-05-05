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
import { parseResumeFromUpload } from '@/lib/updraft/resume-parser';

/**
 * POST /api/updraft/sessions/[id]/parse-upload
 *
 * Stage 01.2A: multipart upload → resume parsing → persist to stage_01.
 *
 * As of 2026-05-04 the parser path is single-step: parseResumeFromUpload()
 * dispatches by file-type internally and ends with structured JSON. PDFs
 * go to Gemini directly (handles image-based PDFs via OCR for free); DOCX
 * goes through mammoth → Gemini text-mode.
 *
 * Failure modes:
 *   - 400 for size/type validation, "empty" file, mammoth DOCX-extract failure.
 *     No quota burn, no persistence.
 *   - 502 for AI parse failure (Gemini returned error or malformed JSON
 *     after retry). Tokens billed are still recorded; we persist nothing
 *     to stage_01 since there's no resume_raw to reuse on retry.
 *   - 200 on success — persists path='upload' + resume_parsed.
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

  // Quota — only the AI call burns budget; mammoth/file-validation is free
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

  const result = await parseResumeFromUpload(buffer);

  // Tokens are recorded whether the call succeeded or failed (Gemini
  // charges either way). Validation failures (empty, too-large, etc.)
  // never reach the model so tokens stay 0.
  await recordQuotaUsage({
    tokensIn: result.ok ? result.tokensIn : (result.tokensIn ?? 0),
    tokensOut: result.ok ? result.tokensOut : (result.tokensOut ?? 0),
  });

  if (!result.ok) {
    // Validation failures (empty / too-large / unsupported / docx-extract):
    // 400 with a user-actionable message. Don't persist anything.
    if (
      result.error === 'empty' ||
      result.error === 'too-large' ||
      result.error === 'unsupported-type' ||
      result.error === 'docx-extract-failed'
    ) {
      await logEvent({
        sessionId,
        stage: '01',
        eventType: 'extract_failed',
        data: {
          error: result.error,
          fileType: result.fileType ?? null,
          size: buffer.length,
        },
      });
      return NextResponse.json(
        { error: result.message, code: result.error },
        { status: 400 },
      );
    }

    // AI parse failure: 502, log with the token cost.
    await logEvent({
      sessionId,
      stage: '01',
      eventType: 'parse_failed',
      data: {
        error: result.error,
        fileType: result.fileType ?? null,
        tokensIn: result.tokensIn ?? 0,
        tokensOut: result.tokensOut ?? 0,
        owner: isUpdraftOwner(request),
      },
    });
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  // Success — persist + log
  await patchSessionStage({
    sessionId,
    userId,
    stageKey: 'stage_01',
    payload: {
      path: 'upload',
      resume_parsed: result.parsed,
    },
    path: 'upload',
  });

  await logEvent({
    sessionId,
    stage: '01',
    eventType: 'parse_succeeded',
    data: {
      fileType: result.fileType,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      retried: result.retried,
      owner: isUpdraftOwner(request),
    },
  });

  return NextResponse.json({
    parsed: result.parsed,
    fileType: result.fileType,
  });
}
