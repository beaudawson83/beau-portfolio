'use client';

// Stage 01 client state machine. Picks the right sub-view based on
// session.stage_outputs.stage_01 and orchestrates the API calls that
// advance the user through Path A: upload → parse → confirm identity →
// auto-classify tier → hand off to Stage 02.
//
// Path B (Talk it through) is out of scope for v0.1 — selecting it shows
// a "coming next slice" interstitial rather than the deterministic intake
// form the spec describes.

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  ParsedResume,
  ParsedResumeIdentity,
  UpdraftSession,
  UpdraftTier,
} from '@/types';
import { autoClassifyFromResume, type AutoClassifyResult } from '@/lib/updraft/tier';

// ---------------------------------------------------------------------------
// Stage-state shape stored in stage_outputs.stage_01
// ---------------------------------------------------------------------------

interface Stage01State {
  path?: 'upload' | 'talk';
  resume_raw?: string | null;
  resume_parsed?: ParsedResume | null;
  identity?: ParsedResumeIdentity;
  tier?: UpdraftTier;
  tier_confidence?: 'auto' | 'confirmed' | 'overridden';
}

interface Props {
  session: UpdraftSession;
  userEmail: string;
}

export default function Stage01Runner({ session, userEmail }: Props) {
  const stage01 = (session.stageOutputs.stage_01 ?? {}) as Stage01State;

  let body: React.ReactNode;
  if (!stage01.path) {
    body = <PathPicker sessionId={session.id} />;
  } else if (stage01.path === 'talk') {
    body = <PathBStub sessionId={session.id} />;
  } else if (!stage01.resume_parsed) {
    body = <UploadView sessionId={session.id} />;
  } else if (!stage01.identity) {
    body = (
      <IdentityView
        sessionId={session.id}
        parsed={stage01.resume_parsed}
      />
    );
  } else if (!stage01.tier) {
    body = (
      <TierView
        sessionId={session.id}
        parsed={stage01.resume_parsed}
      />
    );
  } else {
    body = (
      <Stage02Stub
        sessionId={session.id}
        tier={stage01.tier}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <SessionHeader sessionId={session.id} userEmail={userEmail} />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {body}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header — shared chrome across all sub-views
// ---------------------------------------------------------------------------

function SessionHeader({ sessionId, userEmail }: { sessionId: string; userEmail: string }) {
  return (
    <header className="border-b border-[#1F1F1F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-[#7C3AED] uppercase">
            UpDraft · session
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
// 1.1 — Path Picker
// ---------------------------------------------------------------------------

function PathPicker({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'upload' | 'talk' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (path: 'upload' | 'talk') => {
    setBusy(path);
    setError(null);
    try {
      const res = await fetch(`/api/updraft/sessions/${sessionId}/stage/01`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, payload: { path } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not save your choice.');
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Two ways to start</h1>
      <p className="text-sm text-[#cbd5e1] mb-8">
        Either works. Same conversation after that.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <PathCard
          label="PATH A"
          title="Upload your resume"
          body="PDF or DOCX. I'll parse it server-side and we'll iterate from there."
          eta="~12 min total"
          disabled={busy !== null}
          loading={busy === 'upload'}
          onClick={() => choose('upload')}
        />
        <PathCard
          label="PATH B"
          title="Talk it through"
          body="No resume? Starting fresh? We'll build it from scratch in conversation."
          eta="~18 min total"
          disabled={busy !== null}
          loading={busy === 'talk'}
          onClick={() => choose('talk')}
          comingSoonNote="Path B ships in a later slice."
        />
      </div>

      {error && <p role="alert" className="mt-6 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function PathCard({
  label,
  title,
  body,
  eta,
  disabled,
  loading,
  onClick,
  comingSoonNote,
}: {
  label: string;
  title: string;
  body: string;
  eta: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  comingSoonNote?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 hover:border-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono">
        {label}
      </p>
      <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-[#cbd5e1] leading-relaxed">{body}</p>
      <p className="mt-3 text-xs text-[#94A3B8]">{eta}</p>
      {comingSoonNote && (
        <p className="mt-3 text-[11px] text-[#94A3B8] italic">{comingSoonNote}</p>
      )}
      {loading && <p className="mt-3 text-xs text-[#7C3AED]">Saving…</p>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Path B stub
// ---------------------------------------------------------------------------

function PathBStub({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const goBack = async () => {
    await fetch(`/api/updraft/sessions/${sessionId}/stage/01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: null, payload: { path: null } }),
    });
    router.refresh();
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-8 text-center">
      <h2 className="text-xl font-bold mb-2">Path B is coming</h2>
      <p className="text-sm text-[#cbd5e1] max-w-md mx-auto leading-relaxed">
        The talk-it-through path lands in a later slice. For now, choose
        Path A and upload a PDF or DOCX.
      </p>
      <button
        type="button"
        onClick={goBack}
        className="mt-6 text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
      >
        ← Back to path picker
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.2A — Upload + parse
// ---------------------------------------------------------------------------

function UploadView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'parsing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setErrorMessage(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setPhase('extracting');
    setErrorMessage(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      // Two phases on the server, but the client perceives them as one
      // upload-and-parse. Switch the spinner copy ~halfway just for feel.
      const halfwayTimer = setTimeout(() => setPhase('parsing'), 1500);
      const res = await fetch(`/api/updraft/sessions/${sessionId}/parse-upload`, {
        method: 'POST',
        body: fd,
      });
      clearTimeout(halfwayTimer);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Could not process that file.');
        setPhase('error');
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage('Network error. Try again.');
      setPhase('error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Upload your resume</h1>
      <p className="text-sm text-[#cbd5e1] mb-6">
        PDF or DOCX, up to 4 MB. Image-only PDFs won&apos;t parse — if yours
        is a scan, save it as DOCX first.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <label className="block bg-[#1A1A1A] border border-dashed border-[#2A2A2A] rounded-lg p-8 text-center cursor-pointer hover:border-[#7C3AED] transition-colors">
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileChange}
            disabled={phase === 'extracting' || phase === 'parsing'}
            className="hidden"
          />
          {file ? (
            <span className="text-sm text-white">
              <span className="font-mono">{file.name}</span>{' '}
              <span className="text-[#94A3B8]">({(file.size / 1024).toFixed(0)} KB)</span>
            </span>
          ) : (
            <span className="text-sm text-[#94A3B8]">
              Click to choose a PDF or DOCX
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={!file || phase === 'extracting' || phase === 'parsing'}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {phase === 'extracting' && 'Reading the file…'}
          {phase === 'parsing' && 'Parsing structure…'}
          {(phase === 'idle' || phase === 'error') && 'Upload + parse'}
        </button>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.3 — Identity confirmation card
// ---------------------------------------------------------------------------

function IdentityView({
  sessionId,
  parsed,
}: {
  sessionId: string;
  parsed: ParsedResume;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState<ParsedResumeIdentity>(parsed.identity);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiredFilled =
    identity.name.trim() !== '' &&
    identity.email.trim() !== '' &&
    (identity.phone ?? '').trim() !== '';

  const matchedSummary = (() => {
    const fields = [parsed.identity.name, parsed.identity.email, parsed.identity.phone];
    const filled = fields.filter((f) => f !== null && f !== undefined && String(f).trim() !== '').length;
    return `Matched ${filled}/3 required fields`;
  })();

  const set = (k: keyof ParsedResumeIdentity, v: string) => {
    setIdentity((prev) => ({ ...prev, [k]: v.trim() === '' ? null : v }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requiredFilled) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/updraft/sessions/${sessionId}/stage/01`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { identity } }),
      });
      if (!res.ok) {
        setErrorMessage('Could not save your identity. Try again.');
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
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Confirm the basics</h1>
      <p className="text-sm text-[#cbd5e1] mb-6">
        I pulled these from your resume. Edit anything that&apos;s off, then continue.
      </p>

      <form onSubmit={submit} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
        <IdField label="Name *" value={identity.name ?? ''} onChange={(v) => set('name', v)} />
        <IdField label="Email *" value={identity.email ?? ''} onChange={(v) => set('email', v)} type="email" />
        <IdField label="Phone *" value={identity.phone ?? ''} onChange={(v) => set('phone', v)} />
        <IdField label="Location" value={identity.location ?? ''} onChange={(v) => set('location', v)} />
        <IdField label="LinkedIn" value={identity.linkedin ?? ''} onChange={(v) => set('linkedin', v)} />

        <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F]">
          <p className="text-xs text-[#94A3B8]">{matchedSummary}</p>
          <button
            type="submit"
            disabled={!requiredFilled || busy}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {busy ? 'Saving…' : 'Confirm →'}
          </button>
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}

function IdField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.4 — Tier auto-classification + override
// ---------------------------------------------------------------------------

const TIER_LABEL: Record<UpdraftTier, string> = {
  1: 'Tier 1 — Foundational (0-2 yr)',
  2: 'Tier 2 — Established (3-7 yr)',
  3: 'Tier 3 — Senior (8-15 yr)',
  4: 'Tier 4 — Executive (15+ yr)',
};

function TierView({
  sessionId,
  parsed,
}: {
  sessionId: string;
  parsed: ParsedResume;
}) {
  const router = useRouter();
  const auto: AutoClassifyResult = useMemo(() => autoClassifyFromResume(parsed), [parsed]);
  const [chosenTier, setChosenTier] = useState<UpdraftTier>(auto.tier);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const overridden = chosenTier !== auto.tier;

  const submit = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/updraft/sessions/${sessionId}/stage/01`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: chosenTier,
          payload: {
            tier: chosenTier,
            tier_confidence: overridden ? 'overridden' : 'auto',
            tier_classifier_inputs: auto.inputs,
            years_experience: auto.yearsExperience,
          },
        }),
      });
      if (!res.ok) {
        setErrorMessage('Could not save tier. Try again.');
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
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tier check</h1>
      <p className="text-sm text-[#cbd5e1] mb-6">
        Years and role signals give me a starting tier. Bump it up or down if it&apos;s off.
      </p>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
        <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-2">
          Auto-detected
        </p>
        <h2 className="text-lg font-semibold text-white">{TIER_LABEL[auto.tier]}</h2>
        <ul className="mt-4 text-xs text-[#94A3B8] space-y-1">
          <li><span className="text-[#cbd5e1]">Years of experience:</span> {auto.yearsExperience} ({auto.inputs.years_band})</li>
          <li><span className="text-[#cbd5e1]">Role level:</span> {auto.inputs.role_level}</li>
          <li><span className="text-[#cbd5e1]">Direct reports at peak:</span> {auto.inputs.reports_peak}</li>
        </ul>

        <div className="mt-6 pt-5 border-t border-[#1F1F1F]">
          <label className="block text-xs text-[#94A3B8] mb-2 uppercase tracking-wider">
            Override
          </label>
          <select
            value={chosenTier}
            onChange={(e) => setChosenTier(parseInt(e.target.value, 10) as UpdraftTier)}
            className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none rounded-lg"
          >
            <option value={1}>{TIER_LABEL[1]}</option>
            <option value={2}>{TIER_LABEL[2]}</option>
            <option value={3}>{TIER_LABEL[3]}</option>
            <option value={4}>{TIER_LABEL[4]}</option>
          </select>
          {overridden && (
            <p className="mt-2 text-xs text-[#7C3AED]">Overriding the auto-detection.</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {busy ? 'Saving…' : 'Continue →'}
          </button>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage 02 stub
// ---------------------------------------------------------------------------

function Stage02Stub({ sessionId, tier }: { sessionId: string; tier: UpdraftTier }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-8 text-center">
      <p className="text-[10px] tracking-widest text-[#7C3AED] uppercase font-mono mb-3">
        Stage 01 complete
      </p>
      <h2 className="text-xl font-bold mb-2">Stage 02 — Target</h2>
      <p className="text-sm text-[#cbd5e1] max-w-md mx-auto leading-relaxed">
        Locked in as {TIER_LABEL[tier]}. The deliverable picker + JD capture
        flow ships in the next slice. Your session ID is{' '}
        <span className="font-mono text-white">{sessionId.slice(0, 8)}</span> —
        Stage 02 will pick up from there.
      </p>
      <Link
        href="/updraft"
        className="mt-6 inline-block text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
