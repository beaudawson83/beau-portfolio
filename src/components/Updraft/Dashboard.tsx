'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { UpdraftDashboardSession } from '@/types';

interface DashboardProps {
  email: string;
  sessions: UpdraftDashboardSession[];
  activeModSessionId: string | null;
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

function statusLabel(status: UpdraftDashboardSession['status']): string {
  if (status === 'completed') return 'COMPLETE';
  if (status === 'in_progress') return 'IN PROGRESS';
  return 'ABANDONED';
}

function statusClass(status: UpdraftDashboardSession['status']): string {
  if (status === 'completed') return 'text-success';
  if (status === 'in_progress') return 'text-accent-bright';
  return 'text-muted';
}

/** The headline label for a session row: target role when known, else a
 *  generic "started" line so every row has a stable title. */
function sessionTitle(s: UpdraftDashboardSession, mounted: boolean): string {
  if (s.targetRole && s.targetCompany) return `${s.targetRole} · ${s.targetCompany}`;
  if (s.targetRole) return s.targetRole;
  // Fallback title carries a formatted date — only render it post-mount so the
  // server/client markup matches (see the `mounted` note in the component).
  return mounted ? `Session started ${formatDate(s.startedAt)}` : 'Session started…';
}

export default function Dashboard({
  email,
  sessions,
  activeModSessionId,
}: DashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [retailoring, setRetailoring] = useState(false);

  // Active-MOD pointer. activeId is optimistic; pendingId marks the row
  // whose set/unset call is in flight (for disabling + label swap).
  const [activeId, setActiveId] = useState<string | null>(activeModSessionId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Locale/timezone-formatted dates differ between the server (UTC) and the
  // client (local tz). Rendering them during SSR makes the text mismatch on
  // hydration (React #418), which aborts hydration of this subtree and leaves
  // its click handlers (e.g. "Set as active MOD") dead. Gate all formatted
  // dates behind `mounted` so SSR and the first client render emit identical
  // markup; the real date fills in after mount.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/updraft/auth/logout', { method: 'POST' });
    } catch {
      /* even on network failure, the user can clear cookies manually */
    }
    router.push('/updraft/login');
    router.refresh();
  };

  const handleNewSession = async () => {
    setCreatingSession(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/updraft/sessions', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(body.error || 'Could not start a session.');
        setCreatingSession(false);
        return;
      }
      router.push(body.redirectTo || `/updraft/${body.sessionId}`);
    } catch {
      setCreateError('Network error. Try again.');
      setCreatingSession(false);
    }
  };

  const handleRetailor = async () => {
    setRetailoring(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/updraft/sessions/retailor', {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(
          body.error === 'no-mod'
            ? 'Your active MOD has no finished profile to tailor.'
            : body.error || 'Could not start a re-tailoring session.',
        );
        setRetailoring(false);
        return;
      }
      router.push(body.redirectTo || `/updraft/${body.sessionId}`);
    } catch {
      setCreateError('Network error. Try again.');
      setRetailoring(false);
    }
  };

  const setActiveMod = async (sessionId: string | null) => {
    const prev = activeId;
    setActionError(null);
    setPendingId(sessionId ?? prev); // the row being acted on
    setActiveId(sessionId); // optimistic
    try {
      const res = await fetch('/api/updraft/me/active-mod', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActiveId(prev); // rollback
        setActionError(
          body.error === 'no-mod'
            ? "That session doesn't have a finished profile to activate yet."
            : 'Could not update your active MOD. Try again.',
        );
      } else {
        router.refresh();
      }
    } catch {
      setActiveId(prev);
      setActionError('Network error. Try again.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="min-h-screen text-ink">
      <header className="border-b border-raised">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-wider text-accent-bright uppercase">
              UpDraft · by BAD Labs
            </p>
            <p className="text-sm text-muted mt-1">
              Signed in as <span className="text-white">{email}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/updraft/account"
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Account
            </Link>
            <span className="text-line">·</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-muted hover:text-white transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your sessions</h1>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              Your <span className="text-white">active MOD</span> is the master
              profile new tailored resumes start from — set it on any finished
              session below. Sessions auto-delete 30 days after last activity
              unless you mark them as kept.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
            {activeId && (
              <button
                type="button"
                onClick={handleRetailor}
                disabled={retailoring}
                className="border border-accent/50 bg-accent/10 text-accent-bright hover:bg-accent hover:text-white px-5 py-2.5 text-sm rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {retailoring ? 'Starting…' : 'Tailor to a new role'}
              </button>
            )}
            <button
              type="button"
              onClick={handleNewSession}
              disabled={creatingSession}
              className="bg-gradient-to-b from-accent-bright to-accent-deep hover:brightness-110 text-white shadow-[0_10px_30px_-12px_rgb(139_92_246/0.8),inset_0_1px_0_rgb(255_255_255/0.25)] px-5 py-2.5 text-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {creatingSession ? 'Starting…' : '+ New session'}
            </button>
          </div>
        </div>
        {createError && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {createError}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {actionError}
          </p>
        )}

        {sessions.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              No sessions yet
            </h2>
            <p className="text-sm text-muted max-w-md mx-auto">
              Start your first session to build a master profile. Once a
              session is finished you can mark it as your active MOD and tailor
              it to new roles.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-raised border border-line rounded-xl overflow-hidden">
            {sessions.map((s) => {
              const isActive = s.id === activeId;
              const isPending = pendingId === s.id;
              return (
                <li
                  key={s.id}
                  className={isActive ? 'bg-raised' : 'bg-surface'}
                >
                  <div className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-raised transition-colors">
                    <Link
                      href={`/updraft/${s.id}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate" suppressHydrationWarning>
                          {sessionTitle(s, mounted)}
                        </span>
                        {isActive && (
                          <span className="text-[11px] tracking-wider uppercase text-accent-bright border border-accent/40 rounded px-1.5 py-0.5">
                            Active MOD
                          </span>
                        )}
                      </p>
                      <p className={`text-xs mt-1 ${statusClass(s.status)}`}>
                        {statusLabel(s.status)}
                        {s.tier ? ` · TIER ${s.tier}` : ''}
                        {s.path ? ` · ${s.path.toUpperCase()}` : ''}
                        {s.keepIndefinitely ? ' · KEPT' : ''}
                      </p>
                    </Link>

                    <div className="flex items-center gap-4 shrink-0">
                      <span
                        className="text-xs text-faint hidden sm:block"
                        suppressHydrationWarning
                      >
                        {mounted ? formatDate(s.lastActivityAt) : ''}
                      </span>
                      {s.hasMod &&
                        (isActive ? (
                          <button
                            type="button"
                            onClick={() => setActiveMod(null)}
                            disabled={isPending}
                            className="text-xs text-muted hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isPending ? 'Updating…' : 'Unset'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveMod(s.id)}
                            disabled={isPending || pendingId !== null}
                            className="text-xs text-accent-bright hover:text-white border border-accent/40 hover:border-accent rounded px-2.5 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isPending ? 'Updating…' : 'Set as active MOD'}
                          </button>
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
