-- Blog (Terminal Notebook) — schema for Supabase / Postgres.
-- Run in the Supabase SQL editor; idempotent and safe to re-run.
--
-- One table:
--   blog_posts — each row is a post. Body is a jsonb array of block objects;
--                see src/types/index.ts (BlogBlock) for block shapes.
--
-- Reads: anon can SELECT only published posts whose publish_at is in the past.
-- Writes: gated server-side via BLOG_EDITOR_SECRET (Bearer header) + the
--         service-role key. RLS denies all anon writes by default.

create extension if not exists "pgcrypto";

-- ===========================================================================
-- POSTS
-- ===========================================================================
create table if not exists blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null default '',
  dek             text not null default '',
  category        text,                                                       -- 'OPS' | 'AI' | 'CRAFT' | 'NOTE'
  tags            text[] not null default '{}',
  cover_id        text not null default 'cover-mesh',                         -- preset id or 'cover-photo' or 'none'
  cover_url       text,                                                       -- only set when cover_id='cover-photo' (paste URL)
  body            jsonb not null default '[]'::jsonb,                         -- BlogBlock[]
  word_count      integer not null default 0,
  read_time       integer not null default 1,
  seo_description text not null default '',
  status          text not null default 'draft' check (status in ('draft','scheduled','published')),
  publish_at      timestamptz,                                                -- when scheduled/published, the moment it goes live
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_blog_posts_slug
  on blog_posts (slug);

create index if not exists idx_blog_posts_published
  on blog_posts (publish_at desc)
  where status = 'published';

create index if not exists idx_blog_posts_status
  on blog_posts (status, updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function tg_blog_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_updated_at on blog_posts;
create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function tg_blog_posts_updated_at();

-- ===========================================================================
-- ROW-LEVEL SECURITY
-- Public can read published posts only. Writes go via service-role.
-- ===========================================================================
alter table blog_posts enable row level security;

drop policy if exists "anon read published" on blog_posts;
drop policy if exists "auth read published" on blog_posts;

-- Anon sees only posts whose status is 'published' AND whose publish_at has passed.
create policy "anon read published" on blog_posts
  for select to anon
  using (status = 'published' and publish_at is not null and publish_at <= now());

create policy "auth read published" on blog_posts
  for select to authenticated
  using (status = 'published' and publish_at is not null and publish_at <= now());
