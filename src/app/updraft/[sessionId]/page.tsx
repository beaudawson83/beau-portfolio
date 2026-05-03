import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { findUserById, readSessionForUser } from '@/lib/updraft/store';
import Stage01Runner from '@/components/Updraft/Stage01/Stage01Runner';

export const metadata: Metadata = {
  title: 'UpDraft session',
  description: 'Resume builder session.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UpdraftSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const userId = await readSessionUserIdFromCookies();
  if (!userId) redirect('/updraft/login');
  const user = await findUserById(userId);
  if (!user) redirect('/updraft/login?err=account-error');

  const session = await readSessionForUser(sessionId, userId);
  if (!session) notFound();

  return <Stage01Runner session={session} userEmail={user.email} />;
}
