-- UpDraft — RPC functions for atomic quota counters.
-- Run in the Supabase SQL editor after setup-supabase-updraft.sql.
-- Idempotent (CREATE OR REPLACE) and safe to re-run.
--
-- Two functions:
--   updraft_increment_quota — atomic UPSERT on today's quota row, adds the
--                              passed-in deltas to whatever's already there
--   updraft_today_quota     — read today's counters with COALESCE-to-zero
--                              for the day's first call (no row yet)
--
-- Both run as the service-role principal that calls them; RLS isn't
-- relevant since service-role bypasses RLS by design.

-- ===========================================================================
-- INCREMENT
-- Pass deltas as named args; missing args default to 0. Single SQL UPSERT
-- so concurrent calls don't lose increments.
-- ===========================================================================
create or replace function updraft_increment_quota(
  p_sessions          int     default 0,
  p_tokens_in         bigint  default 0,
  p_tokens_out        bigint  default 0,
  p_pdfs              int     default 0,
  p_sandbox           int     default 0
) returns void
language sql
as $$
  insert into updraft_quota_daily (
    date, sessions_started, tokens_in, tokens_out,
    pdfs_generated, sandbox_invocations, updated_at
  )
  values (
    current_date, p_sessions, p_tokens_in, p_tokens_out,
    p_pdfs, p_sandbox, now()
  )
  on conflict (date) do update set
    sessions_started    = updraft_quota_daily.sessions_started    + excluded.sessions_started,
    tokens_in           = updraft_quota_daily.tokens_in           + excluded.tokens_in,
    tokens_out          = updraft_quota_daily.tokens_out          + excluded.tokens_out,
    pdfs_generated      = updraft_quota_daily.pdfs_generated      + excluded.pdfs_generated,
    sandbox_invocations = updraft_quota_daily.sandbox_invocations + excluded.sandbox_invocations,
    updated_at          = now();
$$;

-- ===========================================================================
-- READ
-- Returns today's row, or zeros if no row exists yet (first call of day).
-- ===========================================================================
create or replace function updraft_today_quota()
returns table (
  date                 date,
  sessions_started     int,
  tokens_in            bigint,
  tokens_out           bigint,
  pdfs_generated       int,
  sandbox_invocations  int
)
language sql
as $$
  select
    current_date                                  as date,
    coalesce(q.sessions_started, 0)               as sessions_started,
    coalesce(q.tokens_in, 0)                      as tokens_in,
    coalesce(q.tokens_out, 0)                     as tokens_out,
    coalesce(q.pdfs_generated, 0)                 as pdfs_generated,
    coalesce(q.sandbox_invocations, 0)            as sandbox_invocations
  from (select 1) as dummy
  left join updraft_quota_daily q on q.date = current_date;
$$;
