// Client-side image upload helper. Pulls the editor secret from
// localStorage (set by AuthGate) and routes browser → Supabase via a
// one-shot signed URL.

import { readEditorSecret } from './AuthGate';

export interface UploadResult {
  publicUrl: string;
  path: string;
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

export class UploadError extends Error {}

export async function uploadImage(file: File): Promise<UploadResult> {
  const secret = readEditorSecret();
  if (!secret) throw new UploadError('Not authenticated.');

  if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
    throw new UploadError(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError(`File too large (max ${MAX_IMAGE_MB} MB).`);
  }

  // 1) Ask the server for a one-shot signed upload URL.
  const sign = await fetch('/api/blog/media/sign', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!sign.ok) {
    const body = await sign.json().catch(() => ({}));
    throw new UploadError(body.error || `sign failed: HTTP ${sign.status}`);
  }
  const { uploadUrl, publicUrl, path } = (await sign.json()) as UploadResult & {
    uploadUrl: string;
  };

  // 2) PUT the file body directly to Supabase Storage.
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!upload.ok) {
    throw new UploadError(`upload failed: HTTP ${upload.status}`);
  }

  return { publicUrl, path };
}
