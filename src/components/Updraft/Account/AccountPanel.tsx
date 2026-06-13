'use client';

// Account / Privacy panel.
//
// Three sections: user info, session list with per-session keep + delete,
// and the danger-zone (data export + full account delete with email
// confirmation). Mirrors the privacy promises rendered on the login page
// — every promise (30-day purge, delete-anytime, self-serve export) has
// a real working control here.

import { FormEvent, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UpdraftSessionSummary } from '@/types';

interface Props {
  user: { email: string; createdAt: string };
  sessions: UpdraftSessionSummary[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function purgeEtaDays(lastActivityAt: string, keep: boolean): number | null {
  if (keep) return null;
  const last = new Date(lastActivityAt).getTime();
  const cutoffMs = 30 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((last + cutoffMs - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export default function AccountPanel({ user, sessions: initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [exportPhase, setExportPhase] = useState<'idle' | 'downloading'>('idle');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Locale/timezone-formatted dates and the `Date.now()`-based purge ETA differ
  // between the server (UTC) and the client (local tz), which mismatches on
  // hydration (React #418) and aborts hydration of this subtree — leaving its
  // keep/delete/export controls dead. Render those values only after mount so
  // SSR and the first client render emit identical markup.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const setKeep = async (sessionId: string, keep: boolean) => {
    // Optimistic
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, keepIndefinitely: keep } : s)),
    );
    try {
      const res = await fetch(`/api/updraft/sessions/${sessionId}/keep`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep }),
      });
      if (!res.ok) {
        // Roll back
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, keepIndefinitely: !keep } : s,
          ),
        );
      }
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, keepIndefinitely: !keep } : s,
        ),
      );
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session and its files? This cannot be undone.')) return;
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    try {
      await fetch(`/api/updraft/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {
      router.refresh();                                 // re-fetch on failure
    }
  };

  const downloadDataExport = () => {
    setExportPhase('downloading');
    // Browser-native download via direct nav. Endpoint sets
    // Content-Disposition: attachment, so this triggers a save dialog.
    window.location.href = '/api/updraft/me/data-export';
    setTimeout(() => setExportPhase('idle'), 1500);
  };

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <header className="border-b border-[#1F1F1F]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-widest text-[#7C3AED] uppercase">
              UpDraft · account
            </p>
            <p className="text-sm text-[#94A3B8] mt-1">
              <span className="text-white">{user.email}</span>
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

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Account overview */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Account</h1>
          <p className="text-sm text-[#cbd5e1] mb-6">
            Email-based account. No password to forget. We collect only what you
            see below — your email, the sessions you create, and the files those
            sessions generate.
          </p>
          <dl className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-[#94A3B8]">Email</dt>
              <dd className="text-white font-mono">{user.email}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[#94A3B8]">Account created</dt>
              <dd className="text-white" suppressHydrationWarning>
                {mounted ? formatDate(user.createdAt) : ''}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[#94A3B8]">Sessions</dt>
              <dd className="text-white">{sessions.length}</dd>
            </div>
          </dl>
        </div>

        {/* Sessions */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Your sessions</h2>
          <p className="text-sm text-[#cbd5e1] mb-4">
            Sessions auto-delete <span className="text-white">30 days after
            last activity</span> unless you mark them as kept. Toggle the keep
            flag on anything you want to hold onto. Manual delete cascades
            through every file generated by that session.
          </p>

          {sessions.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-8 text-center text-sm text-[#94A3B8]">
              No sessions yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#1F1F1F] border border-[#2A2A2A] rounded-lg overflow-hidden">
              {sessions.map((s) => {
                const eta = mounted
                  ? purgeEtaDays(s.lastActivityAt, s.keepIndefinitely)
                  : null;
                return (
                  <li
                    key={s.id}
                    className="px-5 py-4 bg-[#1A1A1A] flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/updraft/${s.id}`}
                        className="block text-sm text-white hover:text-[#7C3AED] transition-colors"
                      >
                        <span suppressHydrationWarning>
                          Session started{' '}
                          {mounted ? formatDate(s.startedAt) : '…'}
                        </span>
                      </Link>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {s.status.toUpperCase()}
                        {s.tier ? ` · TIER ${s.tier}` : ''}
                        {s.path ? ` · ${s.path.toUpperCase()}` : ''}
                      </p>
                      <p className="text-[11px] text-[#64748b] mt-1" suppressHydrationWarning>
                        Last activity: {mounted ? formatDate(s.lastActivityAt) : '…'}
                        {eta !== null && (
                          <span className="ml-2">
                            ·{' '}
                            <span className={eta <= 3 ? 'text-amber-400' : 'text-[#64748b]'}>
                              auto-deletes in {eta} day{eta === 1 ? '' : 's'}
                            </span>
                          </span>
                        )}
                        {s.keepIndefinitely && (
                          <span className="ml-2 text-[#10B981]">· kept indefinitely</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <label className="flex items-center gap-2 text-[11px] text-[#94A3B8] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.keepIndefinitely}
                          onChange={(e) => setKeep(s.id, e.target.checked)}
                          className="cursor-pointer accent-[#7C3AED]"
                        />
                        Keep
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteSession(s.id)}
                        className="text-[11px] text-[#94A3B8] hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Data export */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Download your data</h2>
          <p className="text-sm text-[#cbd5e1] mb-4">
            Get a JSON archive of everything we have on you — profile, every
            session, every event log entry, and signed download URLs for every
            generated file. GDPR-style portability, available any time.
          </p>
          <button
            type="button"
            onClick={downloadDataExport}
            disabled={exportPhase !== 'idle'}
            className="bg-[#1A1A1A] hover:bg-[#1F1F1F] border border-[#2A2A2A] hover:border-[#7C3AED] text-white px-5 py-2.5 text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            {exportPhase === 'downloading' ? 'Preparing…' : 'Download all my data (.json)'}
          </button>
        </div>

        {/* Danger zone */}
        <div className="border-t border-[#1F1F1F] pt-8">
          <h2 className="text-xl font-semibold mb-2 text-red-400">Delete my account</h2>
          <p className="text-sm text-[#cbd5e1] mb-4">
            Removes your account, every session, every file, every event. No
            recovery — this is the full GDPR right-to-erasure path. Magic-link
            tokens are also revoked. Won&apos;t be confirmed by email; the
            confirmation is the typed acknowledgement below.
          </p>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="bg-[#1A1A1A] hover:bg-red-950/30 border border-red-900/50 hover:border-red-500 text-red-400 hover:text-red-300 px-5 py-2.5 text-sm rounded-lg transition-colors font-medium"
          >
            Delete my account
          </button>
        </div>
      </section>

      {deleteModalOpen && (
        <DeleteModal
          email={user.email}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Delete modal (separate so its state doesn't clutter the panel)
// ---------------------------------------------------------------------------

function DeleteModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'idle' | 'deleting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    setPhase('deleting');
    setError(null);
    try {
      const res = await fetch('/api/updraft/me/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_email: typed.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Could not complete deletion.');
        setPhase('error');
        return;
      }
      setPhase('done');
      // Brief pause for the user to see the confirmation, then redirect.
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch {
      setError('Network error. Try again.');
      setPhase('error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={phase === 'idle' || phase === 'error' ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="bg-[#1A1A1A] border border-red-900/50 rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'done' ? (
          <div className="text-center">
            <p className="text-[10px] tracking-widest text-[#10B981] uppercase font-mono mb-3">
              Deletion complete
            </p>
            <h3 className="text-xl font-bold mb-2">Goodbye for now.</h3>
            <p className="text-sm text-[#cbd5e1]">
              All your UpDraft data has been removed. Redirecting…
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 id="delete-modal-title" className="text-xl font-bold mb-2 text-red-400">
              Delete my account
            </h3>
            <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">
              This removes everything we have on you. Type your full email
              below to confirm.
            </p>
            <p className="text-xs text-[#94A3B8] mb-2 font-mono">{email}</p>
            <input
              type="email"
              autoComplete="off"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your email exactly"
              disabled={phase === 'deleting'}
              className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-red-500 px-3 py-2 text-sm text-white outline-none transition-colors rounded-lg"
            />

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={phase === 'deleting'}
                className="text-xs text-[#94A3B8] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!matches || phase === 'deleting'}
                className="bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500 text-red-400 hover:text-red-300 px-5 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {phase === 'deleting' ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
