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

-- Per-conflict telemetry beyond the original schema. Routines populate these
-- via the same daily PostgREST upsert path. All optional — UI renders an
-- empty-state when null/zero so the Routine can backfill incrementally.
alter table conflict_hotspots
  add column if not exists displaced_7d        integer not null default 0,
  add column if not exists summary             text,
  add column if not exists resolution_outlook  text;

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
-- ACTORS (countries involved in each conflict, by role)
-- Phase 1 of the multi-pass identification protocol.
-- ===========================================================================
create table if not exists conflict_actors (
  id               uuid primary key default gen_random_uuid(),
  conflict_id      text not null references conflict_hotspots(id) on delete cascade,
  country_iso      text not null,
  role             text not null check (role in (
                     'territory',
                     'principal',
                     'direct',
                     'sponsor',
                     'supplier',
                     'proxy',
                     'basing',
                     'mediator'
                   )),
  confidence       text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  notes            text,
  sources          jsonb not null default '[]'::jsonb,
  first_documented date,
  last_confirmed   timestamptz not null default now(),
  unique (conflict_id, country_iso, role)
);

create index if not exists idx_conflict_actors_country
  on conflict_actors (country_iso);
create index if not exists idx_conflict_actors_conflict
  on conflict_actors (conflict_id);
create index if not exists idx_conflict_actors_role
  on conflict_actors (role);

alter table conflict_actors enable row level security;

drop policy if exists "anon read actors"  on conflict_actors;
drop policy if exists "auth read actors"  on conflict_actors;

create policy "anon read actors" on conflict_actors for select to anon          using (true);
create policy "auth read actors" on conflict_actors for select to authenticated using (true);

-- ===========================================================================
-- DAILY STATS (per-conflict daily casualty snapshots for trend sparklines)
-- ===========================================================================
create table if not exists conflict_daily_stats (
  conflict_id   text not null references conflict_hotspots(id) on delete cascade,
  date          date not null,
  casualties    integer not null default 0,
  primary key (conflict_id, date)
);

create index if not exists idx_conflict_daily_stats_date
  on conflict_daily_stats (date desc);

alter table conflict_daily_stats enable row level security;

drop policy if exists "anon read daily_stats"  on conflict_daily_stats;
drop policy if exists "auth read daily_stats"  on conflict_daily_stats;

create policy "anon read daily_stats"  on conflict_daily_stats for select to anon          using (true);
create policy "auth read daily_stats"  on conflict_daily_stats for select to authenticated using (true);

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
