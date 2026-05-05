'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UpdraftSessionSummary } from '@/types';

interface DashboardProps {
  email: string;
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

function statusLabel(status: UpdraftSessionSummary['status']): string {
  if (status === 'completed') return 'COMPLETE';
  if (status === 'in_progress') return 'IN PROGRESS';
  return 'ABANDONED';
}

function statusClass(status: UpdraftSessionSummary['status']): string {
  if (status === 'completed') return 'text-[#10B981]';
  if (status === 'in_progress') return 'text-[#7C3AED]';
  return 'text-[#94A3B8]';
}

export default function Dashboard({ email, sessions }: DashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <header className="border-b border-[#1F1F1F]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-widest text-[#7C3AED] uppercase">
              UpDraft · by BAD Labs
            </p>
            <p className="text-sm text-[#94A3B8] mt-1">
              Signed in as <span className="text-white">{email}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/updraft/account"
              className="text-xs text-[#94A3B8] hover:text-white transition-colors"
            >
              Account
            </Link>
            <span className="text-[#2A2A2A]">·</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-[#94A3B8] hover:text-white transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your sessions</h1>
            <p className="text-sm text-[#94A3B8] mt-2">
              Sessions auto-delete 30 days after last activity unless you mark
              them as kept. Account data lives until you delete it.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewSession}
            disabled={creatingSession}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {creatingSession ? 'Starting…' : '+ New session'}
          </button>
        </div>
        {createError && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {createError}
          </p>
        )}

        {sessions.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-12 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              No sessions yet
            </h2>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
              The 4-stage builder lands in the next slice. You&apos;re signed
              in and ready — sessions you start later will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#1F1F1F] border border-[#2A2A2A] rounded-lg overflow-hidden">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/updraft/${s.id}`}
                  className="px-5 py-4 flex items-center justify-between bg-[#1A1A1A] hover:bg-[#1F1F1F] transition-colors"
                >
                  <div>
                    <p className="text-sm text-white">
                      Session started {formatDate(s.startedAt)}
                    </p>
                    <p className={`text-xs mt-1 ${statusClass(s.status)}`}>
                      {statusLabel(s.status)}
                      {s.tier ? ` · TIER ${s.tier}` : ''}
                      {s.path ? ` · ${s.path.toUpperCase()}` : ''}
                      {s.keepIndefinitely ? ' · KEPT' : ''}
                    </p>
                  </div>
                  <span className="text-xs text-[#64748b]">
                    Last activity: {formatDate(s.lastActivityAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-[#64748b] mt-10">
          Account controls (delete-my-data, data export) ship with the
          /updraft/account page in a later slice.
        </p>
      </section>
    </main>
  );
}
