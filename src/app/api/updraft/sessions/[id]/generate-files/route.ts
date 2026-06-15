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
import { canMakeAiCall, recordQuotaUsage } from '@/lib/updraft/quotas';
import {
  renderCoverLetterDocx,
  renderModDocx,
  renderResumeDocx,
} from '@/lib/updraft/docx-builder';
import {
  renderCoverLetterPdf,
  renderModPdf,
  renderResumePdf,
} from '@/lib/updraft/pdf-builder';
import { reframeBullets } from '@/lib/updraft/bullet-reframer';
import type { ReframeLogEntry, ReframeRoleError } from '@/lib/updraft/bullet-reframer';
import { draftCoverLetter } from '@/lib/updraft/cover-letter-generator';
import { buildExportFilename } from '@/lib/updraft/filename';
import { lintMod } from '@/lib/updraft/lint';
import { buildExportPath, uploadExport } from '@/lib/updraft/storage';
import type {
  UpdraftDeliverable,
  UpdraftExportKind,
  UpdraftMatchAnalysis,
  UpdraftMod,
  UpdraftTargetRole,
  UpdraftTier,
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
  for: 'mod' | 'resume' | 'cover_letter';
  error: string;
}

interface CoverLetterMeta {
  word_count: number;
  hook_type: string | null;
  p3_branch: string | null;
  close_type: string | null;
}

/**
 * POST /api/updraft/sessions/[id]/generate-files
 *
 * Stage 04 — render the chosen DOCX + PDF deliverables, run the Phase 1
 * lint pass on the MOD, persist to Storage + the exports table, log
 * events, mark the session completed.
 *
 * v0.1.5 + Cover Letter + Bullet Reframing: MOD / Resume / Cover Letter,
 * one template (Classic) at one density (Regular). Resume bullets are
 * reframed against the target JD via SYS_BULLET_REFRAMER (one AI call per
 * role) when a target + JD text is present. Cover letter goes through
 * SYS_COVER_LETTER_DRAFTER (one AI call). Both are non-blocking — failure
 * falls back to untailored bullets / no CL, other deliverables still ship.
 * Template picker + Phase 2 lint rewrite defer.
 *
 * Body accepts an optional `selection: UpdraftExportKind[]` to scope this
 * round of generation. Absent / empty → render every kind valid for the
 * Stage 02 deliverables (full default, backwards compatible). Present →
 * render only the named kinds. Lets the UI surface a per-deliverable +
 * per-format picker for partial regeneration ("just the CL PDF this
 * round"). Re-rendering an existing kind overwrites the prior storage
 * file via recordExport's upsert semantics.
 *
 * Lint flags are returned in the response but do NOT block export — they
 * surface as warnings on the download page so the user can tighten
 * manually. v0.5+ routes them through SYS_ANTIPATTERN_REVIEWER.
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

  // Optional selection — narrows which kinds get rendered this round.
  // Empty / missing → fall through to "render every kind allowed by
  // Stage 02 deliverables" (the v0.1.5 default).
  let requestedKinds: Set<UpdraftExportKind> | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      selection?: unknown;
    };
    if (Array.isArray(body.selection) && body.selection.length > 0) {
      const VALID = new Set<UpdraftExportKind>([
        'mod_docx', 'mod_pdf', 'mod_md',
        'resume_docx', 'resume_pdf',
        'cl_docx', 'cl_pdf',
      ]);
      requestedKinds = new Set();
      for (const k of body.selection) {
        if (typeof k === 'string' && VALID.has(k as UpdraftExportKind)) {
          requestedKinds.add(k as UpdraftExportKind);
        }
      }
      if (requestedKinds.size === 0) requestedKinds = null;
    }
  } catch {
    requestedKinds = null;
  }
  const wants = (kind: UpdraftExportKind): boolean =>
    requestedKinds === null || requestedKinds.has(kind);

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
    match_analysis?: UpdraftMatchAnalysis | null;
  };
  const deliverables = stage02.deliverables ?? [];
  const target = stage02.target ?? null;
  const matchAnalysis = stage02.match_analysis ?? null;

  // Decide what to render:
  //   - mod_docx if 'mod' selected OR lightweight_mod=true (always carry
  //     the MOD as the source-of-truth doc, even in lightweight mode)
  //   - resume_docx if 'jd_build' selected
  //   - cl_docx if 'cover_letter' selected (requires target — Stage 02
  //     gates this; defensive check below)
  const shouldRenderMod = deliverables.includes('mod') || stage02.lightweight_mod === true;
  const shouldRenderResume = deliverables.includes('jd_build');
  const shouldRenderCoverLetter = deliverables.includes('cover_letter');

  if (!shouldRenderMod && !shouldRenderResume && !shouldRenderCoverLetter) {
    return NextResponse.json(
      { error: 'nothing-to-render', message: 'Pick at least one deliverable in Stage 02.' },
      { status: 409 },
    );
  }

  if (shouldRenderCoverLetter && !target) {
    return NextResponse.json(
      { error: 'cover-letter-needs-target', message: 'A cover letter needs a target role — go back to Stage 02 and add the JD.' },
      { status: 409 },
    );
  }

  const lintFlags = lintMod(mod);
  const generated: GeneratedExport[] = [];
  const pdfFailures: PdfFailure[] = [];
  const generatedAt = new Date();
  let coverLetterMeta: CoverLetterMeta | null = null;
  let coverLetterError: string | null = null;
  let reframeLog: ReframeLogEntry[] | null = null;
  let reframeErrors: ReframeRoleError[] | null = null;
  let reframeError: string | null = null;

  // Helper: render + persist a PDF natively from the structured data (NOT by
  // converting the DOCX). renderFn produces the PDF bytes via pdf-builder.tsx.
  // This runs in-process with no external service, so it effectively never
  // fails — but we keep the non-blocking failure path (DOCX still ships, UI
  // shows a banner) as a defensive net against an unexpected render error.
  const persistPdfFor = async (
    renderFn: () => Promise<Buffer>,
    pdfFilename: string,
    pdfKind: 'mod_pdf' | 'resume_pdf' | 'cl_pdf',
    label: 'mod' | 'resume' | 'cover_letter',
  ): Promise<void> => {
    let pdfBytes: Buffer;
    try {
      pdfBytes = await renderFn();
    } catch (err) {
      pdfFailures.push({
        for: label,
        error: `render-failed: ${err instanceof Error ? err.message : 'unknown'}`,
      });
      return;
    }
    const path = buildExportPath({ userId, sessionId, filename: pdfFilename });
    const upload = await uploadExport({ path, bytes: pdfBytes, mime: PDF_MIME });
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
      bytes: pdfBytes.length,
    });
    generated.push({
      kind: pdfKind,
      filename: pdfFilename,
      storagePath: path,
      mime: PDF_MIME,
      bytes: pdfBytes.length,
    });
  };

  try {
    // MOD — render DOCX in memory only if either MOD format is requested.
    // PDF derives from the same DOCX, so we always have it available even
    // if the user only asked for the PDF (we just don't persist the DOCX).
    const wantModDocx = shouldRenderMod && wants('mod_docx');
    const wantModPdf  = shouldRenderMod && wants('mod_pdf');
    if (wantModDocx || wantModPdf) {
      const docxName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'MOD',
        date: generatedAt,
        ext: 'docx',
      });
      const buf = await renderModDocx({ mod });
      if (wantModDocx) {
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
      }
      if (wantModPdf) {
        const pdfName = buildExportFilename({
          candidateName: mod.identity.name,
          type: 'MOD',
          date: generatedAt,
          ext: 'pdf',
        });
        await persistPdfFor(() => renderModPdf({ mod }), pdfName, 'mod_pdf', 'mod');
      }
    }

    // Resume — optionally reframe bullets against the JD before rendering.
    // Reframing is non-blocking: failure falls back to the untailored MOD
    // and surfaces a banner (same policy as CL draft / PDF failures).
    const wantResumeDocx = shouldRenderResume && wants('resume_docx');
    const wantResumePdf  = shouldRenderResume && wants('resume_pdf');
    if (wantResumeDocx || wantResumePdf) {
      // The MOD used for resume renders — tailored if reframing succeeds,
      // otherwise the canonical MOD ships untouched.
      let resumeMod: UpdraftMod = mod;

      if (target && target.jd_text) {
        const reframeQuota = await canMakeAiCall(request);
        if (!reframeQuota.allowed) {
          reframeError = reframeQuota.message ?? 'Capacity limit reached — bullets not tailored.';
        } else {
          try {
            const rfResult = await reframeBullets({ mod, target, matchAnalysis });
            await recordQuotaUsage({
              tokensIn: rfResult.tokensIn,
              tokensOut: rfResult.tokensOut,
            });
            reframeLog = rfResult.log;
            reframeErrors = rfResult.errors.length > 0 ? rfResult.errors : null;

            if (rfResult.ok) {
              resumeMod = rfResult.tailoredMod;
              // Run lint over the reframed bullets as a safety net.
              const tailoredLintFlags = lintMod(rfResult.tailoredMod);
              if (tailoredLintFlags.length > lintFlags.length) {
                // Reframing introduced new lint issues — fall back to untailored.
                resumeMod = mod;
                reframeError = 'lint-regression';
                await logEvent({
                  sessionId,
                  stage: '04',
                  eventType: 'bullet_reframe_failed',
                  data: {
                    error: 'lint-regression',
                    original_lint_count: lintFlags.length,
                    tailored_lint_count: tailoredLintFlags.length,
                    owner: isUpdraftOwner(request),
                  },
                });
              }
            } else {
              reframeError = rfResult.errors.map((e) => `${e.title}: ${e.error}`).join('; ');
              await logEvent({
                sessionId,
                stage: '04',
                eventType: 'bullet_reframe_failed',
                data: {
                  error: reframeError,
                  role_errors: rfResult.errors,
                  tokensIn: rfResult.tokensIn,
                  tokensOut: rfResult.tokensOut,
                  owner: isUpdraftOwner(request),
                },
              });
            }
          } catch (err) {
            reframeError = err instanceof Error ? err.message : 'unknown';
            await logEvent({
              sessionId,
              stage: '04',
              eventType: 'bullet_reframe_failed',
              data: {
                error: reframeError,
                owner: isUpdraftOwner(request),
              },
            });
          }
        }
      }

      const docxName = buildExportFilename({
        candidateName: mod.identity.name,
        type: 'Resume',
        targetRole: target?.role_title ?? null,
        company: target?.company ?? null,
        date: generatedAt,
        ext: 'docx',
      });
      const buf = await renderResumeDocx({ mod: resumeMod, target });
      if (wantResumeDocx) {
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
      }
      if (wantResumePdf) {
        const pdfName = buildExportFilename({
          candidateName: mod.identity.name,
          type: 'Resume',
          targetRole: target?.role_title ?? null,
          company: target?.company ?? null,
          date: generatedAt,
          ext: 'pdf',
        });
        await persistPdfFor(() => renderResumePdf({ mod: resumeMod, target }), pdfName, 'resume_pdf', 'resume');
      }
    }

    // Cover Letter — drafted via SYS_COVER_LETTER_DRAFTER, then rendered
    // through the same Classic primitives. Failure to draft is non-blocking
    // for the rest of the deliverables (matches the PDF-failure policy).
    // Quota gate runs only when CL is selected — MOD + Resume don't call AI.
    //
    // The selection picker treats CL DOCX + PDF as a unit: re-drafting the
    // letter for one format only would cause drift between the persisted
    // DOCX and PDF (different runs of the model produce different text).
    // So we draft once and emit whichever CL formats the user requested
    // — but if they ask for a CL at all, both formats refresh from the
    // same draft.
    const wantClDocx = shouldRenderCoverLetter && wants('cl_docx');
    const wantClPdf  = shouldRenderCoverLetter && wants('cl_pdf');
    if ((wantClDocx || wantClPdf) && target) {
      const quota = await canMakeAiCall(request);
      if (!quota.allowed) {
        coverLetterError = quota.message ?? 'Capacity limit reached.';
      } else {
        const tier = (session.tier as UpdraftTier | null | undefined) ?? null;
        if (!tier) {
          coverLetterError = 'tier-missing';
        } else {
          const draftResult = await draftCoverLetter({
            mod,
            target,
            matchAnalysis,
            tier,
          });
          await recordQuotaUsage({
            tokensIn: draftResult.tokensIn,
            tokensOut: draftResult.tokensOut,
          });

          if (!draftResult.ok) {
            coverLetterError = draftResult.error;
            await logEvent({
              sessionId,
              stage: '04',
              eventType: 'cover_letter_failed',
              data: {
                error: draftResult.error,
                tokensIn: draftResult.tokensIn,
                tokensOut: draftResult.tokensOut,
                owner: isUpdraftOwner(request),
              },
            });
          } else {
            const draft = draftResult.draft;
            coverLetterMeta = {
              word_count: draft.wordCount,
              hook_type:  draft.hookType,
              p3_branch:  draft.p3Branch,
              close_type: draft.closeType,
            };

            const clDocxName = buildExportFilename({
              candidateName: mod.identity.name,
              type: 'CoverLetter',
              targetRole: target.role_title,
              company: target.company,
              date: generatedAt,
              ext: 'docx',
            });
            const clBuf = await renderCoverLetterDocx({
              identity: mod.identity,
              greeting: draft.greeting,
              paragraphs: draft.paragraphs,
              signoff: draft.signoff,
              generatedAt,
            });
            if (wantClDocx) {
              const clPath = buildExportPath({ userId, sessionId, filename: clDocxName });
              const clUpload = await uploadExport({ path: clPath, bytes: clBuf, mime: DOCX_MIME });
              if (!clUpload.ok) throw new Error(`cover letter upload failed: ${clUpload.error ?? 'unknown'}`);
              await recordExport({
                sessionId,
                kind: 'cl_docx',
                filename: clDocxName,
                storagePath: clPath,
                mime: DOCX_MIME,
                bytes: clBuf.length,
              });
              generated.push({
                kind: 'cl_docx',
                filename: clDocxName,
                storagePath: clPath,
                mime: DOCX_MIME,
                bytes: clBuf.length,
              });
            }
            if (wantClPdf) {
              const clPdfName = buildExportFilename({
                candidateName: mod.identity.name,
                type: 'CoverLetter',
                targetRole: target.role_title,
                company: target.company,
                date: generatedAt,
                ext: 'pdf',
              });
              await persistPdfFor(
                () =>
                  renderCoverLetterPdf({
                    identity: mod.identity,
                    greeting: draft.greeting,
                    paragraphs: draft.paragraphs,
                    signoff: draft.signoff,
                    generatedAt,
                  }),
                clPdfName,
                'cl_pdf',
                'cover_letter',
              );
            }
          }
        }
      }
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
      cover_letter_meta:  coverLetterMeta,
      cover_letter_error: coverLetterError,
      reframe_log:    reframeLog,
      reframe_errors: reframeErrors,
      reframe_error:  reframeError,
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
    // PDF failure is non-blocking — DOCX still ships. Native PDF generation
    // shouldn't fail in practice, so any entry here is worth investigating.
    await logEvent({
      sessionId,
      stage: '04',
      eventType: 'pdf_failed',
      data: { failures: pdfFailures },
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
    pdfFailures:        pdfFailures.length > 0 ? pdfFailures : undefined,
    coverLetterError:   coverLetterError ?? undefined,
    coverLetterMeta:    coverLetterMeta  ?? undefined,
    reframeError:       reframeError ?? undefined,
  });
}
