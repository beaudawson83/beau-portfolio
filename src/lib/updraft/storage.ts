// UpDraft Supabase Storage helpers.
//
// Bucket: 'updraft-exports' (private, signed-URL reads only). Path scheme
// per setup-supabase-updraft-storage.sql:
//   users/{user_id}/sessions/{session_id}/exports/{filename}
//
// Writes use the service-role client (bypasses RLS by design); reads
// produce time-limited signed URLs the client can fetch directly.

import 'server-only';
import { getServerSupabase, isSupabaseConfigured } from '../supabase';

const BUCKET = 'updraft-exports';
const SIGNED_URL_TTL_SECONDS = 60 * 10;                    // 10 min

export function buildExportPath(args: {
  userId: string;
  sessionId: string;
  filename: string;
}): string {
  return `users/${args.userId}/sessions/${args.sessionId}/exports/${args.filename}`;
}

export interface UploadExportArgs {
  path: string;
  bytes: Buffer | Uint8Array;
  mime: string;
}

export async function uploadExport(args: UploadExportArgs): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'supabase-not-configured' };
  }
  const sb = getServerSupabase();
  const { error } = await sb.storage.from(BUCKET).upload(args.path, args.bytes, {
    contentType: args.mime,
    upsert: true,
  });
  if (error) {
    console.error('updraft.uploadExport:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function signedDownloadUrl(path: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getServerSupabase();
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error('updraft.signedDownloadUrl:', error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteExport(path: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const sb = getServerSupabase();
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error('updraft.deleteExport:', error);
    return false;
  }
  return true;
}

/**
 * Delete every file under the user's session prefix. Used by the cascade
 * paths (account delete + 30-day purge) — DB cascades clean up the
 * exports rows, but the actual bytes in Storage need explicit removal
 * or we leak files.
 */
export async function deleteSessionStorage(args: {
  userId: string;
  sessionId: string;
}): Promise<{ ok: boolean; removed: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, removed: 0, error: 'supabase-not-configured' };
  const sb = getServerSupabase();
  const prefix = `users/${args.userId}/sessions/${args.sessionId}/exports`;

  // 1. List everything under the prefix.
  const { data: files, error: listError } = await sb.storage.from(BUCKET).list(prefix, {
    limit: 100,                                      // a session shouldn't ever have >100 files
  });
  if (listError) {
    console.error('updraft.deleteSessionStorage list:', listError);
    return { ok: false, removed: 0, error: listError.message };
  }
  if (!files || files.length === 0) return { ok: true, removed: 0 };

  // 2. Build full paths and remove.
  const paths = files.map((f) => `${prefix}/${f.name}`);
  const { error: removeError } = await sb.storage.from(BUCKET).remove(paths);
  if (removeError) {
    console.error('updraft.deleteSessionStorage remove:', removeError);
    return { ok: false, removed: 0, error: removeError.message };
  }
  return { ok: true, removed: paths.length };
}
