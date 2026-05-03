import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { findUserById, listSessionsForUser } from '@/lib/updraft/store';
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

  const sessions = await listSessionsForUser(user.id);

  return <Dashboard email={user.email} sessions={sessions} />;
}
