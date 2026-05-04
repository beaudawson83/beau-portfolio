import { NextRequest, NextResponse } from 'next/server';
import {
  readSessionCookieValue,
  SESSION_COOKIE_NAME,
} from '@/lib/updraft/auth';
import { readExportForSession } from '@/lib/updraft/store';
import { signedDownloadUrl } from '@/lib/updraft/storage';

/**
 * GET /api/updraft/sessions/[id]/exports/[exportId]
 *
 * Auth-gated download. Verifies the requesting user owns the session,
 * then redirects to a 10-min signed Supabase Storage URL. The signed URL
 * is the actual file download — this endpoint is the auth gate that
 * prevents another logged-in user from guessing your export id.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; exportId: string }> },
) {
  const { id: sessionId, exportId } = await ctx.params;

  const userId = readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const exp = await readExportForSession(exportId, sessionId, userId);
  if (!exp) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const url = await signedDownloadUrl(exp.storage_path);
  if (!url) {
    return NextResponse.json({ error: 'signing-failed' }, { status: 500 });
  }
  return NextResponse.redirect(url);
}
