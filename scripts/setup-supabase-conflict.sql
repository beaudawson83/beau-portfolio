-- Conflict Heat Map — persistent journal schema for Supabase / Postgres.
-- Run this in your Supabase SQL editor (idempotent, safe to re-run).
--
-- Tables:
--   conflict_hotspots  — current state of every conflict we've ever ingested
--   conflict_news      — append-only journal, one row per unique URL
--   conflict_snapshots — time-series of global stats (one row per cron run)
--
-- Read access is open to anon (the page is public).
-- Writes only happen via the service-role key from cron jobs.

create extension if not exists "pgcrypto";

-- ===========================================================================
-- HOTSPOTS
-- ===========================================================================
create table if not exists conflict_hotspots (
  id            text primary key,                       -- 'ukr', 'gaza', etc.
  name          text not null,
  lat           double precision not null,
  lng           double precision not null,
  intensity     smallint not null check (intensity between 1 and 5),
  type          text not null,
  since         text,
  iso           text[] not null default '{}',
  casualties_7d integer not null default 0,
  is_active     boolean not null default true,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

create index if not exists idx_conflict_hotspots_active
  on conflict_hotspots (is_active, last_seen desc);

-- ===========================================================================
-- NEWS (append-only journal)
-- ===========================================================================
create table if not exists conflict_news (
  id            uuid primary key default gen_random_uuid(),
  conflict_id   text references conflict_hotspots(id) on delete set null,
  source        text not null,
  headline      text not null,
  url           text not null unique,                   -- dedupe key
  region        text,
  published_at  timestamptz,
  ingested_at   timestamptz not null default now()
);

create index if not exists idx_conflict_news_conflict_published
  on conflict_news (conflict_id, published_at desc nulls last);

create index if not exists idx_conflict_news_published
  on conflict_news (published_at desc nulls last);

create index if not exists idx_conflict_news_ingested
  on conflict_news (ingested_at desc);

-- ===========================================================================
-- SNAPSHOTS (time series of global stats)
-- ===========================================================================
create table if not exists conflict_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  captured_at        timestamptz not null default now(),
  total_active       integer not null,
  casualties_7d      integer not null,
  displaced          bigint  not null,
  countries_involved integer not null,
  weekly_delta       jsonb   not null,
  source             text    not null check (source in ('live', 'fallback'))
);

create index if not exists idx_conflict_snapshots_captured
  on conflict_snapshots (captured_at desc);

-- ===========================================================================
-- ROW-LEVEL SECURITY
-- Public read, no public write.  Service role bypasses RLS automatically.
-- ===========================================================================
alter table conflict_hotspots  enable row level security;
alter table conflict_news      enable row level security;
alter table conflict_snapshots enable row level security;

drop policy if exists "anon read hotspots"  on conflict_hotspots;
drop policy if exists "anon read news"      on conflict_news;
drop policy if exists "anon read snapshots" on conflict_snapshots;

create policy "anon read hotspots"  on conflict_hotspots  for select to anon using (true);
create policy "anon read news"      on conflict_news      for select to anon using (true);
create policy "anon read snapshots" on conflict_snapshots for select to anon using (true);

-- Authenticated users get the same read access (e.g. for an admin dashboard later).
drop policy if exists "auth read hotspots"  on conflict_hotspots;
drop policy if exists "auth read news"      on conflict_news;
drop policy if exists "auth read snapshots" on conflict_snapshots;

create policy "auth read hotspots"  on conflict_hotspots  for select to authenticated using (true);
create policy "auth read news"      on conflict_news      for select to authenticated using (true);
create policy "auth read snapshots" on conflict_snapshots for select to authenticated using (true);
