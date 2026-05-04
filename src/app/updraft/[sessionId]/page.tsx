import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import {
  findUserById,
  listExportsForSession,
  readSessionForUser,
} from '@/lib/updraft/store';
import Stage01Runner from '@/components/Updraft/Stage01/Stage01Runner';
import Stage02Runner from '@/components/Updraft/Stage02/Stage02Runner';
import Stage03Runner from '@/components/Updraft/Stage03/Stage03Runner';
import Stage04Runner from '@/components/Updraft/Stage04/Stage04Runner';

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
  const s02 = (session.stageOutputs.stage_02 ?? {}) as { acknowledged?: boolean };
  const s03 = (session.stageOutputs.stage_03 ?? {}) as { ready_for_generation?: boolean };

  if (!s01.tier) {
    return <Stage01Runner session={session} userEmail={user.email} />;
  }
  if (!s02.acknowledged) {
    return <Stage02Runner session={session} userEmail={user.email} />;
  }
  if (!s03.ready_for_generation) {
    return <Stage03Runner session={session} userEmail={user.email} />;
  }
  // Stage 03 is locked in; Stage 04 generates the DOCX exports.
  const exports = await listExportsForSession(session.id, user.id);
  const exportSummaries = exports.map((e) => ({
    id:           e.id,
    kind:         e.kind,
    filename:     e.filename,
    bytes:        e.bytes,
    generated_at: e.generated_at,
  }));
  return (
    <Stage04Runner
      session={session}
      userEmail={user.email}
      exports={exportSummaries}
    />
  );
}
