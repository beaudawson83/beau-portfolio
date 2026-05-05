// UpDraft DOCX → PDF rendering via Google Drive API.
//
// Why Drive API: free within Google's generous quotas, leverages Beau's
// existing Google ecosystem, and Google Docs is the intermediate format
// so the text layer is preserved end-to-end (same engine you'd use to
// File → Download as PDF in Google Docs). Beats CloudConvert (per-conversion
// cost) and beats Vercel Sandbox + LibreOffice (6-10 hr setup, custom image
// management). When v0.5 needs more capacity / fully-owned infrastructure,
// the renderPdf() interface stays the same — we swap this file's body.
//
// Flow per conversion:
//   1. Upload DOCX as a Google Doc (Drive's import does the conversion)
//   2. Export the Google Doc as PDF (Drive's native export is text-layer-clean)
//   3. Delete the temp Google Doc (best-effort; orphaned docs are auto-trashed
//      by Drive after 30 days but we explicit-delete to keep things tidy)
//
// Auth: service account JWT minted via google-auth-library, exchanged for
// a 1-hour OAuth access token. Token cached in module scope across function
// invocations so we don't re-mint on every request (Fluid Compute reuses
// instances; this is the right pattern).
//
// The service account's JSON key is stored base64-encoded in the
// UPDRAFT_GOOGLE_SA_JSON_B64 env var. Scope: drive.file (per-file access
// only — service account can only see/manipulate files it created itself).

import 'server-only';
import { JWT } from 'google-auth-library';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const PDF_MIME = 'application/pdf';

// ---------------------------------------------------------------------------
// Auth client — JWT minted from the service-account JSON, cached
// ---------------------------------------------------------------------------

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  // (other fields exist but we only need these two)
}

let cachedClient: JWT | null = null;

function getAuthClient(): JWT | null {
  if (cachedClient) return cachedClient;

  const b64 = process.env.UPDRAFT_GOOGLE_SA_JSON_B64;
  if (!b64) {
    console.error('updraft.pdf: UPDRAFT_GOOGLE_SA_JSON_B64 not configured');
    return null;
  }
  let key: ServiceAccountKey;
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    key = JSON.parse(json) as ServiceAccountKey;
  } catch (err) {
    console.error('updraft.pdf: failed to decode service account JSON', err);
    return null;
  }
  if (!key.client_email || !key.private_key) {
    console.error('updraft.pdf: service account JSON missing required fields');
    return null;
  }

  cachedClient = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: DRIVE_SCOPES,
  });
  return cachedClient;
}

export function isPdfRendererConfigured(): boolean {
  return Boolean(process.env.UPDRAFT_GOOGLE_SA_JSON_B64);
}

async function getAccessToken(): Promise<string | null> {
  const client = getAuthClient();
  if (!client) return null;
  try {
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token ?? null;
  } catch (err) {
    console.error('updraft.pdf: getAccessToken failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RenderPdfArgs {
  docxBytes: Buffer | Uint8Array;
  /** Filename used during the Drive import — mostly cosmetic, keeps Drive's
   *  audit log readable. Default: "input.docx". */
  filename?: string;
}

export type RenderPdfResult =
  | { ok: true; pdfBytes: Buffer; bytes: number; engine: 'google-drive' }
  | { ok: false; error: string };

export async function renderPdf(args: RenderPdfArgs): Promise<RenderPdfResult> {
  if (!isPdfRendererConfigured()) {
    return { ok: false, error: 'UPDRAFT_GOOGLE_SA_JSON_B64 not configured' };
  }
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: 'Could not mint Google access token' };
  }
  const filename = args.filename ?? 'input.docx';

  // 1. Upload DOCX as a Google Doc — multipart upload with a metadata part
  // that requests conversion via mimeType=application/vnd.google-apps.document.
  // Drive's importer recognizes the source mime and runs the same converter
  // it uses when you drag-drop a Word doc into a Drive folder.
  const importResult = await uploadAsGoogleDoc({
    token,
    docxBytes: Buffer.from(args.docxBytes),
    filename,
  });
  if (!importResult.ok) return { ok: false, error: importResult.error };
  const docId = importResult.fileId;

  // 2. Export the Google Doc as PDF. Always best-effort delete the temp Doc
  // when this scope exits, success or fail.
  let pdfBytes: Buffer | null = null;
  let exportError: string | null = null;
  try {
    const exportResult = await exportAsPdf({ token, fileId: docId });
    if (!exportResult.ok) {
      exportError = exportResult.error;
    } else {
      pdfBytes = exportResult.pdfBytes;
    }
  } finally {
    // 3. Delete the temp Google Doc. Don't surface failures — Drive auto-
    // trashes after 30 days, and a delete-failure shouldn't fail a successful
    // PDF render.
    void deleteFile({ token, fileId: docId });
  }

  if (!pdfBytes) {
    return { ok: false, error: exportError ?? 'PDF export failed' };
  }
  return {
    ok: true,
    pdfBytes,
    bytes: pdfBytes.length,
    engine: 'google-drive',
  };
}

// ---------------------------------------------------------------------------
// Internal: Drive API calls
// ---------------------------------------------------------------------------

async function uploadAsGoogleDoc(args: {
  token: string;
  docxBytes: Buffer;
  filename: string;
}): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  // Multipart upload with metadata + binary parts. Build manually because
  // FormData / multipart-related boundaries are fiddly with the Drive
  // multipart upload format (it expects a specific body shape, not standard
  // form-data).
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: args.filename,
    mimeType: GOOGLE_DOC_MIME, // tells Drive: convert into Google Docs format
  };
  const metadataPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`;
  const filePartHeader =
    `--${boundary}\r\n` +
    `Content-Type: ${DOCX_MIME}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(metadataPart, 'utf8'),
    Buffer.from(filePartHeader, 'utf8'),
    args.docxBytes,
    Buffer.from(closing, 'utf8'),
  ]);

  let res: Response;
  try {
    res = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&supportsAllDrives=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        body,
      },
    );
  } catch (err) {
    console.error('updraft.pdf.upload: network error', err);
    return { ok: false, error: 'Drive upload failed (network)' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('updraft.pdf.upload: non-2xx', res.status, text.slice(0, 500));
    return {
      ok: false,
      error: `Drive upload ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    return { ok: false, error: 'Drive upload returned no file id' };
  }
  return { ok: true, fileId: data.id };
}

async function exportAsPdf(args: {
  token: string;
  fileId: string;
}): Promise<{ ok: true; pdfBytes: Buffer } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(
      `${DRIVE_BASE}/files/${args.fileId}/export?mimeType=${encodeURIComponent(PDF_MIME)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${args.token}` },
      },
    );
  } catch (err) {
    console.error('updraft.pdf.export: network error', err);
    return { ok: false, error: 'Drive export failed (network)' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('updraft.pdf.export: non-2xx', res.status, text.slice(0, 500));
    return {
      ok: false,
      error: `Drive export ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const arrayBuf = await res.arrayBuffer();
  return { ok: true, pdfBytes: Buffer.from(arrayBuf) };
}

async function deleteFile(args: { token: string; fileId: string }): Promise<void> {
  try {
    const res = await fetch(`${DRIVE_BASE}/files/${args.fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${args.token}` },
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => '');
      console.warn('updraft.pdf.delete: non-2xx (non-fatal)', res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.warn('updraft.pdf.delete: network error (non-fatal)', err);
  }
}
