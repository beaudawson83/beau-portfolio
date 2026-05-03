import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { findUserById, readSessionForUser } from '@/lib/updraft/store';
import Stage01Runner from '@/components/Updraft/Stage01/Stage01Runner';
import Stage02Runner from '@/components/Updraft/Stage02/Stage02Runner';

export const metadata: Metadata = {
  title: 'UpDraft session',
  description: 'Resume builder session.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Decides which stage runner to render based on session state. Stage
 * completion is read off stage_outputs — there's no separate "stage_complete"
 * flag, since the spec defines completion criteria in terms of which fields
 * are populated.
 *
 *   stage 01 done = identity + path + tier all set (resume_parsed required for Path A)
 *   stage 02 done = acknowledged=true (set after match-briefing Continue or
 *                   immediately on MOD-only picker submit per spec §2.1 branching)
 */
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

  const s01 = (session.stageOutputs.stage_01 ?? {}) as { tier?: number };

  if (!s01.tier) {
    return <Stage01Runner session={session} userEmail={user.email} />;
  }
  // Stage 01 is complete; route everything else through Stage 02 for now.
  // Stage02Runner internally handles the post-acknowledge Stage 03 stub.
  // When Stage 03 ships, this dispatcher gets a third branch keyed off
  // stage_02.acknowledged.
  return <Stage02Runner session={session} userEmail={user.email} />;
}
