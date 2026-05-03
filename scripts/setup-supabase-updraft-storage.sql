-- UpDraft — Supabase Storage bucket for generated export files.
-- Run in the Supabase SQL editor; idempotent and safe to re-run.
--
-- Layout:
--   bucket: 'updraft-exports' (PRIVATE; 5 MB cap; docx/pdf/md MIME allowlist)
--   path scheme: users/{user_id}/sessions/{session_id}/exports/{filename}
--
-- Reads: anon and authenticated are blocked. Files are served via signed URLs
--        generated server-side with the service-role key.
-- Writes: server-side only, via the service-role key. RLS denies all client
--         writes by default.
--
-- Note: only generated outputs land here. We do NOT persist raw user-uploaded
-- resumes — they're parsed in-memory and discarded once structured JSON is
-- extracted. Keeping this bucket output-only minimizes the PII surface.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'updraft-exports',
  'updraft-exports',
  false,
  5242880,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Default-deny for anon and authenticated. The bucket is private; the only
-- principal that touches it is service-role via signed-URL generation.
drop policy if exists "anon read updraft-exports"  on storage.objects;
drop policy if exists "auth read updraft-exports"  on storage.objects;
drop policy if exists "anon write updraft-exports" on storage.objects;
drop policy if exists "auth write updraft-exports" on storage.objects;
