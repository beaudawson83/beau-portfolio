-- Blog (Terminal Notebook) — Supabase Storage bucket for cover + inline images.
-- Run in the Supabase SQL editor; idempotent and safe to re-run.
--
-- Layout:
--   bucket: 'blog-media' (public read; 10 MB cap; image MIME allowlist)
--   path scheme: posts/{yyyy}/{mm}/{shortId}-{filename}
--
-- Writes go through signed upload URLs generated server-side with the
-- service-role key (which bypasses RLS). Reads are public — anything in the
-- bucket is reachable by URL because rendered posts embed it directly.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read policies (the bucket is already `public=true`, but explicit
-- policies match the rest of the schema and survive future bucket flips).
drop policy if exists "anon read blog-media" on storage.objects;
drop policy if exists "auth read blog-media" on storage.objects;

create policy "anon read blog-media" on storage.objects
  for select to anon
  using (bucket_id = 'blog-media');

create policy "auth read blog-media" on storage.objects
  for select to authenticated
  using (bucket_id = 'blog-media');
