'use client';

// Stage 04 — Generate.
//
// Renders the chosen DOCX deliverables from the MOD Stage 03 produced.
// v0.1 ships DOCX-only (PDF deferred to v0.5 via Vercel Sandbox), one
// template (Classic) at one density (Regular), Phase 1 lint pass with
// non-blocking warnings. Cover letters defer to v0.5 alongside the
// match-analyzer tuning pass.
//
// Three states keyed off session state:
//   - Stage 03 complete, no exports yet  → Generate (CTA)
//   - Generation in flight                → Spinner
//   - Done                                → Download list + lint warnings

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  UpdraftDeliverable,
  UpdraftLintFlag,
  UpdraftSession,
} from '@/types';

interface Stage04Output {
  template_selected?: 'classic' | 'modern' | 'structured' | 'creative';
  density_selected?: 'compact' | 'regular' | 'comfy';
  lint_flags?: UpdraftLintFlag[];
  lint_flags_count?: number;
  generated_at?: string;
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

export default function Stage04Runner({ session, userEmail, exports: priorExports }: Props) {
  const router = useRouter();
  const stage04 = (session.stageOutputs.stage_04 ?? {}) as Stage04Output;
  const stage02 = (session.stageOutputs.stage_02 ?? {}) as {
    deliverables?: UpdraftDeliverable[];
    lightweight_mod?: boolean;
  };

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExports = priorExports.length > 0;
  const lintFlags = stage04.lint_flags ?? [];

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/updraft/sessions/${session.id}/generate-files`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not generate files. Try again.');
        setGenerating(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setGenerating(false);
    }
  };

  const willGenerate: { label: string; kind: 'mod_docx' | 'resume_docx' }[] = [];
  const deliverables = stage02.deliverables ?? [];
  if (deliverables.includes('mod') || stage02.lightweight_mod === true) {
    willGenerate.push({ label: stage02.lightweight_mod ? 'MOD (lightweight)' : 'MOD', kind: 'mod_docx' });
  }
  if (deliverables.includes('jd_build')) {
    willGenerate.push({ label: 'JD-Specific Resume', kind: 'resume_docx' });
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <SessionHeader sessionId={session.id} userEmail={userEmail} />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {hasExports ? (
          <DoneView exports={priorExports} sessionId={session.id} lintFlags={lintFlags} />
        ) : (
          <GenerateView
            willGenerate={willGenerate}
            generating={generating}
            error={error}
            onGenerate={generate}
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
  willGenerate,
  generating,
  error,
  onGenerate,
}: {
  willGenerate: { label: string; kind: string }[];
  generating: boolean;
  error: string | null;
  onGenerate: () => Promise<void>;
}) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Generate your files</h1>
      <p className="text-sm text-[#cbd5e1] mb-6">
        Audit assembles the DOCX exports from your MOD using the Classic
        template (ATS-safe, single column, Times New Roman). The lint pass
        checks for filler phrases, weak verbs, and AI-tells before export.
        v0.1 ships DOCX-only — PDF, the template picker, and the JD-tailoring
        pass arrive in later slices.
      </p>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
        <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-3">
          About to generate
        </p>
        {willGenerate.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">
            No deliverables match v0.1 scope. Cover Letter ships in v0.5.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {willGenerate.map((w) => (
              <li key={w.kind} className="text-sm text-[#cbd5e1] flex items-center gap-2">
                <span className="text-[#7C3AED]">▸</span>
                {w.label}{' '}
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">
                  Classic · Regular · DOCX
                </span>
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
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || willGenerate.length === 0}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {generating ? 'Building DOCX(s)…' : 'Generate →'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#64748b] leading-relaxed">
        The DOCX generation typically takes 1-3 seconds. PDF generation
        ships in v0.5 via Vercel Sandbox + a custom LibreOffice image so
        the text layer stays ATS-clean.
      </p>
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
}: {
  exports: ExportSummary[];
  sessionId: string;
  lintFlags: UpdraftLintFlag[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-2">
          Stage 04 complete · v0.1
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your files</h1>
        <p className="text-sm text-[#cbd5e1]">
          Click any file below to download. Links are signed and expire after
          10 minutes — refresh this page if a link goes stale.
        </p>
      </div>

      <ul className="space-y-2">
        {exports.map((e) => (
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

      <div className="border-t border-[#1F1F1F] pt-6 flex items-center justify-between">
        <p className="text-xs text-[#94A3B8]">
          Files are kept for 30 days unless you mark this session as kept.
        </p>
        <Link
          href="/updraft"
          className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
        >
          Back to dashboard →
        </Link>
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
