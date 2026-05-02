// Blog media — server-side signed-upload-URL generation for the editor.
//
// The editor calls POST /api/blog/media/sign with { filename, contentType,
// size }; this module validates and returns a one-shot upload URL the
// client PUTs to directly. The file flows browser → Supabase Storage,
// never proxying through our function (sidesteps Vercel's 4.5 MB body limit).

import { getServerSupabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'blog-media';
const MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_IMAGE_MB = 10;

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  path: string;
}

export type SignResult =
  | { ok: true; data: SignedUpload }
  | { ok: false; error: string; status: number };

export async function signUpload(opts: {
  filename: string;
  contentType: string;
  size: number;
}): Promise<SignResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Storage not configured', status: 503 };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(opts.contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      ok: false,
      error: `Unsupported file type: ${opts.contentType}`,
      status: 400,
    };
  }
  if (opts.size <= 0 || opts.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File too large (max ${MAX_IMAGE_MB} MB)`,
      status: 400,
    };
  }

  const path = generatePath(opts.filename);
  const sb = getServerSupabase();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('createSignedUploadUrl:', error);
    return { ok: false, error: 'Failed to create upload URL', status: 500 };
  }

  return {
    ok: true,
    data: {
      uploadUrl: data.signedUrl,
      publicUrl: buildPublicUrl(path),
      path,
    },
  };
}

function generatePath(filename: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const shortId = Math.random().toString(36).slice(2, 8);
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';
  return `posts/${yyyy}/${mm}/${shortId}-${safe}`;
}

function buildPublicUrl(path: string): string {
  const base =
    process.env.BEAU_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`;
}
