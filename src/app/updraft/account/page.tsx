import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { findUserById, listSessionsForUser } from '@/lib/updraft/store';
import AccountPanel from '@/components/Updraft/Account/AccountPanel';

export const metadata: Metadata = {
  title: 'Account — UpDraft',
  description: 'Manage your UpDraft account, sessions, and data.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UpdraftAccountPage() {
  const userId = await readSessionUserIdFromCookies();
  if (!userId) redirect('/updraft/login');
  const user = await findUserById(userId);
  if (!user) redirect('/updraft/login?err=account-error');

  const sessions = await listSessionsForUser(user.id);

  return (
    <AccountPanel
      user={{
        email: user.email,
        createdAt: user.createdAt,
      }}
      sessions={sessions}
    />
  );
}
