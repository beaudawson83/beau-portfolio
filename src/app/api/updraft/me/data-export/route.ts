import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { findUserById } from '@/lib/updraft/store';
import { buildDataExport, dataExportFilename } from '@/lib/updraft/data-export';

/**
 * GET /api/updraft/me/data-export
 *
 * Self-serve GDPR/CCPA-style data portability. Returns a JSON archive
 * containing the user's profile + every session + per-session event log
 * + export-file metadata with fresh 10-min signed download URLs.
 *
 * Sets Content-Disposition so the browser downloads it as a file rather
 * than rendering inline.
 */
export async function GET(request: NextRequest) {
  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const archive = await buildDataExport(user);
  const filename = dataExportFilename(user);

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
