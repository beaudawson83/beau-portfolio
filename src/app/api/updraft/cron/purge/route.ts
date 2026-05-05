import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import {
  deleteSessionByIdPrivileged,
  findPurgeCandidates,
  logEvent,
} from '@/lib/updraft/store';
import { deleteSessionStorage } from '@/lib/updraft/storage';

const PURGE_AFTER_DAYS = 30;

/**
 * POST /api/updraft/cron/purge
 *
 * 30-day inactivity purge. Hits sessions where last_activity_at is older
 * than the cutoff AND keep_indefinitely=false. For each:
 *   1. Delete Storage files under the session's prefix
 *   2. Delete the session row (FK cascade cleans events + exports rows)
 *
 * The user account itself is preserved — purge only nukes session-level
 * data per the privacy posture in PLAN.md §7.3 (account stays so the
 * user can return; only the PII-bearing session content goes away).
 *
 * Auth: Authorization: Bearer $CRON_SECRET. Vercel Cron supplies this
 * header automatically via the schedule entry in vercel.json. Manual
 * invocation works too (curl -H "Authorization: Bearer …").
 *
 * GET is also accepted because Vercel Cron uses GET by default.
 */
async function handler(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_AFTER_DAYS);
  const cutoffIso = cutoff.toISOString();

  const candidates = await findPurgeCandidates({ cutoffIso, limit: 200 });
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      purged: 0,
      cutoff: cutoffIso,
      message: 'No sessions eligible for purge.',
    });
  }

  let purged = 0;
  let storageRemoved = 0;
  let storageErrors = 0;
  let dbErrors = 0;
  const failures: { sessionId: string; reason: string }[] = [];

  for (const c of candidates) {
    // 1. Storage files first
    const storage = await deleteSessionStorage({
      userId: c.userId,
      sessionId: c.sessionId,
    });
    if (storage.ok) storageRemoved += storage.removed;
    else {
      storageErrors += 1;
      // Log but proceed — orphaned files are recoverable; a stuck purge
      // entry would just keep failing. Better to remove the row and
      // accept some leaked bytes than block the whole pipeline.
    }

    // 2. Audit-log the purge BEFORE deleting (event row will cascade out
    // when the session is deleted, so this is mostly for the logs).
    await logEvent({
      sessionId: c.sessionId,
      stage: 'system',
      eventType: 'session_purged',
      data: {
        last_activity_at: c.lastActivityAt,
        cutoff: cutoffIso,
        storage_removed: storage.removed,
        storage_ok: storage.ok,
      },
    });

    // 3. Delete the session row (FK cascade handles events + exports rows)
    const ok = await deleteSessionByIdPrivileged(c.sessionId);
    if (!ok) {
      dbErrors += 1;
      failures.push({ sessionId: c.sessionId, reason: 'db-delete-failed' });
      continue;
    }
    purged += 1;
  }

  return NextResponse.json({
    ok: true,
    purged,
    candidates: candidates.length,
    storage_removed: storageRemoved,
    storage_errors: storageErrors,
    db_errors: dbErrors,
    cutoff: cutoffIso,
    failures: failures.slice(0, 20),
  });
}

export { handler as GET, handler as POST };
