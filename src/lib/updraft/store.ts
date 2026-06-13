// UpDraft persistence — Supabase CRUD layer.
//
// Every UpDraft table has RLS default-deny: anon and authenticated roles get
// no policies. The service-role client (used here) bypasses RLS by design.
// Ownership checks happen at the API layer via the session-cookie user_id.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase, isSupabaseConfigured } from '../supabase';
import type {
  UpdraftEvent,
  UpdraftSession,
  UpdraftSessionStatus,
  UpdraftSessionSummary,
  UpdraftUser,
} from '@/types';

export const isUpdraftStoreConfigured = isSupabaseConfigured;

function client(): SupabaseClient | null {
  return isSupabaseConfigured() ? getServerSupabase() : null;
}

// ---------------------------------------------------------------------------
// Row mapping (snake_case → camelCase)
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  active_mod_session_id: string | null;
  deleted_at: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  status: string;
  tier: number | null;
  path: string | null;
  stage_outputs: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  keep_indefinitely: boolean;
}

interface EventRow {
  id: number;
  session_id: string;
  ts: string;
  stage: string | null;
  event_type: string;
  data: Record<string, unknown> | null;
}

function rowToUser(r: UserRow): UpdraftUser {
  return {
    id: r.id,
    email: r.email,
    createdAt: r.created_at,
    activeModSessionId: r.active_mod_session_id,
    deletedAt: r.deleted_at,
  };
}

function rowToSession(r: SessionRow): UpdraftSession {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status as UpdraftSessionStatus,
    tier: (r.tier ?? null) as UpdraftSession['tier'],
    path: (r.path ?? null) as UpdraftSession['path'],
    stageOutputs: r.stage_outputs ?? {},
    startedAt: r.started_at,
    completedAt: r.completed_at,
    lastActivityAt: r.last_activity_at,
    keepIndefinitely: r.keep_indefinitely,
  };
}

function rowToSessionSummary(r: Omit<SessionRow, 'stage_outputs' | 'user_id'>): UpdraftSessionSummary {
  return {
    id: r.id,
    status: r.status as UpdraftSessionStatus,
    tier: (r.tier ?? null) as UpdraftSession['tier'],
    path: (r.path ?? null) as UpdraftSession['path'],
    startedAt: r.started_at,
    completedAt: r.completed_at,
    lastActivityAt: r.last_activity_at,
    keepIndefinitely: r.keep_indefinitely,
  };
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

/** Looks up a non-deleted user by email. Case-insensitive on email. */
export async function findUserByEmail(email: string): Promise<UpdraftUser | null> {
  const sb = client();
  if (!sb) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await sb
    .from('updraft_users')
    .select('id,email,created_at,active_mod_session_id,deleted_at')
    .eq('email', normalized)
    .is('deleted_at', null)
    .maybeSingle<UserRow>();
  if (error) {
    console.error('updraft.findUserByEmail:', error);
    return null;
  }
  return data ? rowToUser(data) : null;
}

/**
 * Returns the existing user for this email, or creates one if absent.
 * Idempotent — safe to call on every magic-link verify.
 */
export async function findOrCreateUserByEmail(email: string): Promise<UpdraftUser | null> {
  const sb = client();
  if (!sb) return null;
  const normalized = email.trim().toLowerCase();

  const existing = await findUserByEmail(normalized);
  if (existing) return existing;

  const { data, error } = await sb
    .from('updraft_users')
    .insert({ email: normalized })
    .select('id,email,created_at,active_mod_session_id,deleted_at')
    .single<UserRow>();

  if (error) {
    // Race: another request just inserted. Re-read.
    if (error.code === '23505') return findUserByEmail(normalized);
    console.error('updraft.findOrCreateUserByEmail:', error);
    return null;
  }
  return data ? rowToUser(data) : null;
}

export async function findUserById(id: string): Promise<UpdraftUser | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('updraft_users')
    .select('id,email,created_at,active_mod_session_id,deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle<UserRow>();
  if (error) {
    console.error('updraft.findUserById:', error);
    return null;
  }
  return data ? rowToUser(data) : null;
}

/**
 * Sets (or clears, when sessionId is null) the user's active-MOD pointer —
 * the master profile that the re-tailoring flow starts from.
 *
 * When setting, validates that the target session belongs to this user AND
 * holds a generation-ready MOD (stage_03.mod + ready_for_generation). We
 * never point the pointer at a MOD-less session, even if a caller asks us
 * to. The FK is ON DELETE SET NULL, so a purged/deleted target session
 * auto-clears the pointer at the DB layer — no app-side cleanup needed.
 */
export async function setActiveModSession(args: {
  userId: string;
  sessionId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = client();
  if (!sb) return { ok: false, error: 'unavailable' };

  if (args.sessionId !== null) {
    const session = await readSessionForUser(args.sessionId, args.userId);
    if (!session) return { ok: false, error: 'not-found' };
    const stage03 = (session.stageOutputs.stage_03 ?? {}) as {
      mod?: unknown;
      ready_for_generation?: boolean;
    };
    if (!stage03.ready_for_generation || !stage03.mod) {
      return { ok: false, error: 'no-mod' };
    }
  }

  const { error } = await sb
    .from('updraft_users')
    .update({ active_mod_session_id: args.sessionId })
    .eq('id', args.userId)
    .is('deleted_at', null);
  if (error) {
    console.error('updraft.setActiveModSession:', error);
    return { ok: false, error: 'write-failed' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MAGIC-LINK TOKENS
// ---------------------------------------------------------------------------

/** Inserts a new magic-link token row. tokenHash is sha256 hex of the raw token. */
export async function recordMagicToken(args: {
  tokenHash: string;
  email: string;
  expiresAt: Date;
}): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb.from('updraft_magic_tokens').insert({
    token_hash: args.tokenHash,
    email: args.email.trim().toLowerCase(),
    expires_at: args.expiresAt.toISOString(),
  });
  if (error) {
    console.error('updraft.recordMagicToken:', error);
    return false;
  }
  return true;
}

/**
 * Atomically marks a token consumed and returns the email it was issued to.
 * Returns null if the token is unknown, expired, or already consumed.
 */
export async function consumeMagicToken(tokenHash: string): Promise<string | null> {
  const sb = client();
  if (!sb) return null;
  const nowIso = new Date().toISOString();

  // Atomic update: only succeeds if not consumed and not expired.
  const { data, error } = await sb
    .from('updraft_magic_tokens')
    .update({ consumed_at: nowIso })
    .eq('token_hash', tokenHash)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .select('email')
    .maybeSingle<{ email: string }>();

  if (error) {
    console.error('updraft.consumeMagicToken:', error);
    return null;
  }
  return data?.email ?? null;
}

// ---------------------------------------------------------------------------
// SESSIONS
// ---------------------------------------------------------------------------

export async function listSessionsForUser(userId: string, limit = 50): Promise<UpdraftSessionSummary[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from('updraft_sessions')
    .select('id,status,tier,path,started_at,completed_at,last_activity_at,keep_indefinitely')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(Math.max(1, Math.min(200, limit)));
  if (error) {
    console.error('updraft.listSessionsForUser:', error);
    return [];
  }
  return ((data ?? []) as Omit<SessionRow, 'stage_outputs' | 'user_id'>[]).map(rowToSessionSummary);
}

/** Reads a session and verifies ownership. Returns null on not-found OR mismatch. */
export async function readSessionForUser(
  sessionId: string,
  userId: string,
): Promise<UpdraftSession | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('updraft_sessions')
    .select('id,user_id,status,tier,path,stage_outputs,started_at,completed_at,last_activity_at,keep_indefinitely')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle<SessionRow>();
  if (error) {
    console.error('updraft.readSessionForUser:', error);
    return null;
  }
  return data ? rowToSession(data) : null;
}

export async function createSessionForUser(userId: string): Promise<UpdraftSession | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('updraft_sessions')
    .insert({ user_id: userId })
    .select('id,user_id,status,tier,path,stage_outputs,started_at,completed_at,last_activity_at,keep_indefinitely')
    .single<SessionRow>();
  if (error) {
    console.error('updraft.createSessionForUser:', error);
    return null;
  }
  return data ? rowToSession(data) : null;
}

/**
 * Merge-patches a single stage's output into stage_outputs.{stage_NN}.
 * stageKey is one of: 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04'.
 * Other stage keys are preserved untouched.
 *
 * Optional path/tier setters apply at the same time so the API layer can
 * advance both at once (e.g., Stage 01.4 sets tier when classification runs).
 */
export async function patchSessionStage(args: {
  sessionId: string;
  userId: string;
  stageKey: 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04';
  payload: Record<string, unknown>;
  path?: 'upload' | 'talk' | null;
  tier?: 1 | 2 | 3 | 4 | null;
  status?: 'in_progress' | 'completed' | 'abandoned';
}): Promise<UpdraftSession | null> {
  const sb = client();
  if (!sb) return null;

  // Read-modify-write on stage_outputs (simple OCC; UpDraft sessions are
  // single-user single-flight in practice, no contention to design around).
  const existing = await readSessionForUser(args.sessionId, args.userId);
  if (!existing) return null;

  const nextStageOutputs = {
    ...existing.stageOutputs,
    [args.stageKey]: {
      ...((existing.stageOutputs[args.stageKey] as Record<string, unknown> | undefined) ?? {}),
      ...args.payload,
    },
  };

  const updates: Record<string, unknown> = { stage_outputs: nextStageOutputs };
  if (args.path !== undefined)   updates.path = args.path;
  if (args.tier !== undefined)   updates.tier = args.tier;
  if (args.status !== undefined) {
    updates.status = args.status;
    if (args.status === 'completed') updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await sb
    .from('updraft_sessions')
    .update(updates)
    .eq('id', args.sessionId)
    .eq('user_id', args.userId)
    .select('id,user_id,status,tier,path,stage_outputs,started_at,completed_at,last_activity_at,keep_indefinitely')
    .maybeSingle<SessionRow>();

  if (error) {
    console.error('updraft.patchSessionStage:', error);
    return null;
  }
  return data ? rowToSession(data) : null;
}

/** Deletes a session and cascades through events + exports via FK ON DELETE CASCADE. */
export async function deleteSessionForUser(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb
    .from('updraft_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  if (error) {
    console.error('updraft.deleteSessionForUser:', error);
    return false;
  }
  return true;
}

/** Toggle the per-session keep_indefinitely flag (purge opt-out). */
export async function setSessionKeepFlag(args: {
  sessionId: string;
  userId: string;
  keep: boolean;
}): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb
    .from('updraft_sessions')
    .update({ keep_indefinitely: args.keep })
    .eq('id', args.sessionId)
    .eq('user_id', args.userId);
  if (error) {
    console.error('updraft.setSessionKeepFlag:', error);
    return false;
  }
  return true;
}

/**
 * Hard-delete a user and everything they own. Sessions cascade via FK
 * (sessions → events + exports rows); magic tokens are scoped by email,
 * not user_id, so they're cleared explicitly. Storage bytes are NOT
 * cleaned up here — caller is responsible for calling
 * deleteSessionStorage() per session BEFORE this function runs.
 */
export async function deleteUserCascade(args: {
  userId: string;
  email: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = client();
  if (!sb) return { ok: false, error: 'supabase-not-configured' };

  // Magic tokens are keyed by email, no FK to users — clear explicitly.
  const { error: tokenErr } = await sb
    .from('updraft_magic_tokens')
    .delete()
    .eq('email', args.email.trim().toLowerCase());
  if (tokenErr) {
    console.error('updraft.deleteUserCascade tokens:', tokenErr);
    // Not fatal — proceed; orphaned tokens TTL away on their own.
  }

  // Hard-delete the user row. FK cascade handles sessions → events + exports.
  const { error: userErr } = await sb
    .from('updraft_users')
    .delete()
    .eq('id', args.userId);
  if (userErr) {
    console.error('updraft.deleteUserCascade user:', userErr);
    return { ok: false, error: userErr.message };
  }
  return { ok: true };
}

/** List every session for a user — used by data export + cascade delete prep. */
export async function listSessionsFullForUser(userId: string): Promise<UpdraftSession[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from('updraft_sessions')
    .select('id,user_id,status,tier,path,stage_outputs,started_at,completed_at,last_activity_at,keep_indefinitely')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('updraft.listSessionsFullForUser:', error);
    return [];
  }
  return ((data ?? []) as SessionRow[]).map(rowToSession);
}

/** List all exports for a user (across all their sessions) for data export. */
export async function listAllExportsForUser(userId: string): Promise<ExportRow[]> {
  const sb = client();
  if (!sb) return [];
  // Two-step because Supabase JS doesn't support cross-table joins on FK
  // unless declared as relationships. List sessions first, then exports.
  const sessions = await listSessionsFullForUser(userId);
  if (sessions.length === 0) return [];
  const sessionIds = sessions.map((s) => s.id);
  const { data, error } = await sb
    .from('updraft_exports')
    .select('id,session_id,kind,filename,storage_path,mime,bytes,generated_at')
    .in('session_id', sessionIds)
    .order('generated_at', { ascending: false });
  if (error) {
    console.error('updraft.listAllExportsForUser:', error);
    return [];
  }
  return (data ?? []) as ExportRow[];
}

// ---------------------------------------------------------------------------
// PURGE — 30-day inactivity cleanup
// ---------------------------------------------------------------------------

export interface PurgeCandidate {
  sessionId: string;
  userId: string;
  lastActivityAt: string;
}

/**
 * Find sessions eligible for the 30-day purge: last_activity_at older
 * than the cutoff AND keep_indefinitely=false. Returns just enough to
 * cascade-delete (storage prefix needs userId + sessionId).
 */
export async function findPurgeCandidates(args: {
  cutoffIso: string;
  limit?: number;
}): Promise<PurgeCandidate[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from('updraft_sessions')
    .select('id,user_id,last_activity_at')
    .lt('last_activity_at', args.cutoffIso)
    .eq('keep_indefinitely', false)
    .order('last_activity_at', { ascending: true })
    .limit(args.limit ?? 200);
  if (error) {
    console.error('updraft.findPurgeCandidates:', error);
    return [];
  }
  return ((data ?? []) as { id: string; user_id: string; last_activity_at: string }[]).map(
    (r) => ({ sessionId: r.id, userId: r.user_id, lastActivityAt: r.last_activity_at }),
  );
}

/** Hard-delete a single session by id (no ownership check — purge is privileged). */
export async function deleteSessionByIdPrivileged(sessionId: string): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb.from('updraft_sessions').delete().eq('id', sessionId);
  if (error) {
    console.error('updraft.deleteSessionByIdPrivileged:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------

export async function logEvent(args: {
  sessionId: string;
  stage?: string | null;
  eventType: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const sb = client();
  if (!sb) return;
  const { error } = await sb.from('updraft_events').insert({
    session_id: args.sessionId,
    stage: args.stage ?? null,
    event_type: args.eventType,
    data: args.data ?? {},
  });
  if (error) console.error('updraft.logEvent:', error);
}

// ---------------------------------------------------------------------------
// Diagnostic — recent-failure aggregation for /api/updraft/status
// ---------------------------------------------------------------------------

export interface RecentFailureSummary {
  /** Counts grouped by event_type for the diagnostic window — the failure
   *  events (pdf_failed, cover_letter_failed, summary_failed, export_failed).
   *  Empty record means a clean window. */
  byEventType: Record<string, number>;
  /** Total number of events scanned (across all event_types of interest). */
  total: number;
  /** Hours of history scanned. */
  windowHours: number;
}

// pdf_retry_* are gone: native PDF generation (pdf-builder.tsx) has no network
// boundary to retry, so those events are never emitted anymore (2026-06-13).
const FAILURE_EVENT_TYPES = [
  'pdf_failed',
  'cover_letter_failed',
  'summary_failed',
  'export_failed',
] as const;

export async function summarizeRecentFailures(
  windowHours = 24,
): Promise<RecentFailureSummary> {
  const sb = client();
  const out: RecentFailureSummary = {
    byEventType: {},
    total: 0,
    windowHours,
  };
  if (!sb) return out;

  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data, error } = await sb
    .from('updraft_events')
    .select('event_type')
    .in('event_type', FAILURE_EVENT_TYPES as unknown as string[])
    .gte('created_at', since);

  if (error) {
    console.error('updraft.summarizeRecentFailures:', error);
    return out;
  }
  for (const row of data ?? []) {
    const t = row.event_type as string;
    out.byEventType[t] = (out.byEventType[t] ?? 0) + 1;
    out.total++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// EXPORTS — file index entries pointing into the updraft-exports bucket
// ---------------------------------------------------------------------------

interface ExportRow {
  id: string;
  session_id: string;
  kind: string;
  filename: string;
  storage_path: string;
  mime: string;
  bytes: number;
  generated_at: string;
}

export async function recordExport(args: {
  sessionId: string;
  kind: string;                         // UpdraftExportKind
  filename: string;
  storagePath: string;
  mime: string;
  bytes: number;
}): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb.from('updraft_exports').insert({
    session_id:   args.sessionId,
    kind:         args.kind,
    filename:     args.filename,
    storage_path: args.storagePath,
    mime:         args.mime,
    bytes:        args.bytes,
  });
  if (error) {
    console.error('updraft.recordExport:', error);
    return false;
  }
  return true;
}

export async function listExportsForSession(
  sessionId: string,
  userId: string,
): Promise<ExportRow[]> {
  const sb = client();
  if (!sb) return [];
  // Ownership check via the session FK — first verify the session belongs
  // to this user, then list the exports.
  const session = await readSessionForUser(sessionId, userId);
  if (!session) return [];
  const { data, error } = await sb
    .from('updraft_exports')
    .select('id,session_id,kind,filename,storage_path,mime,bytes,generated_at')
    .eq('session_id', sessionId)
    .order('generated_at', { ascending: false });
  if (error) {
    console.error('updraft.listExportsForSession:', error);
    return [];
  }
  return (data ?? []) as ExportRow[];
}

export async function readExportForSession(
  exportId: string,
  sessionId: string,
  userId: string,
): Promise<ExportRow | null> {
  const sb = client();
  if (!sb) return null;
  const session = await readSessionForUser(sessionId, userId);
  if (!session) return null;
  const { data, error } = await sb
    .from('updraft_exports')
    .select('id,session_id,kind,filename,storage_path,mime,bytes,generated_at')
    .eq('id', exportId)
    .eq('session_id', sessionId)
    .maybeSingle<ExportRow>();
  if (error) {
    console.error('updraft.readExportForSession:', error);
    return null;
  }
  return data ?? null;
}

export async function readEventsForSession(
  sessionId: string,
  limit = 200,
): Promise<UpdraftEvent[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from('updraft_events')
    .select('id,session_id,ts,stage,event_type,data')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true })
    .limit(Math.max(1, Math.min(2000, limit)));
  if (error) {
    console.error('updraft.readEventsForSession:', error);
    return [];
  }
  return ((data ?? []) as EventRow[]).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    ts: r.ts,
    stage: r.stage,
    eventType: r.event_type,
    data: r.data ?? {},
  }));
}
