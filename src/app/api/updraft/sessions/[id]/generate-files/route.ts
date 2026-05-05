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
  recordExport,
} from '@/lib/updraft/store';
import { renderModDocx, renderResumeDocx } from '@/lib/updraft/docx-builder';
import { buildExportFilename } from '@/lib/updraft/filename';
import { lintMod } from '@/lib/updraft/lint';
import { isPdfRendererConfigured, renderPdf } from '@/lib/updraft/pdf';
import { buildExportPath, uploadExport } from '@/lib/updraft/storage';
import type {
  UpdraftDeliverable,
  UpdraftExportKind,
  UpdraftMod,
  UpdraftTargetRole,
} from '@/types';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

interface GeneratedExport {
  kind: UpdraftExportKind;
  filename: string;
  storagePath: string;
  mime: string;
  bytes: number;
}

interface PdfFailure {
  for: 'mod' | 'resume';
  error: string;
}

/**
 * POST /api/updraft/sessions/[id]/generate-files
 *
 * Stage 04 — render the chosen DOCX deliverables, run the Phase 1 lint
 * pass, persist to Storage + the exports table, log events, mark the
 * session completed.
 *
 * v0.1 ships DOCX-only (PDF deferred to v0.5 via Vercel Sandbox), one
 * template (Classic) at one density (Regular). The full template picker
 * + tailoring AI calls + Phase 2 lint rewrite all defer per PLAN.md §8.
 *
 * Lint flags are returned in the response but do NOT block export in
 * v0.1 — they surface as warnings on the download page so the user can
 * tighten manually. v0.5 routes them through SYS_ANTIPATTERN_REVIEWER.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;

  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = await readSessionForUser(sessionId, userId);
  if (!session) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Validate Stage 03 marked the MOD ready.
  const stage03 = (session.stageOutputs.stage_03 ?? {}) as {
    mod?: UpdraftMod;
    ready_for_generation?: boolean;
  };
  if (!stage03.ready_for_generation || !stage03.mod) {
    return NextResponse.json(
      { error: 'mod-not-ready', message: 'Finish Stage 03 first.' },
      { status: 409 },
    );
  }
  const mod = stage03.mod;

  const stage02 = (session.stageOutputs.stage_02 ?? {}) as {
    deliverables?: UpdraftDeliverable[];
    target?: UpdraftTargetRole | null;
    lightweight_mod?: boolean;
  };
  const deliverables = stage02.deliverables ?? [];
  const target = stage02.target ?? null;

  // Decide what to render. v0.1 ships:
  //   - mod_docx if 'mod' selected OR lightweight_mod=true (always carry the
  //     MOD as the source-of-truth doc, even in lightweight mode)
  //   - resume_docx if 'jd_build' selected
  // Cover letter (cl_docx) deferred to v0.5.
  const shouldRenderMod = deliverables.includes('mod') || stage02.lightweight_mod === true;
  const shouldRenderResume = deliverables.includes('jd_build');

  if (!shouldRenderMod && !shouldRenderResume) {
    return NextResponse.json(
      { error: 'nothing-to-render', message: 'No deliverables match v0.1 scope (Cover Letter is deferred to v0.5).' },
      { status: 409 },
    );
  }

  const lintFlags = lintMod(mod);
  const generated: GeneratedExport[] = [];
  const pdfFailures: PdfFailure[] = [];
  const pdfAvailable = isPdfRendererConfigured();
  const generatedAt = new Date();

  // Helper: PDF companion alongside each DOCX. Failures are non-blocking
  // per spec § 4.5 — DOCX still ships; UI surfaces a banner indicating
  // which PDFs didn't make it.
  const persistPdfFor = async (
    docxBytes: Buffer,
    pdfFilename: string,
    pdfKind: 'mod_pdf' | 'resume_pdf',
    label: 'mod' | 'resume',
  ): Promise<void> => {
    if (!pdfAvailable) {
      pdfFailures.push({ for: label, error: 'UPDRAFT_GOOGLE_SA_JSON_B64 not configured' });
      return;
    }
    const result = await renderPdf({
      docxBytes,
      filename: pdfFilename.replace(/\.pdf$/, '.docx'),
    });
    if (!result.ok) {
      pdfFailures.push({ for: label, error: result.error });
      return;
    }
    const path = buildExportPath({ userId, sessionId, filename: pdfFilename });
    const upload = await uploadExport({
      path,
      bytes: result.pdfBytes,
      mime: PDF_MIME,
    });
    if (!upload.ok) {
      pdfFailures.push({ for: label, error: `upload-failed: ${upload.error ?? 'unknown'}` });
      return;
    }
    await recordExport({
      sessionId,
      kind: pdfKind,
      filename: pdfFilename,
      storagePath: path,
      mime: PDF_MIME,
      bytes: result.bytes,
    });
    generated.push({
      kind: pdfKind,
      filename: pdfFilename,
      storagePath: path,
      mime: PDF_MIME,
      bytes: result.bytes,
    });
  };

  try {
    if (shouldRenderMod) {
      const docxName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'MOD',
        date: generatedAt,
        ext: 'docx',
      });
      const buf = await renderModDocx({ mod });
      const path = buildExportPath({ userId, sessionId, filename: docxName });
      const upload = await uploadExport({ path, bytes: buf, mime: DOCX_MIME });
      if (!upload.ok) throw new Error(`mod upload failed: ${upload.error ?? 'unknown'}`);
      await recordExport({
        sessionId,
        kind: 'mod_docx',
        filename: docxName,
        storagePath: path,
        mime: DOCX_MIME,
        bytes: buf.length,
      });
      generated.push({ kind: 'mod_docx', filename: docxName, storagePath: path, mime: DOCX_MIME, bytes: buf.length });

      const pdfName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'MOD',
        date: generatedAt,
        ext: 'pdf',
      });
      await persistPdfFor(buf, pdfName, 'mod_pdf', 'mod');
    }

    if (shouldRenderResume) {
      const docxName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'Resume',
        targetRole: target?.role_title ?? null,
        company: target?.company ?? null,
        date: generatedAt,
        ext: 'docx',
      });
      const buf = await renderResumeDocx({ mod, target });
      const path = buildExportPath({ userId, sessionId, filename: docxName });
      const upload = await uploadExport({ path, bytes: buf, mime: DOCX_MIME });
      if (!upload.ok) throw new Error(`resume upload failed: ${upload.error ?? 'unknown'}`);
      await recordExport({
        sessionId,
        kind: 'resume_docx',
        filename: docxName,
        storagePath: path,
        mime: DOCX_MIME,
        bytes: buf.length,
      });
      generated.push({ kind: 'resume_docx', filename: docxName, storagePath: path, mime: DOCX_MIME, bytes: buf.length });

      const pdfName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'Resume',
        targetRole: target?.role_title ?? null,
        company: target?.company ?? null,
        date: generatedAt,
        ext: 'pdf',
      });
      await persistPdfFor(buf, pdfName, 'resume_pdf', 'resume');
    }
  } catch (err) {
    console.error('updraft.generate-files:', err);
    await logEvent({
      sessionId,
      stage: '04',
      eventType: 'export_failed',
      data: {
        error: err instanceof Error ? err.message : 'unknown',
        owner: isUpdraftOwner(request),
      },
    });
    return NextResponse.json(
      { error: 'Could not generate files. Try again, or reach out if it persists.' },
      { status: 500 },
    );
  }

  // Persist Stage 04 output + mark session completed.
  await patchSessionStage({
    sessionId,
    userId,
    stageKey: 'stage_04',
    payload: {
      template_selected: 'classic',
      density_selected: 'regular',
      lint_flags_count: lintFlags.length,
      lint_flags: lintFlags,
      generated_at: generatedAt.toISOString(),
    },
    status: 'completed',
  });

  for (const e of generated) {
    await logEvent({
      sessionId,
      stage: '04',
      eventType: 'export_generated',
      data: {
        kind: e.kind,
        bytes: e.bytes,
        filename: e.filename,
        owner: isUpdraftOwner(request),
      },
    });
  }
  if (pdfFailures.length > 0) {
    // PDF failure is non-blocking per spec — DOCX still ships. Log every
    // failure so we can see how often the PDF pipeline lets us down,
    // independent of how often DOCX itself works.
    await logEvent({
      sessionId,
      stage: '04',
      eventType: 'pdf_failed',
      data: {
        failures: pdfFailures,
        renderer_configured: pdfAvailable,
      },
    });
  }
  if (lintFlags.length > 0) {
    await logEvent({
      sessionId,
      stage: '04',
      eventType: 'lint_flags',
      data: {
        count: lintFlags.length,
        categories: Array.from(new Set(lintFlags.map((f) => f.category))),
      },
    });
  }

  return NextResponse.json({
    generated: generated.map((g) => ({
      kind: g.kind,
      filename: g.filename,
      bytes: g.bytes,
    })),
    lintFlags,
    pdfFailures: pdfFailures.length > 0 ? pdfFailures : undefined,
  });
}
