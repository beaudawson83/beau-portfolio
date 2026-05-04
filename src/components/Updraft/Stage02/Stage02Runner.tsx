'use client';

// Stage 02 client state machine. Picks the right sub-view based on
// session.stage_outputs.stage_02 and orchestrates the API calls that
// advance the user through:
//   2.1 Deliverable Picker → 2.2 Target Form → 2.3 SYS_MATCH_ANALYZER
//   → 2.4 Match Briefing → Stage 03 handoff
//
// v0.1 cut: Cover Letter is selectable but disabled (ships v0.5+). The
// Audit-voiced briefing in 2.4 is rendered as a structured panel for v0.1;
// the full tier-aware voice arrives in a later iteration.

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  UpdraftConfidenceBand,
  UpdraftDeliverable,
  UpdraftMatchAnalysis,
  UpdraftSession,
  UpdraftTargetRole,
} from '@/types';

interface Stage02State {
  deliverables?: UpdraftDeliverable[];
  lightweight_mod?: boolean;
  target?: UpdraftTargetRole | null;
  match_analysis?: UpdraftMatchAnalysis | null;
  confidence_band?: UpdraftConfidenceBand | null;
  acknowledged?: boolean;
}

interface Props {
  session: UpdraftSession;
  userEmail: string;
}

export default function Stage02Runner({ session, userEmail }: Props) {
  const stage02 = (session.stageOutputs.stage_02 ?? {}) as Stage02State;
  const deliverables = stage02.deliverables ?? [];
  const needsTarget = deliverables.some(
    (d) => d === 'jd_build' || d === 'cover_letter',
  );

  let body: React.ReactNode;
  if (deliverables.length === 0) {
    body = <DeliverablePicker sessionId={session.id} />;
  } else if (needsTarget && !stage02.target) {
    body = (
      <TargetForm
        sessionId={session.id}
        deliverables={deliverables}
      />
    );
  } else if (needsTarget && stage02.target && !stage02.match_analysis) {
    // Mid-analysis page reload landed here. Offer retry.
    body = (
      <AnalyzeRetry
        sessionId={session.id}
        target={stage02.target}
      />
    );
  } else if (stage02.match_analysis && !stage02.acknowledged) {
    body = (
      <MatchBriefing
        sessionId={session.id}
        analysis={stage02.match_analysis}
        target={stage02.target ?? null}
      />
    );
  } else {
    // Defensive fallback: if stage_02.acknowledged is true the page-level
    // dispatcher routes elsewhere, so this branch shouldn't render. Keeps
    // the user un-stuck if dispatcher logic ever drifts.
    body = (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 text-center">
        <p className="text-sm text-[#cbd5e1] mb-3">Stage 02 complete.</p>
        <Link
          href="/updraft"
          className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <SessionHeader sessionId={session.id} userEmail={userEmail} stage="02" />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {body}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header — same chrome as Stage 01
// ---------------------------------------------------------------------------

function SessionHeader({
  sessionId,
  userEmail,
  stage,
}: {
  sessionId: string;
  userEmail: string;
  stage: string;
}) {
  return (
    <header className="border-b border-[#1F1F1F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-[#7C3AED] uppercase">
            UpDraft · stage {stage}
          </p>
          <p className="text-sm text-[#94A3B8] mt-1">
            <span className="text-white">{userEmail}</span>
            <span className="ml-2 font-mono text-[#64748b]">
              {sessionId.slice(0, 8)}
            </span>
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
// 2.1 — Deliverable picker
// ---------------------------------------------------------------------------

function DeliverablePicker({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<UpdraftDeliverable>>(new Set());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggle = (d: UpdraftDeliverable) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) {
      setErrorMessage('Pick at least one deliverable.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);

    const deliverables = Array.from(selected);
    const includesJdOrCl = deliverables.some(
      (d) => d === 'jd_build' || d === 'cover_letter',
    );
    const lightweightMod = !deliverables.includes('mod') && includesJdOrCl;
    const onlyMod = deliverables.length === 1 && deliverables[0] === 'mod';

    const payload: Record<string, unknown> = {
      deliverables,
      lightweight_mod: lightweightMod,
    };
    if (onlyMod) {
      // MOD-only path: spec says skip target capture and match analysis,
      // advance directly. Persist the null'd-out target/analysis fields and
      // mark acknowledged so the dispatcher routes straight to Stage 03.
      payload.target = null;
      payload.match_analysis = null;
      payload.confidence_band = null;
      payload.acknowledged = true;
    }

    try {
      const res = await fetch(`/api/updraft/sessions/${sessionId}/stage/02`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Could not save your choice.');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage('Network error. Try again.');
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        What do you want to build?
      </h1>
      <p className="text-sm text-[#cbd5e1] mb-8">
        Pick one, two, or all three. JD-Build and Cover Letter both need a
        target job; if you skip the MOD I&apos;ll build a lightweight one as
        part of the work — you get it either way.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <DeliverableCheck
          checked={selected.has('mod')}
          onToggle={() => toggle('mod')}
          title="Master Overview Document (MOD)"
          body="Your full career, properly structured. Reusable. DOCX + PDF + Markdown export."
        />
        <DeliverableCheck
          checked={selected.has('jd_build')}
          onToggle={() => toggle('jd_build')}
          title="JD-Specific Resume Build"
          body="Tailored to one job posting. Match-scored. Auto-builds an MOD if you skipped it. DOCX + PDF export."
        />
        <DeliverableCheck
          checked={false}
          onToggle={() => {}}
          title="Cover Letter"
          body="Four paragraphs, targeted, no filler. Requires a JD."
          disabled
          disabledNote="Ships in v0.5"
        />

        <div className="flex items-center justify-between pt-4">
          {errorMessage ? (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          ) : (
            <p className="text-xs text-[#94A3B8]">
              {selected.size} selected
            </p>
          )}
          <button
            type="submit"
            disabled={busy || selected.size === 0}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {busy ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeliverableCheck({
  checked,
  onToggle,
  title,
  body,
  disabled = false,
  disabledNote,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  body: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`w-full text-left bg-[#1A1A1A] border rounded-lg p-4 transition-colors ${
        disabled
          ? 'border-[#1F1F1F] opacity-50 cursor-not-allowed'
          : checked
            ? 'border-[#7C3AED]'
            : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-[12px] ${
            checked
              ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
              : 'border-[#2A2A2A]'
          }`}
        >
          {checked ? '✓' : ''}
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">
            {title}
            {disabledNote && (
              <span className="ml-2 text-[10px] tracking-widest text-[#94A3B8] uppercase font-mono">
                {disabledNote}
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-[#cbd5e1] leading-relaxed">{body}</p>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 2.2 — Target form
// ---------------------------------------------------------------------------

function TargetForm({
  sessionId,
  deliverables,
}: {
  sessionId: string;
  deliverables: UpdraftDeliverable[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState({
    role_title: '',
    company: '',
    industry: '',
    seniority: '',
    location: '',
    compensation_range: '',
    jd_text: '',
  });
  const [showOverrides, setShowOverrides] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [goingBack, setGoingBack] = useState(false);

  const updateField = (k: keyof typeof target) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setTarget((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const jdFilled = target.jd_text.trim() !== '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!jdFilled) return;
    setPhase('analyzing');
    setErrorMessage(null);
    setErrorDetail(null);
    try {
      const res = await fetch(
        `/api/updraft/sessions/${sessionId}/match-analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Could not run match analysis.');
        setErrorDetail(typeof body.detail === 'string' ? body.detail : null);
        setPhase('error');
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage('Network error. Try again.');
      setPhase('error');
    }
  };

  // Back button — clears stage_02 entirely so the dispatcher routes back
  // to the deliverable picker. Same idiom as the "Change deliverables"
  // link on the Stage 03 stub. Stage 01 outputs are untouched.
  const goBack = async () => {
    setGoingBack(true);
    try {
      await fetch(`/api/updraft/sessions/${sessionId}/stage/02`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            deliverables: [],
            lightweight_mod: false,
            target: null,
            match_analysis: null,
            confidence_band: null,
            acknowledged: false,
          },
        }),
      });
    } catch {
      /* swallow — we'll refresh either way and let the user retry */
    }
    router.refresh();
  };

  const wantsMod = deliverables.includes('mod');

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Target role</h1>
      <p className="text-sm text-[#cbd5e1] mb-6">
        Paste the full JD, or describe what you&apos;re aiming for. I&apos;ll
        extract the role title, company, and other details from there.
        Specific is better — &ldquo;Director of Trust at a marketplace doing
        $1B+ GMV&rdquo; beats &ldquo;Senior Manager somewhere.&rdquo;
        {!wantsMod && (
          <>
            {' '}
            <span className="text-[#94A3B8]">
              (Building a lightweight MOD as part of this since you skipped it.)
            </span>
          </>
        )}
      </p>

      <form onSubmit={submit} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">
            Job description or target blurb *
          </label>
          <textarea
            value={target.jd_text}
            onChange={updateField('jd_text')}
            placeholder={'Paste the full JD here…\n\nOr something like:\n"Senior backend engineer at a healthtech company,\n6+ years, comfortable with Postgres + Go."'}
            rows={12}
            className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg resize-y font-mono"
          />
          <p className="mt-1 text-[10px] text-[#64748b]">
            {target.jd_text.length.toLocaleString()} / 50,000 chars
          </p>
        </div>

        <div className="border-t border-[#1F1F1F] pt-4">
          <button
            type="button"
            onClick={() => setShowOverrides((v) => !v)}
            className="text-xs text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span className="font-mono">{showOverrides ? '▾' : '▸'}</span>
            Override extracted fields (optional)
          </button>

          {showOverrides && (
            <div className="mt-4 space-y-4">
              <p className="text-[11px] text-[#64748b] leading-relaxed">
                Any field you fill here wins over what the AI extracts from the
                JD. Leave blank and the AI will fill it in.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Role title"
                  value={target.role_title}
                  onChange={updateField('role_title')}
                  placeholder="Director of Customer Experience"
                />
                <Field
                  label="Company"
                  value={target.company}
                  onChange={updateField('company')}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Industry"
                  value={target.industry}
                  onChange={updateField('industry')}
                  placeholder="B2B SaaS"
                />
                <Field
                  label="Seniority"
                  value={target.seniority}
                  onChange={updateField('seniority')}
                  placeholder="Director / VP"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Location"
                  value={target.location}
                  onChange={updateField('location')}
                  placeholder="Remote · US"
                />
                <Field
                  label="Comp range"
                  value={target.compensation_range}
                  onChange={updateField('compensation_range')}
                  placeholder="$180-220k"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F]">
          <button
            type="button"
            onClick={goBack}
            disabled={goingBack || phase === 'analyzing'}
            className="text-xs text-[#94A3B8] hover:text-white transition-colors disabled:opacity-50"
          >
            {goingBack ? 'Going back…' : '← Back'}
          </button>
          <button
            type="submit"
            disabled={!jdFilled || phase === 'analyzing'}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {phase === 'analyzing' ? 'Analyzing the JD…' : 'Analyze →'}
          </button>
        </div>

        {errorMessage && (
          <div role="alert" className="space-y-1.5">
            <p className="text-sm text-red-400">{errorMessage}</p>
            {errorDetail && (
              <details className="text-[11px] text-[#64748b]">
                <summary className="cursor-pointer hover:text-[#94A3B8] transition-colors">
                  Show technical details
                </summary>
                <pre className="mt-1.5 font-mono text-[11px] text-[#94A3B8] bg-[#111111] border border-[#2A2A2A] rounded p-2 whitespace-pre-wrap break-words">
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2.3 — Mid-analysis page reload (rare, but handle gracefully)
// ---------------------------------------------------------------------------

function AnalyzeRetry({
  sessionId,
  target,
}: {
  sessionId: string;
  target: UpdraftTargetRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const retry = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/updraft/sessions/${sessionId}/match-analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Analysis still failing. Try a new JD.');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage('Network error. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Match analysis pending</h2>
      <p className="text-sm text-[#cbd5e1] mb-4">
        We have your target ({target.role_title} @ {target.company}) but the
        analysis didn&apos;t complete. Click below to retry — your JD is still saved.
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
      >
        {busy ? 'Retrying…' : 'Retry analysis'}
      </button>
      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2.4 — Match briefing
// ---------------------------------------------------------------------------

const BAND_COLOR: Record<UpdraftConfidenceBand, string> = {
  DIRECT:       'text-[#10B981]',
  TRANSFERABLE: 'text-[#10B981]',
  ADJACENT:     'text-[#7C3AED]',
  WEAK:         'text-amber-400',
  GAP:          'text-red-400',
};

const BAND_LABEL: Record<UpdraftConfidenceBand, string> = {
  DIRECT:       'Direct match',
  TRANSFERABLE: 'Transferable',
  ADJACENT:     'Adjacent',
  WEAK:         'Stretch',
  GAP:          'Gap',
};

const SEVERITY_COLOR: Record<'critical' | 'major' | 'minor', string> = {
  critical: 'text-red-400',
  major:    'text-amber-400',
  minor:    'text-[#94A3B8]',
};

function MatchBriefing({
  sessionId,
  analysis,
  target,
}: {
  sessionId: string;
  analysis: UpdraftMatchAnalysis;
  target: UpdraftTargetRole | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const acknowledge = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/updraft/sessions/${sessionId}/stage/02`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: { acknowledged: true } }),
        },
      );
      if (!res.ok) {
        setErrorMessage('Could not advance. Try again.');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage('Network error. Try again.');
      setBusy(false);
    }
  };

  const matchPct = analysis.overall_match_pct;
  const band = analysis.confidence_band;

  // Path B (no resume) means matchPct/band are null — show a different framing
  const hasScore = matchPct !== null && band !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Match briefing</h1>
        {target && (target.role_title || target.company) && (
          <p className="text-sm text-[#94A3B8]">
            {target.role_title && (
              <span className="text-white">{target.role_title}</span>
            )}
            {target.role_title && target.company && ' @ '}
            {target.company && (
              <span className="text-white">{target.company}</span>
            )}
          </p>
        )}
      </div>

      {hasScore ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
          <p className="text-[10px] tracking-widest uppercase font-mono text-[#94A3B8] mb-2">
            Overall match
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-white">{matchPct}%</span>
            <span className={`text-sm font-semibold ${BAND_COLOR[band!]}`}>
              {BAND_LABEL[band!]}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
          <p className="text-sm text-[#cbd5e1]">
            No resume yet, so I can&apos;t run a match score — that comes after
            we build the MOD. The breakdown below is what I extracted from
            the JD itself.
          </p>
        </div>
      )}

      <Section title="Strengths to emphasize">
        {analysis.strengths_to_emphasize.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">— none surfaced —</p>
        ) : (
          <ul className="space-y-2">
            {analysis.strengths_to_emphasize.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#cbd5e1]">
                <span className="text-[#10B981]">▸</span>
                {s}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Gaps">
        {analysis.gaps.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">— none surfaced —</p>
        ) : (
          <ul className="space-y-2">
            {analysis.gaps.map((g, i) => (
              <li key={i} className="text-sm">
                <span className={`text-[10px] uppercase tracking-widest font-mono mr-2 ${SEVERITY_COLOR[g.severity]}`}>
                  {g.severity}
                </span>
                <span className="text-[#cbd5e1]">{g.requirement}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Required skills (${analysis.required_skills.filter((s) => s.match).length} / ${analysis.required_skills.length})`}>
        <ul className="space-y-1.5">
          {analysis.required_skills.map((s, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className={s.match ? 'text-[#10B981]' : 'text-red-400'}>
                {s.match ? '✓' : '✗'}
              </span>
              <span className={s.match ? 'text-[#cbd5e1]' : 'text-[#94A3B8]'}>{s.skill}</span>
            </li>
          ))}
        </ul>
      </Section>

      {analysis.preferred_skills.length > 0 && (
        <Section title={`Preferred skills (${analysis.preferred_skills.filter((s) => s.match).length} / ${analysis.preferred_skills.length})`}>
          <ul className="space-y-1.5">
            {analysis.preferred_skills.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className={s.match ? 'text-[#10B981]' : 'text-[#64748b]'}>
                  {s.match ? '✓' : '○'}
                </span>
                <span className={s.match ? 'text-[#cbd5e1]' : 'text-[#94A3B8]'}>{s.skill}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.red_flags.length > 0 && (
        <Section title="Red flags">
          <ul className="space-y-2">
            {analysis.red_flags.map((f, i) => (
              <li key={i} className="text-sm">
                <span className="text-[10px] uppercase tracking-widest font-mono text-amber-400 mr-2">
                  {f.type}
                </span>
                <span className="text-[#cbd5e1]">{f.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={acknowledge}
          disabled={busy}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
        >
          {busy ? 'Saving…' : 'Continue →'}
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <p className="text-[11px] text-[#64748b] pt-2">
        v0.1 renders the structured analysis. The full Audit-voiced briefing
        ships in a later iteration.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5">
      <h3 className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// (Stage 03 stub used to live here. With Stage 03 shipping, the page-
// level dispatcher routes acknowledged Stage 02 sessions to Stage03Runner
// directly, so this component is no longer reachable. Removed.)
