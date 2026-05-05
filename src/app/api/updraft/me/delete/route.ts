import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import {
  deleteUserCascade,
  findUserById,
  listSessionsFullForUser,
} from '@/lib/updraft/store';
import { deleteSessionStorage } from '@/lib/updraft/storage';

interface DeleteBody {
  /** Must match the user's email exactly (case-insensitive). Anti-misclick. */
  confirm_email?: string;
}

/**
 * POST /api/updraft/me/delete
 *
 * Full account hard-delete. Cascade order:
 *   1. List every session for this user
 *   2. Delete the Storage files under each session's prefix (DB cascade
 *      cleans the rows, but files in the bucket need explicit removal)
 *   3. Delete the user row — FK cascade on updraft_sessions, _events,
 *      _exports rows. Magic tokens (keyed by email) cleared explicitly
 *      inside deleteUserCascade.
 *   4. Clear the session cookie on the response so the user signs out.
 *
 * Confirmation gate: client must POST { confirm_email: "<the-email>" }
 * matching the signed-in user. Prevents accidental fire-button clicks.
 */
export async function POST(request: NextRequest) {
  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const confirm = (body.confirm_email ?? '').trim().toLowerCase();
  if (!confirm || confirm !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'confirmation-mismatch', message: 'Type your exact email to confirm.' },
      { status: 400 },
    );
  }

  // Step 1+2: collect sessions, blast their storage prefixes
  const sessions = await listSessionsFullForUser(user.id);
  let totalRemoved = 0;
  let storageErrors = 0;
  for (const s of sessions) {
    const result = await deleteSessionStorage({ userId: user.id, sessionId: s.id });
    if (result.ok) totalRemoved += result.removed;
    else storageErrors += 1;
  }

  // Step 3: hard-delete the user (FK cascade handles the DB rows)
  const result = await deleteUserCascade({ userId: user.id, email: user.email });
  if (!result.ok) {
    console.error('updraft.me.delete: cascade failed', result.error);
    return NextResponse.json(
      { error: 'delete-failed', message: 'Could not complete deletion. Try again.' },
      { status: 500 },
    );
  }

  // Step 4: clear cookie + return summary
  const response = NextResponse.json({
    ok: true,
    sessions_deleted: sessions.length,
    storage_files_removed: totalRemoved,
    storage_errors: storageErrors,
  });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
