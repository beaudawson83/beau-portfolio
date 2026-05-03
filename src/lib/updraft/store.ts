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
