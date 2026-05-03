-- UpDraft — schema for Supabase / Postgres.
-- Run in the Supabase SQL editor; idempotent and safe to re-run.
--
-- Tables:
--   updraft_users         — accounts (one row per email)
--   updraft_magic_tokens  — short-lived single-use magic-link tokens
--   updraft_sessions      — UpDraft sessions; one per user attempt
--   updraft_events        — append-only event log per session
--   updraft_exports       — index of generated DOCX/PDF/MD files
--   updraft_quota_daily   — daily quota tracking (drives the kill switch)
--
-- Anon role is blocked at the RLS layer for everything UpDraft. All reads
-- and writes route through service-role API endpoints that perform their
-- own ownership checks (session.user_id = current cookie user_id).
--
-- Storage bucket lives in setup-supabase-updraft-storage.sql.

create extension if not exists "pgcrypto";

-- ===========================================================================
-- USERS
-- ===========================================================================
create table if not exists updraft_users (
  id                       uuid primary key default gen_random_uuid(),
  email                    text unique not null,
  created_at               timestamptz not null default now(),
  active_mod_session_id    uuid,                                              -- pointer to most recently completed MOD session
  deleted_at               timestamptz                                         -- soft delete; manual purge cascades fully
);

create index if not exists idx_updraft_users_email
  on updraft_users (email);

-- ===========================================================================
-- MAGIC-LINK TOKENS
-- We store only the hash of each token. Raw token lives in the email link.
-- ===========================================================================
create table if not exists updraft_magic_tokens (
  token_hash    text primary key,                                              -- sha256 hex of the raw token
  email         text not null,
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz not null,                                          -- 15 min default; set by app
  consumed_at   timestamptz                                                    -- single-use; null until first verify
);

create index if not exists idx_updraft_magic_tokens_email
  on updraft_magic_tokens (email);

create index if not exists idx_updraft_magic_tokens_expires
  on updraft_magic_tokens (expires_at);

-- ===========================================================================
-- SESSIONS
-- One per UpDraft attempt. stage_outputs is a jsonb dictionary keyed by stage
-- name (stage_01 .. stage_04). last_activity_at drives the 30-day purge.
-- ===========================================================================
create table if not exists updraft_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references updraft_users(id) on delete cascade,
  status              text not null default 'in_progress'
                        check (status in ('in_progress','completed','abandoned')),
  tier                smallint check (tier between 1 and 4),
  path                text check (path in ('upload','talk')),
  stage_outputs       jsonb not null default '{}'::jsonb,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  last_activity_at    timestamptz not null default now(),
  keep_indefinitely   boolean not null default false                          -- user opt-out of 30-day purge
);

create index if not exists idx_updraft_sessions_user
  on updraft_sessions (user_id, started_at desc);

create index if not exists idx_updraft_sessions_purge
  on updraft_sessions (last_activity_at)
  where keep_indefinitely = false;

create index if not exists idx_updraft_sessions_status
  on updraft_sessions (status, last_activity_at desc);

-- last_activity_at updates on any row update
create or replace function tg_updraft_sessions_activity()
returns trigger as $$
begin
  new.last_activity_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists updraft_sessions_activity on updraft_sessions;
create trigger updraft_sessions_activity
  before update on updraft_sessions
  for each row execute function tg_updraft_sessions_activity();

-- ===========================================================================
-- EVENTS (append-only session log)
-- ===========================================================================
create table if not exists updraft_events (
  id            bigserial primary key,
  session_id    uuid not null references updraft_sessions(id) on delete cascade,
  ts            timestamptz not null default now(),
  stage         text,                                                          -- '01' | '02' | '03' | '04' | 'auth' | 'system'
  event_type    text not null,                                                 -- see PLAN.md §3 + lib-output-contract.md § Event Types
  data          jsonb not null default '{}'::jsonb
);

create index if not exists idx_updraft_events_session
  on updraft_events (session_id, ts desc);

create index if not exists idx_updraft_events_type
  on updraft_events (event_type, ts desc);

-- ===========================================================================
-- EXPORTS (file index)
-- Storage paths land in the updraft-exports bucket. See storage migration.
-- ===========================================================================
create table if not exists updraft_exports (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references updraft_sessions(id) on delete cascade,
  kind            text not null check (kind in (
                    'mod_docx','mod_pdf','mod_md',
                    'resume_docx','resume_pdf',
                    'cl_docx','cl_pdf'
                  )),
  filename        text not null,
  storage_path    text not null,
  mime            text not null,
  bytes           integer not null default 0,
  generated_at    timestamptz not null default now()
);

create index if not exists idx_updraft_exports_session
  on updraft_exports (session_id, generated_at desc);

-- ===========================================================================
-- QUOTA DAILY (drives the kill switch)
-- One row per UTC day. Incremented via UPSERT from API endpoints.
-- ===========================================================================
create table if not exists updraft_quota_daily (
  date                  date primary key,
  sessions_started      integer not null default 0,
  tokens_in             bigint  not null default 0,
  tokens_out            bigint  not null default 0,
  sandbox_invocations   integer not null default 0,
  pdfs_generated        integer not null default 0,
  updated_at            timestamptz not null default now()
);

-- ===========================================================================
-- USER → ACTIVE-MOD POINTER (FK added after sessions table exists)
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'updraft_users_active_mod_fk'
  ) then
    alter table updraft_users
      add constraint updraft_users_active_mod_fk
      foreign key (active_mod_session_id)
      references updraft_sessions(id)
      on delete set null;
  end if;
end$$;

-- ===========================================================================
-- ROW-LEVEL SECURITY
-- All UpDraft tables are private. Anon and authenticated roles are blocked
-- at the table level. Application code uses the service-role key (which
-- bypasses RLS) and enforces ownership checks via session-cookie user_id.
-- ===========================================================================
alter table updraft_users         enable row level security;
alter table updraft_magic_tokens  enable row level security;
alter table updraft_sessions      enable row level security;
alter table updraft_events        enable row level security;
alter table updraft_exports       enable row level security;
alter table updraft_quota_daily   enable row level security;

-- No anon/authenticated policies are created. Default-deny is intentional —
-- service-role is the only principal that touches these tables.
