'use client';

// Stage 03 — Build your story.
//
// v0.1 cut: a single scrolling page with editable sections. The full Phase
// A-D conversational interview from the spec ships in v0.5; for v0.1 we
// give the user direct edit control over the parsed-resume content,
// capture the Tier 2 deepening fields (through-line, tools/stack,
// interview objections), and run SYS_SUMMARY_GENERATOR for the executive
// summary draft. AI bullet rewriting is parked — see CALIBRATION.md.
//
// State management:
//   - Local useState<UpdraftMod> seeded either from stage_03.mod (existing
//     session) or from stage_01.resume_parsed (first time entering Stage 03).
//   - Auto-save on blur, debounced ~1s. PATCH /stage/03 with the full mod.
//     User can refresh and resume any time.
//   - "Continue → Stage 04" requires summary non-empty + ≥1 role with
//     bullets + ≥5 skills + ≥1 education entry per spec completion criteria.

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  ParsedResume,
  ParsedResumeIdentity,
  UpdraftBullet,
  UpdraftDeliverable,
  UpdraftEarlierCareerEntry,
  UpdraftMod,
  UpdraftModMode,
  UpdraftRoleInMod,
  UpdraftSession,
} from '@/types';

interface Stage03State {
  mod?: UpdraftMod;
  mod_mode?: UpdraftModMode;
  ready_for_generation?: boolean;
}

interface Props {
  session: UpdraftSession;
  userEmail: string;
}

// ---------------------------------------------------------------------------
// MOD initialization from Stage 01 parsed resume
// ---------------------------------------------------------------------------

const RECENT_CAREER_YEARS = 10;

function parseYearMonthSafe(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
    return null;
  }
  return new Date(y, mo - 1, 1);
}

function isRecent(role: { end_date: string }): boolean {
  if (role.end_date === 'Present') return true;
  const end = parseYearMonthSafe(role.end_date);
  if (!end) return true;                                 // can't parse — keep
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RECENT_CAREER_YEARS);
  return end >= cutoff;
}

function bulletsFromExtracted(strings: string[]): UpdraftBullet[] {
  return strings.map((s) => ({
    text: s,
    metric_present: /\d/.test(s),                        // crude: any digit
    source: 'extracted' as const,
    tags: [],
  }));
}

function initializeModFromParsed(
  parsed: ParsedResume,
  identity: ParsedResumeIdentity,
): UpdraftMod {
  const recent: UpdraftRoleInMod[] = [];
  const earlier: UpdraftEarlierCareerEntry[] = [];

  for (const r of parsed.experience) {
    if (isRecent(r)) {
      recent.push({
        company: r.company,
        title: r.title,
        start_date: r.start_date,
        end_date: r.end_date,
        location: r.location,
        context: '',
        bullets: bulletsFromExtracted(r.bullets ?? []),
      });
    } else {
      earlier.push({
        company: r.company,
        title: r.title,
        dates: `${r.start_date} – ${r.end_date}`,
      });
    }
  }

  return {
    identity,
    experience: recent,
    earlier_career: earlier,
    education: parsed.education ?? [],
    skills: [...(parsed.skills ?? [])],
    interview_objections: [],
  };
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export default function Stage03Runner({ session, userEmail }: Props) {
  const router = useRouter();
  const stage03 = (session.stageOutputs.stage_03 ?? {}) as Stage03State;
  const stage01 = session.stageOutputs.stage_01 as
    | { resume_parsed?: ParsedResume; identity?: ParsedResumeIdentity }
    | undefined;
  const stage02 = session.stageOutputs.stage_02 as
    | { deliverables?: UpdraftDeliverable[] }
    | undefined;

  const initialModMode: UpdraftModMode =
    stage03.mod_mode ??
    (stage02?.deliverables?.includes('mod') ? 'full' : 'lightweight');

  const initialMod: UpdraftMod = useMemo(() => {
    if (stage03.mod) return stage03.mod;
    if (stage01?.resume_parsed && stage01?.identity) {
      return initializeModFromParsed(stage01.resume_parsed, stage01.identity);
    }
    // Fallback: empty MOD with whatever identity we have
    return {
      identity:
        stage01?.identity ??
        {
          name: '',
          email: userEmail,
          phone: null,
          location: null,
          linkedin: null,
        },
      experience: [],
      earlier_career: [],
      education: [],
      skills: [],
      interview_objections: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If stage_03.mod_mode wasn't already persisted, persist it now (along
  // with the initial MOD) so subsequent renders read from the same source.
  // We do this once on mount via useEffect to avoid render-phase side
  // effects.
  const persistedInitialRef = useRef(false);

  const [mod, setMod] = useState<UpdraftMod>(initialMod);
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Summary moved to Stage 04 (auto-generated on advance, edited there
  // before the user picks deliverables). Stage 03 no longer manages
  // summary state directly.
  const [continuePhase, setContinuePhase] = useState<'idle' | 'advancing' | 'error'>('idle');
  const [continueError, setContinueError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestModRef = useRef<UpdraftMod>(mod);

  useEffect(() => {
    latestModRef.current = mod;
  }, [mod]);

  const flush = async (modToSave: UpdraftMod) => {
    setSavePhase('saving');
    try {
      const res = await fetch(`/api/updraft/sessions/${session.id}/stage/03`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: { mod: modToSave, mod_mode: initialModMode },
        }),
      });
      if (!res.ok) {
        setSavePhase('error');
        return;
      }
      setSavePhase('saved');
      setTimeout(() => setSavePhase('idle'), 1200);
    } catch {
      setSavePhase('error');
    }
  };

  useEffect(() => {
    if (persistedInitialRef.current) return;
    persistedInitialRef.current = true;
    if (!stage03.mod) {
      // First entry into Stage 03 — persist the initial MOD so subsequent
      // refreshes read from the saved version, not re-derive from Stage 01.
      void flush(initialMod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flush(latestModRef.current);
    }, 1000);
  };

  // Field setters — every change updates local state + schedules a save
  const updateMod = (patch: Partial<UpdraftMod>) => {
    setMod((prev) => {
      const next = { ...prev, ...patch };
      latestModRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const updateRole = (idx: number, patch: Partial<UpdraftRoleInMod>) => {
    setMod((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
      };
      latestModRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const updateBullet = (roleIdx: number, bulletIdx: number, text: string) => {
    setMod((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((r, i) => {
          if (i !== roleIdx) return r;
          return {
            ...r,
            bullets: r.bullets.map((b, j) =>
              j === bulletIdx
                ? { ...b, text, metric_present: /\d/.test(text), source: b.source === 'extracted' ? 'rewritten' : b.source }
                : b,
            ),
          };
        }),
      };
      latestModRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const addBullet = (roleIdx: number) => {
    setMod((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((r, i) =>
          i === roleIdx
            ? {
                ...r,
                bullets: [
                  ...r.bullets,
                  { text: '', metric_present: false, source: 'new' as const, tags: [] },
                ],
              }
            : r,
        ),
      };
      latestModRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const removeBullet = (roleIdx: number, bulletIdx: number) => {
    setMod((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((r, i) =>
          i === roleIdx
            ? { ...r, bullets: r.bullets.filter((_, j) => j !== bulletIdx) }
            : r,
        ),
      };
      latestModRef.current = next;
      return next;
    });
    scheduleSave();
  };

  // Continue → Stage 04. Validates spec completion criteria first.
  // Summary is no longer required here — Stage 04 auto-drafts it after
  // this advance succeeds, and the user can review/edit/regenerate
  // there before clicking Generate.
  const advance = async () => {
    setContinuePhase('advancing');
    setContinueError(null);

    const missing: string[] = [];
    if (!mod.experience.some((r) => r.bullets.length > 0)) {
      missing.push('At least one role with bullets');
    }
    if (mod.skills.length < 5) missing.push(`At least 5 skills (you have ${mod.skills.length})`);
    if (mod.education.length === 0) missing.push('At least one education entry');

    if (missing.length > 0) {
      setContinueError(`Still need: ${missing.join(' · ')}`);
      setContinuePhase('error');
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await flush(latestModRef.current);

    try {
      const res = await fetch(`/api/updraft/sessions/${session.id}/stage/03`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            mod: latestModRef.current,
            mod_mode: initialModMode,
            ready_for_generation: true,
          },
          status: 'in_progress',                          // Stage 04 hasn't completed yet
        }),
      });
      if (!res.ok) {
        setContinueError('Could not advance. Try again.');
        setContinuePhase('error');
        return;
      }
      // Auto-draft the executive summary on transition. Don't fail the
      // advance if it errors — Stage 04 will surface a "summary not yet
      // drafted" state with a manual Generate button so the user is
      // never blocked. Skip if user already has a summary in place.
      const haveSummary = (latestModRef.current.summary ?? '').trim().length > 0;
      if (!haveSummary) {
        try {
          await fetch(
            `/api/updraft/sessions/${session.id}/generate-summary`,
            { method: 'POST' },
          );
        } catch {
          /* non-blocking — Stage 04 falls back to manual */
        }
      }
      router.refresh();
    } catch {
      setContinueError('Network error. Try again.');
      setContinuePhase('error');
    }
  };

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <SessionHeader sessionId={session.id} userEmail={userEmail} stage="03" />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {stage03.ready_for_generation ? (
          // Defensive fallback — when ready_for_generation=true the page-
          // level dispatcher routes to Stage04Runner, so this branch
          // shouldn't render. Keeps the user un-stuck if it does.
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 text-center">
            <p className="text-sm text-[#cbd5e1] mb-3">Stage 03 complete.</p>
            <Link
              href="/updraft"
              className="text-xs text-[#7C3AED] hover:text-[#a855f7] underline"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <Stage03Form
            mod={mod}
            modMode={initialModMode}
            savePhase={savePhase}
            continuePhase={continuePhase}
            continueError={continueError}
            updateMod={updateMod}
            updateRole={updateRole}
            updateBullet={updateBullet}
            addBullet={addBullet}
            removeBullet={removeBullet}
            advance={advance}
          />
        )}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header — same chrome as Stage 01 / 02
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
// Form — main editing surface
// ---------------------------------------------------------------------------

interface FormProps {
  mod: UpdraftMod;
  modMode: UpdraftModMode;
  savePhase: 'idle' | 'saving' | 'saved' | 'error';
  continuePhase: 'idle' | 'advancing' | 'error';
  continueError: string | null;
  updateMod: (patch: Partial<UpdraftMod>) => void;
  updateRole: (idx: number, patch: Partial<UpdraftRoleInMod>) => void;
  updateBullet: (roleIdx: number, bulletIdx: number, text: string) => void;
  addBullet: (roleIdx: number) => void;
  removeBullet: (roleIdx: number, bulletIdx: number) => void;
  advance: () => Promise<void>;
}

function Stage03Form(p: FormProps) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Build your story</h1>
        <p className="text-sm text-[#cbd5e1]">
          {p.modMode === 'full'
            ? 'Walk through your career, edit anything Audit pulled wrong, surface what got buried. Auto-saves as you go.'
            : "Lightweight build — just enough to power the JD-tailored output. You can come back for a full MOD pass later. Auto-saves as you go."}
        </p>
        <SaveIndicator phase={p.savePhase} />
      </header>

      <RolesSection
        roles={p.mod.experience}
        updateRole={p.updateRole}
        updateBullet={p.updateBullet}
        addBullet={p.addBullet}
        removeBullet={p.removeBullet}
      />

      <EarlierCareerSection
        entries={p.mod.earlier_career}
        onChange={(earlier_career) => p.updateMod({ earlier_career })}
      />

      <EducationSection
        entries={p.mod.education}
        onChange={(education) => p.updateMod({ education })}
      />

      <SkillsSection
        skills={p.mod.skills}
        onChange={(skills) => p.updateMod({ skills })}
      />

      {p.modMode === 'full' && (
        <Tier2Section
          mod={p.mod}
          updateMod={p.updateMod}
        />
      )}

      <div className="border-t border-[#1F1F1F] pt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          When you continue, Audit drafts your executive summary in the
          background and lands you on the review page — you&apos;ll get to
          edit or regenerate it before files render.
        </p>
        <button
          type="button"
          onClick={p.advance}
          disabled={p.continuePhase === 'advancing'}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
        >
          {p.continuePhase === 'advancing' ? 'Drafting summary…' : 'Continue → review summary'}
        </button>
      </div>

      {p.continueError && (
        <p role="alert" className="text-sm text-red-400">
          {p.continueError}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save indicator
// ---------------------------------------------------------------------------

function SaveIndicator({ phase }: { phase: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (phase === 'idle') return null;
  const map = {
    saving: { label: 'Saving…', color: 'text-[#94A3B8]' },
    saved: { label: 'Saved', color: 'text-[#10B981]' },
    error: { label: 'Save failed — your changes may not persist', color: 'text-red-400' },
  } as const;
  const { label, color } = map[phase];
  return <p className={`text-[11px] ${color} font-mono uppercase tracking-widest`}>{label}</p>;
}

// ---------------------------------------------------------------------------
// Roles section
// ---------------------------------------------------------------------------

function RolesSection({
  roles,
  updateRole,
  updateBullet,
  addBullet,
  removeBullet,
}: {
  roles: UpdraftRoleInMod[];
  updateRole: (idx: number, patch: Partial<UpdraftRoleInMod>) => void;
  updateBullet: (roleIdx: number, bulletIdx: number, text: string) => void;
  addBullet: (roleIdx: number) => void;
  removeBullet: (roleIdx: number, bulletIdx: number) => void;
}) {
  return (
    <Section title="Recent roles" subtitle="Last ~10 years. Edit anything that was pulled wrong.">
      {roles.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">— no roles yet —</p>
      ) : (
        <div className="space-y-6">
          {roles.map((role, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Company"
                  value={role.company}
                  onChange={(v) => updateRole(i, { company: v })}
                />
                <Input
                  label="Title"
                  value={role.title}
                  onChange={(v) => updateRole(i, { title: v })}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Start (YYYY-MM)"
                  value={role.start_date}
                  onChange={(v) => updateRole(i, { start_date: v })}
                />
                <Input
                  label="End (YYYY-MM or Present)"
                  value={role.end_date}
                  onChange={(v) => updateRole(i, { end_date: v })}
                />
                <Input
                  label="Location"
                  value={role.location ?? ''}
                  onChange={(v) => updateRole(i, { location: v.trim() === '' ? null : v })}
                />
              </div>
              <Textarea
                label="Context (1-2 sentences)"
                value={role.context}
                onChange={(v) => updateRole(i, { context: v })}
                rows={2}
                placeholder="What was the company / your team / your scope at this role?"
              />

              <div>
                <p className="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Bullets ({role.bullets.length})
                </p>
                <div className="space-y-2">
                  {role.bullets.map((b, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <textarea
                        value={b.text}
                        onChange={(e) => updateBullet(i, j, e.target.value)}
                        rows={2}
                        className="flex-1 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg resize-y leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => removeBullet(i, j)}
                        title="Remove this bullet"
                        className="text-[#64748b] hover:text-red-400 transition-colors text-xs px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addBullet(i)}
                  className="mt-3 text-xs text-[#7C3AED] hover:text-[#a855f7] transition-colors"
                >
                  + Add bullet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Earlier career section
// ---------------------------------------------------------------------------

function EarlierCareerSection({
  entries,
  onChange,
}: {
  entries: UpdraftEarlierCareerEntry[];
  onChange: (entries: UpdraftEarlierCareerEntry[]) => void;
}) {
  const update = (idx: number, patch: Partial<UpdraftEarlierCareerEntry>) => {
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...entries, { company: '', title: '', dates: '' }]);

  return (
    <Section
      title="Earlier career"
      subtitle="Older than ~10 years. One line each — no bullets needed."
    >
      {entries.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">— none yet —</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, i) => (
            <li
              key={i}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 grid sm:grid-cols-12 gap-2 items-center"
            >
              <input
                value={e.company}
                onChange={(ev) => update(i, { company: ev.target.value })}
                placeholder="Company"
                className="sm:col-span-4 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
              />
              <input
                value={e.title}
                onChange={(ev) => update(i, { title: ev.target.value })}
                placeholder="Title"
                className="sm:col-span-4 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
              />
              <input
                value={e.dates}
                onChange={(ev) => update(i, { dates: ev.target.value })}
                placeholder="2008-01 – 2012-06"
                className="sm:col-span-3 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                title="Remove this entry"
                className="sm:col-span-1 text-[#64748b] hover:text-red-400 transition-colors text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="mt-3 text-xs text-[#7C3AED] hover:text-[#a855f7] transition-colors"
      >
        + Add earlier role
      </button>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Education section
// ---------------------------------------------------------------------------

function EducationSection({
  entries,
  onChange,
}: {
  entries: UpdraftMod['education'];
  onChange: (entries: UpdraftMod['education']) => void;
}) {
  const update = (
    idx: number,
    patch: Partial<UpdraftMod['education'][number]>,
  ) => onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx));
  const add = () =>
    onChange([
      ...entries,
      { institution: '', degree: null, start_year: null, end_year: null },
    ]);

  const num = (s: string): number | null => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <Section title="Education + equivalent" subtitle="Degrees, certs, bootcamps, military, self-directed.">
      {entries.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">— none yet —</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, i) => (
            <li
              key={i}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 grid sm:grid-cols-12 gap-2"
            >
              <input
                value={e.institution}
                onChange={(ev) => update(i, { institution: ev.target.value })}
                placeholder="Institution"
                className="sm:col-span-5 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
              />
              <input
                value={e.degree ?? ''}
                onChange={(ev) =>
                  update(i, { degree: ev.target.value.trim() === '' ? null : ev.target.value })
                }
                placeholder="Degree / cert"
                className="sm:col-span-4 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
              />
              <input
                value={e.start_year?.toString() ?? ''}
                onChange={(ev) => update(i, { start_year: num(ev.target.value) })}
                placeholder="Start"
                className="sm:col-span-1 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg font-mono text-xs"
              />
              <input
                value={e.end_year?.toString() ?? ''}
                onChange={(ev) => update(i, { end_year: num(ev.target.value) })}
                placeholder="End"
                className="sm:col-span-1 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                title="Remove this entry"
                className="sm:col-span-1 text-[#64748b] hover:text-red-400 transition-colors text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="mt-3 text-xs text-[#7C3AED] hover:text-[#a855f7] transition-colors"
      >
        + Add education
      </button>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Skills section
// ---------------------------------------------------------------------------

function SkillsSection({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...skills, trimmed]);
    setDraft('');
  };

  const remove = (idx: number) => onChange(skills.filter((_, i) => i !== idx));

  return (
    <Section title="Skills" subtitle="5+ keyword-aligned skills. The chip list goes onto the resume's skills section.">
      <div className="flex flex-wrap gap-2 mb-3">
        {skills.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">— none yet —</p>
        ) : (
          skills.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-3 py-1 text-xs text-[#cbd5e1]"
            >
              {s}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-[#64748b] hover:text-red-400 transition-colors"
                title="Remove skill"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill and press Enter"
          className="flex-1 bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
        />
        <button
          type="button"
          onClick={add}
          className="bg-[#1A1A1A] hover:bg-[#1F1F1F] border border-[#2A2A2A] text-white px-4 py-2 text-xs rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Tier 2 deepening — through-line / tools / objections
// ---------------------------------------------------------------------------

function Tier2Section({
  mod,
  updateMod,
}: {
  mod: UpdraftMod;
  updateMod: (patch: Partial<UpdraftMod>) => void;
}) {
  return (
    <Section
      title="The through-line"
      subtitle="A few extra signals that sharpen Stage 04. All optional — skip what doesn't apply."
    >
      <div className="space-y-4">
        <Textarea
          label="Cross-role through-line"
          subtitle="One sentence. The thing you keep doing well, regardless of company."
          value={mod.through_line ?? ''}
          onChange={(v) => updateMod({ through_line: v })}
          rows={2}
        />
        <Textarea
          label="Tools / stack"
          subtitle="Real tools you use weekly or daily — not the LinkedIn skill list."
          value={mod.tools_stack ?? ''}
          onChange={(v) => updateMod({ tools_stack: v })}
          rows={3}
          placeholder="SQL (Postgres flavor), Looker, Linear, Slack, Salesforce, …"
        />
        <Textarea
          label="What you're tired of explaining in interviews"
          subtitle="One per line. Things hiring managers ask that frustrate you — Stage 04 will preempt them."
          value={(mod.interview_objections ?? []).join('\n')}
          onChange={(v) =>
            updateMod({
              // Keep raw line splits — no per-keystroke trim/filter.
              // Trimming on every change strips trailing spaces as the
              // user types them; filtering empties drops newlines mid-edit.
              // Consumers (cover-letter-generator, docx-builder, summary
              // seed) filter empties + trim at consumption time.
              interview_objections: v.split('\n'),
            })
          }
          rows={3}
          placeholder={'"Are you really technical?"\n"Why so many roles?"'}
        />
      </div>
    </Section>
  );
}

// (SummarySection used to live here. Summary review moved to Stage 04
// in v0.5: Stage 03 advance auto-drafts the summary in the background;
// the user reviews / edits / regenerates it on the Stage 04 picker page
// before clicking Generate. See Stage04Runner's SummaryPanel for the
// new home of this UI.)

// ---------------------------------------------------------------------------
// Reusable form atoms
// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className="text-xs text-[#94A3B8] mt-1 mb-4">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
      />
    </div>
  );
}

function Textarea({
  label,
  subtitle,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  subtitle?: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {subtitle && <p className="text-[11px] text-[#64748b] mb-1.5">{subtitle}</p>}
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#7C3AED] px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg resize-y leading-relaxed"
      />
    </div>
  );
}
