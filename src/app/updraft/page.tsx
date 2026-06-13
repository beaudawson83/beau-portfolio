import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { findUserById, listSessionsFullForUser } from '@/lib/updraft/store';
import type { UpdraftDashboardSession } from '@/types';
import Dashboard from '@/components/Updraft/Dashboard';

export const metadata: Metadata = {
  title: 'UpDraft',
  description: 'Resume + cover-letter builder by BAD Labs.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UpdraftDashboardPage() {
  const userId = await readSessionUserIdFromCookies();
  if (!userId) redirect('/updraft/login');

  const user = await findUserById(userId);
  if (!user) {
    // Cookie pointed at a deleted account. Force re-auth.
    redirect('/updraft/login?err=account-error');
  }

  // Read full sessions so we can derive the workspace fields (target role,
  // MOD-eligibility) without a second round-trip. Single user, capped list —
  // reading stage_outputs here is cheap and keeps the payload off the client.
  const full = await listSessionsFullForUser(user.id);
  const sessions: UpdraftDashboardSession[] = full.map((s) => {
    const stage02 = (s.stageOutputs.stage_02 ?? {}) as {
      target?: { role_title?: string; company?: string };
    };
    const stage03 = (s.stageOutputs.stage_03 ?? {}) as {
      mod?: unknown;
      ready_for_generation?: boolean;
    };
    return {
      id: s.id,
      status: s.status,
      tier: s.tier,
      path: s.path,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      lastActivityAt: s.lastActivityAt,
      keepIndefinitely: s.keepIndefinitely,
      hasMod: Boolean(stage03.ready_for_generation && stage03.mod),
      targetRole: stage02.target?.role_title?.trim() || null,
      targetCompany: stage02.target?.company?.trim() || null,
    };
  });

  return (
    <Dashboard
      email={user.email}
      sessions={sessions}
      activeModSessionId={user.activeModSessionId}
    />
  );
}
