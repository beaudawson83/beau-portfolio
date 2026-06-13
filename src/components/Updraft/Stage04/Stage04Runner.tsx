'use client';

// Stage 04 — Generate.
//
// Renders the chosen DOCX + PDF deliverables from the MOD Stage 03
// produced. One template (Classic) at one density (Regular), Phase 1
// lint pass with non-blocking warnings. PDFs are generated natively
// from the same structured data as the DOCX (pdf-builder.tsx,
// @react-pdf/renderer) with a real selectable text layer so they parse
// cleanly through ATSes. PDF generation failures are non-blocking:
// DOCX still ships, "PDF unavailable" banner surfaces.
//
// Cover letters draft via SYS_COVER_LETTER_DRAFTER on this same call
// (one Gemini hop), then render through the same Classic primitives.
// CL drafting failure is non-blocking — other deliverables still ship,
// banner surfaces explaining the CL didn't make it.
//
// Three states keyed off session state:
//   - Stage 03 complete, no exports yet  → Generate (CTA)
//   - Generation in flight                → Spinner
//   - Done                                → Download list + lint warnings

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  UpdraftDeliverable,
  UpdraftExportKind,
  UpdraftLintFlag,
  UpdraftMod,
  UpdraftSession,
} from '@/types';

interface CoverLetterMeta {
  word_count: number;
  hook_type: string | null;
  p3_branch: string | null;
  close_type: string | null;
}

interface Stage04Output {
  template_selected?: 'classic' | 'modern' | 'structured' | 'creative';
  density_selected?: 'compact' | 'regular' | 'comfy';
  lint_flags?: UpdraftLintFlag[];
  lint_flags_count?: number;
  generated_at?: string;
  cover_letter_meta?: CoverLetterMeta | null;
  cover_letter_error?: string | null;
}

interface ExportSummary {
  id: string;
  kind: string;
  filename: string;
  bytes: number;
  generated_at: string;
}

interface Props {
  session: UpdraftSession;
  userEmail: string;
  exports: ExportSummary[];
}

interface AvailableDeliverable {
  key: 'mod' | 'resume' | 'cover_letter';
  label: string;
  docxKind: UpdraftExportKind;
  pdfKind: UpdraftExportKind;
}

export default function Stage04Runner({ session, userEmail, exports: priorExports }: Props) {
  const router = useRouter();
  const stage04 = (session.stageOutputs.stage_04 ?? {}) as Stage04Output;
  const stage02 = (session.stageOutputs.stage_02 ?? {}) as {
    deliverables?: UpdraftDeliverable[];
    lightweight_mod?: boolean;
  };
  const stage03 = (session.stageOutputs.stage_03 ?? {}) as { mod?: UpdraftMod };
  const initialMod = stage03.mod ?? null;

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // forceRegenerate flips DoneView → Picker (regen flavor — defaults
  // all unchecked so the user has to actively pick what to refresh).
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Summary lives at the top of Stage 04 in v0.5: auto-drafted on Stage
  // 03 advance, the user reviews/edits/regenerates here before clicking
  // Generate. Local edits autosave (800ms debounce) → mod.summary on the
  // session so generate-files reads the latest.
  const [summary, setSummary] = useState<string>(initialMod?.summary ?? '');
  const [summaryPhase, setSummaryPhase] = useState<
    'idle' | 'saving' | 'generating' | 'error'
  >('idle');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSummary = async (text: string): Promise<boolean> => {
    if (!initialMod) return false;
    const nextMod: UpdraftMod = { ...initialMod, summary: text };
    try {
      const res = await fetch(`/api/updraft/sessions/${session.id}/stage/03`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { mod: nextMod } }),
      });
      if (!res.ok) {
        setSummaryPhase('error');
        return false;
      }
      setSummaryPhase('idle');
      return true;
    } catch {
      setSummaryPhase('error');
      return false;
    }
  };

  const flushSummary = async (): Promise<void> => {
    if (summaryTimer.current) {
      clearTimeout(summaryTimer.current);
      summaryTimer.current = null;
    }
    await persistSummary(summary);
  };

  const onSummaryChange = (v: string): void => {
    setSummary(v);
    setSummaryError(null);
    setSummaryPhase('saving');
    if (summaryTimer.current) clearTimeout(summaryTimer.current);
    summaryTimer.current = setTimeout(() => { void persistSummary(v); }, 800);
  };

  const regenerateSummary = async (): Promise<void> => {
    setSummaryPhase('generating');
    setSummaryError(null);
    await flushSummary();
    try {
      const res = await fetch(
        `/api/updraft/sessions/${session.id}/generate-summary`,
        { method: 'POST' },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSummaryError(body.error || 'Could not draft a summary. Try again.');
        setSummaryPhase('error');
        return;
      }
      setSummary(String(body.summary ?? ''));
      setSummaryPhase('idle');
    } catch {
      setSummaryError('Network error. Try again.');
      setSummaryPhase('error');
    }
  };

  // Cleanup any pending debounce on unmount so a closing tab doesn't
  // leave the autosave timer dangling against an unmounted component.
  useEffect(() => {
    return () => {
      if (summaryTimer.current) clearTimeout(summaryTimer.current);
    };
  }, []);

  const lintFlags = stage04.lint_flags ?? [];

  const available = useMemo<AvailableDeliverable[]>(() => {
    const deliverables = stage02.deliverables ?? [];
    const out: AvailableDeliverable[] = [];
    if (deliverables.includes('mod') || stage02.lightweight_mod === true) {
      out.push({
        key: 'mod',
        label: stage02.lightweight_mod ? 'MOD (lightweight)' : 'Master Overview Document',
        docxKind: 'mod_docx',
        pdfKind: 'mod_pdf',
      });
    }
    if (deliverables.includes('jd_build')) {
      out.push({
        key: 'resume',
        label: 'JD-Specific Resume',
        docxKind: 'resume_docx',
        pdfKind: 'resume_pdf',
      });
    }
    if (deliverables.includes('cover_letter')) {
      out.push({
        key: 'cover_letter',
        label: 'Cover Letter',
        docxKind: 'cl_docx',
        pdfKind: 'cl_pdf',
      });
    }
    return out;
  }, [stage02.deliverables, stage02.lightweight_mod]);

  const deliverables = stage02.deliverables ?? [];

  // Picker selection state — keyed by export kind. Two preset modes:
  // first-time generate (all checked), regenerate (all unchecked).
  const isRegenMode = priorExports.length > 0 && forceRegenerate;
  const [selection, setSelection] = useState<Partial<Record<UpdraftExportKind, boolean>>>(() => {
    const out: Partial<Record<UpdraftExportKind, boolean>> = {};
    for (const a of available) {
      out[a.docxKind] = true;
      out[a.pdfKind]  = true;
    }
    return out;
  });

  const toggleKind = (kind: UpdraftExportKind): void => {
    setSelection((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };
  const setAll = (value: boolean): void => {
    const next: Partial<Record<UpdraftExportKind, boolean>> = {};
    for (const a of available) {
      next[a.docxKind] = value;
      next[a.pdfKind]  = value;
    }
    setSelection(next);
  };

  const enterRegenerateMode = (): void => {
    setForceRegenerate(true);
    setAll(false);                                 // start blank — explicit pick
    setError(null);
  };

  const cancelRegenerate = (): void => {
    setForceRegenerate(false);
    setError(null);
  };

  const selectedKinds = available.flatMap((a) => {
    const out: UpdraftExportKind[] = [];
    if (selection[a.docxKind]) out.push(a.docxKind);
    if (selection[a.pdfKind])  out.push(a.pdfKind);
    return out;
  });

  const generate = async () => {
    if (selectedKinds.length === 0) {
      setError('Pick at least one file to generate.');
      return;
    }
    if (!summary.trim()) {
      setError('Add an executive summary above before generating.');
      return;
    }
    setGenerating(true);
    setError(null);
    // Flush any pending summary edit before kicking off generation —
    // generate-files reads mod.summary off the persisted session.
    await flushSummary();
    try {
      const res = await fetch(`/api/updraft/sessions/${session.id}/generate-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection: selectedKinds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not generate files. Try again.');
        setGenerating(false);
        return;
      }
      // Success — drop regen mode (DoneView will render again on refresh).
      setForceRegenerate(false);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setGenerating(false);
    }
  };

  const showPicker = priorExports.length === 0 || forceRegenerate;

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <SessionHeader sessionId={session.id} userEmail={userEmail} />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showPicker ? (
          <GenerateView
            available={available}
            selection={selection}
            isRegenMode={isRegenMode}
            generating={generating}
            error={error}
            onToggle={toggleKind}
            onSelectAll={() => setAll(true)}
            onSelectNone={() => setAll(false)}
            onGenerate={generate}
            onCancelRegen={cancelRegenerate}
            summary={summary}
            summaryPhase={summaryPhase}
            summaryError={summaryError}
            onSummaryChange={onSummaryChange}
            onRegenerateSummary={regenerateSummary}
          />
        ) : (
          <DoneView
            exports={priorExports}
            sessionId={session.id}
            lintFlags={lintFlags}
            coverLetterError={stage04.cover_letter_error ?? null}
            coverLetterRequested={deliverables.includes('cover_letter')}
            onRegenerate={enterRegenerateMode}
          />
        )}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function SessionHeader({ sessionId, userEmail }: { sessionId: string; userEmail: string }) {
  return (
    <header className="border-b border-[#1F1F1F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-[#7C3AED] uppercase">
            UpDraft · stage 04
          </p>
          <p className="text-sm text-[#94A3B8] mt-1">
            <span className="text-white">{userEmail}</span>
            <span className="ml-2 font-mono text-[#64748b]">{sessionId.slice(0, 8)}</span>
          </p>
        </div>
        <Link
          href="/updraft"
          className="text-xs text-[#94A3B8] hover:text-white transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Generate view (pre-generation)
// ---------------------------------------------------------------------------

function GenerateView({
  available,
  selection,
  isRegenMode,
  generating,
  error,
  onToggle,
  onSelectAll,
  onSelectNone,
  onGenerate,
  onCancelRegen,
  summary,
  summaryPhase,
  summaryError,
  onSummaryChange,
  onRegenerateSummary,
}: {
  available: AvailableDeliverable[];
  selection: Partial<Record<UpdraftExportKind, boolean>>;
  isRegenMode: boolean;
  generating: boolean;
  error: string | null;
  onToggle: (kind: UpdraftExportKind) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onGenerate: () => Promise<void>;
  onCancelRegen: () => void;
  summary: string;
  summaryPhase: 'idle' | 'saving' | 'generating' | 'error';
  summaryError: string | null;
  onSummaryChange: (v: string) => void;
  onRegenerateSummary: () => Promise<void>;
}) {
  const anyChecked = available.some(
    (a) => selection[a.docxKind] || selection[a.pdfKind],
  );
  const heading = isRegenMode ? 'Regenerate files' : 'Review and generate';
  const subhead = isRegenMode
    ? 'Pick what to refresh — only the files you check below will be re-rendered. Existing files of the same kind get overwritten.'
    : 'Audit drafted your executive summary based on the MOD. Review or edit it below, then pick what to generate. Files render in the Classic template (ATS-safe, single column, Times New Roman); PDFs auto-retry on transient errors.';

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">{heading}</h1>
      <p className="text-sm text-[#cbd5e1] mb-6 leading-relaxed">{subhead}</p>

      {!isRegenMode && (
        <SummaryPanel
          summary={summary}
          phase={summaryPhase}
          error={summaryError}
          onChange={onSummaryChange}
          onRegenerate={onRegenerateSummary}
        />
      )}

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono">
            {isRegenMode ? 'Files to regenerate' : 'About to generate'}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[#94A3B8] hover:text-white transition-colors uppercase tracking-wider"
            >
              All
            </button>
            <span className="text-[#2A2A2A]">·</span>
            <button
              type="button"
              onClick={onSelectNone}
              className="text-[#94A3B8] hover:text-white transition-colors uppercase tracking-wider"
            >
              None
            </button>
          </div>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">
            No deliverables selected at Stage 02 — go back and pick what you
            want to build.
          </p>
        ) : (
          <ul className="space-y-2">
            {available.map((a) => (
              <li
                key={a.key}
                className="grid grid-cols-[1fr_auto_auto] gap-4 items-center bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white font-medium">{a.label}</p>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-[#64748b] mt-0.5">
                    Classic · Regular
                  </p>
                </div>
                <FormatCheck
                  label="DOCX"
                  checked={Boolean(selection[a.docxKind])}
                  onToggle={() => onToggle(a.docxKind)}
                />
                <FormatCheck
                  label="PDF"
                  checked={Boolean(selection[a.pdfKind])}
                  onToggle={() => onToggle(a.pdfKind)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 pt-5 border-t border-[#1F1F1F] flex items-center justify-end gap-3">
          {error && (
            <p role="alert" className="text-sm text-red-400 mr-auto">
              {error}
            </p>
          )}
          {isRegenMode && (
            <button
              type="button"
              onClick={onCancelRegen}
              disabled={generating}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors px-3 py-2"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || available.length === 0 || !anyChecked}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {generating ? 'Building…' : isRegenMode ? 'Regenerate selected →' : 'Generate →'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#64748b] leading-relaxed">
        Generation typically takes a few seconds per deliverable. Your DOCX
        and PDF are both generated here from the same content, so they match.
        In the rare case a PDF doesn&apos;t generate, you&apos;ll still get
        the DOCX.
      </p>
    </div>
  );
}

function FormatCheck({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-[#2A2A2A] bg-[#111111] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0 cursor-pointer"
      />
      <span className="text-xs uppercase tracking-widest font-mono text-[#cbd5e1]">
        {label}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Summary panel (top of picker view)
// ---------------------------------------------------------------------------

function SummaryPanel({
  summary,
  phase,
  error,
  onChange,
  onRegenerate,
}: {
  summary: string;
  phase: 'idle' | 'saving' | 'generating' | 'error';
  error: string | null;
  onChange: (v: string) => void;
  onRegenerate: () => Promise<void>;
}) {
  const isEmpty = summary.trim() === '';
  const phaseLabel: Record<typeof phase, string> = {
    idle:        'Saved',
    saving:      'Saving…',
    generating:  'Drafting…',
    error:       'Failed',
  };
  const phaseColor: Record<typeof phase, string> = {
    idle:        'text-emerald-400/70',
    saving:      'text-[#94A3B8]',
    generating:  'text-[#a855f7]',
    error:       'text-red-400',
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono">
            Executive summary
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            The 4-6 sentence opener at the top of your resume. Audit drafted; edit anything.
          </p>
        </div>
        <p className={`text-[10px] uppercase tracking-widest font-mono ${phaseColor[phase]}`}>
          {phaseLabel[phase]}
        </p>
      </div>

      <textarea
        value={summary}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={
          isEmpty
            ? 'Auto-draft is still running, or it failed. Click Regenerate to try again, or write your own summary here.'
            : ''
        }
        className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg resize-y leading-relaxed"
      />

      <div className="flex items-center justify-between mt-3 gap-3">
        {error ? (
          <p role="alert" className="text-xs text-red-400 leading-relaxed">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-[#64748b] leading-relaxed">
            Edits autosave. Regenerate to redraft from the latest MOD content.
          </p>
        )}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={phase === 'generating' || phase === 'saving'}
          className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {phase === 'generating'
            ? 'Drafting…'
            : isEmpty ? 'Generate summary ↻' : 'Regenerate ↻'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Done view (post-generation)
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<string, string> = {
  mod_docx: 'Master Overview Document (DOCX)',
  resume_docx: 'JD-Specific Resume (DOCX)',
  cl_docx: 'Cover Letter (DOCX)',
  mod_pdf: 'Master Overview Document (PDF)',
  resume_pdf: 'JD-Specific Resume (PDF)',
  cl_pdf: 'Cover Letter (PDF)',
  mod_md: 'Master Overview Document (Markdown)',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function DoneView({
  exports,
  sessionId,
  lintFlags,
  coverLetterError,
  coverLetterRequested,
  onRegenerate,
}: {
  exports: ExportSummary[];
  sessionId: string;
  lintFlags: UpdraftLintFlag[];
  coverLetterError: string | null;
  coverLetterRequested: boolean;
  onRegenerate: () => void;
}) {
  // Detect missing PDFs — a DOCX without its companion PDF means the PDF
  // pipeline failed for that deliverable. DOCX still ships per spec § 4.5
  // graceful degradation.
  const kinds = new Set(exports.map((e) => e.kind));
  const missingPdfs: string[] = [];
  if (kinds.has('mod_docx') && !kinds.has('mod_pdf')) missingPdfs.push('MOD');
  if (kinds.has('resume_docx') && !kinds.has('resume_pdf')) missingPdfs.push('Resume');
  if (kinds.has('cl_docx') && !kinds.has('cl_pdf')) missingPdfs.push('Cover Letter');

  // Cover letter never made it to DOCX either — drafting itself failed
  // (model returned wrong shape, or quota tripped). Show the user a
  // separate banner so they know to try again or write one manually.
  const coverLetterDocxMissing =
    coverLetterRequested && !kinds.has('cl_docx');

  // Sort: MOD before Resume, DOCX before PDF within each, mod_md last.
  const KIND_ORDER: Record<string, number> = {
    mod_docx: 0, mod_pdf: 1, mod_md: 2,
    resume_docx: 3, resume_pdf: 4,
    cl_docx: 5, cl_pdf: 6,
  };
  const sortedExports = [...exports].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-2">
          Stage 04 complete
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your files</h1>
        <p className="text-sm text-[#cbd5e1]">
          Click any file below to download. Links are signed and expire after
          10 minutes — refresh this page if a link goes stale.
        </p>
      </div>

      {missingPdfs.length > 0 && (
        <div className="bg-[#1A1A1A] border border-amber-900/40 rounded-lg p-4">
          <p className="text-[10px] tracking-widest text-amber-400 uppercase font-mono mb-2">
            PDF unavailable for {missingPdfs.join(' + ')}
          </p>
          <p className="text-sm text-[#cbd5e1] leading-relaxed">
            Your DOCX shipped successfully — that&apos;s the source-of-truth
            ATS file and parses cleanly through every major applicant tracking
            system. The PDF didn&apos;t generate this time. You can click
            Generate again to retry, or open the DOCX in Word / Google Docs /
            LibreOffice and use File → Save As PDF as a backup.
          </p>
        </div>
      )}

      {coverLetterDocxMissing && (
        <div className="bg-[#1A1A1A] border border-amber-900/40 rounded-lg p-4">
          <p className="text-[10px] tracking-widest text-amber-400 uppercase font-mono mb-2">
            Cover Letter not generated
          </p>
          <p className="text-sm text-[#cbd5e1] leading-relaxed">
            {coverLetterError === 'tier-missing'
              ? 'Your tier wasn’t set on this session, so the cover letter couldn’t be drafted. This usually means Stage 01 didn’t finish cleanly — try a fresh session.'
              : coverLetterError && coverLetterError.toLowerCase().includes('capacity')
                ? 'I hit my daily AI capacity for cover letters. Your other files shipped — try again tomorrow, or write the cover letter yourself for now.'
                : 'I couldn’t draft a cover letter this round — your other files still shipped. Click Generate again to retry; if it persists, your MOD might be too thin to anchor a letter.'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {sortedExports.map((e) => (
          <li key={e.id}>
            <a
              href={`/api/updraft/sessions/${sessionId}/exports/${e.id}`}
              className="block bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#7C3AED] rounded-lg p-4 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-[#a855f7] transition-colors">
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1 font-mono">{e.filename}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#94A3B8]">{formatBytes(e.bytes)}</p>
                  <p className="text-[10px] text-[#64748b] mt-1">
                    {new Date(e.generated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {lintFlags.length > 0 && (
        <LintWarnings flags={lintFlags} />
      )}

      <div className="border-t border-[#1F1F1F] pt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-[#94A3B8]">
          Files are kept for 30 days unless you mark this session as kept.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onRegenerate}
            className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
          >
            Regenerate ↻
          </button>
          <Link
            href="/updraft"
            className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lint warnings (non-blocking in v0.1)
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<UpdraftLintFlag['category'], string> = {
  generic_opener:           'Generic opener',
  weak_verb:                'Weak verb',
  keyword_stuffing:         'Keyword stuffing',
  ai_tell:                  'AI-tell phrase',
  over_condensation:        'Over-condensed bullet',
  filler_adjective:         'Filler adjective',
  vague_quantifier:         'Vague quantifier',
  unsupported_superlative:  'Unsupported superlative',
};

function LintWarnings({ flags }: { flags: UpdraftLintFlag[] }) {
  // Group by category for display
  const byCategory = new Map<UpdraftLintFlag['category'], UpdraftLintFlag[]>();
  for (const f of flags) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  return (
    <div className="bg-[#1A1A1A] border border-amber-900/40 rounded-lg p-5">
      <p className="text-[10px] tracking-widest text-amber-400 uppercase font-mono mb-2">
        Lint pass · {flags.length} flag{flags.length === 1 ? '' : 's'}
      </p>
      <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">
        Your files are downloaded — these are non-blocking notes about
        phrasing the lint pass spotted. v0.1 doesn&apos;t auto-rewrite these.
        Open the DOCX, fix what you want, save. v0.5 routes flagged items
        through Audit for AI rewrite before export.
      </p>
      <div className="space-y-3">
        {Array.from(byCategory.entries()).map(([category, list]) => (
          <details key={category} className="text-sm">
            <summary className="cursor-pointer text-[#cbd5e1] hover:text-white transition-colors flex items-center gap-2">
              <span className="text-amber-400 font-semibold">
                {CATEGORY_LABEL[category]}
              </span>
              <span className="text-xs text-[#94A3B8]">
                ({list.length} occurrence{list.length === 1 ? '' : 's'})
              </span>
            </summary>
            <ul className="mt-2 space-y-1.5 ml-4">
              {list.slice(0, 8).map((f, i) => (
                <li key={i} className="text-xs text-[#94A3B8]">
                  <span className="font-mono text-[10px] text-[#64748b] mr-2">
                    {f.location}
                  </span>
                  <span className="italic">{f.excerpt}</span>
                </li>
              ))}
              {list.length > 8 && (
                <li className="text-xs text-[#64748b] italic">
                  + {list.length - 8} more
                </li>
              )}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
