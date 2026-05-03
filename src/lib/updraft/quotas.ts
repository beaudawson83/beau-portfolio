// UpDraft cost guardrails — three-layer kill switch (cheapest layer wins).
//
// Per PLAN.md §5.1, evaluation order:
//   1. Per-session token cap (enforced inline by the AI wrapper, not here)
//   2. Per-IP daily cap (uses existing rate_limits table)
//   3. Global daily kill switch (updraft_quota_daily row)
//
// Owner bypass: requests with Authorization: Bearer $UPDRAFT_OWNER_SECRET
// skip all caps and are tagged owner=true in events for clean analytics.
// Mirrors the BLOG_EDITOR_SECRET pattern.

import 'server-only';
import type { NextRequest } from 'next/server';
import { getServerSupabase, isSupabaseConfigured } from '../supabase';
import { extractClientIp } from '../chat-log';
import { checkRateLimit } from '../rate-limit';
import { isUpdraftOwner } from './auth';

// ---------------------------------------------------------------------------
// Env-var caps (defaults match PLAN.md §5.2)
// ---------------------------------------------------------------------------

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function quotaCaps() {
  return {
    dailySessions:     intEnv('UPDRAFT_DAILY_SESSION_CAP',         50),
    dailyTokensIn:     intEnv('UPDRAFT_DAILY_TOKEN_CAP_IN',        500_000),
    dailyTokensOut:    intEnv('UPDRAFT_DAILY_TOKEN_CAP_OUT',       100_000),
    dailyPdfs:         intEnv('UPDRAFT_DAILY_PDF_CAP',             30),
    perIpDaily:        intEnv('UPDRAFT_PER_IP_DAILY',              2),
    sessionTokensIn:   intEnv('UPDRAFT_SESSION_TOKEN_CAP_IN',      200_000),
    sessionTokensOut:  intEnv('UPDRAFT_SESSION_TOKEN_CAP_OUT',     50_000),
  } as const;
}

// ---------------------------------------------------------------------------
// Today's quota snapshot
// ---------------------------------------------------------------------------

export interface QuotaSnapshot {
  date: string;
  sessions: { used: number; cap: number };
  tokensIn: { used: number; cap: number };
  tokensOut: { used: number; cap: number };
  pdfs: { used: number; cap: number };
  sandboxInvocations: number;
}

interface TodayRow {
  date: string;
  sessions_started: number;
  tokens_in: number;
  tokens_out: number;
  pdfs_generated: number;
  sandbox_invocations: number;
}

/**
 * Returns today's quota snapshot (zeros if no row yet). Returns null if
 * Supabase isn't configured — caller should fail open, not fail closed.
 */
export async function getTodayQuota(): Promise<QuotaSnapshot | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('updraft_today_quota');
  if (error) {
    console.error('updraft.getTodayQuota:', error);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as TodayRow | null;
  if (!row) return null;
  const caps = quotaCaps();
  return {
    date: row.date,
    sessions:           { used: row.sessions_started,    cap: caps.dailySessions     },
    tokensIn:           { used: row.tokens_in,           cap: caps.dailyTokensIn     },
    tokensOut:          { used: row.tokens_out,          cap: caps.dailyTokensOut    },
    pdfs:               { used: row.pdfs_generated,      cap: caps.dailyPdfs         },
    sandboxInvocations: row.sandbox_invocations,
  };
}

// ---------------------------------------------------------------------------
// Pre-flight checks (call BEFORE doing the work)
// ---------------------------------------------------------------------------

export interface QuotaCheck {
  allowed: boolean;
  reason?: 'per-ip-daily' | 'global-daily-sessions' | 'global-daily-tokens';
  message?: string;
  retryAt?: Date;
}

/**
 * Check whether a new session can be started for this request.
 * Owner bypass first, then per-IP rate limit, then global daily session cap.
 */
export async function canStartSession(req: NextRequest): Promise<QuotaCheck> {
  if (isUpdraftOwner(req)) return { allowed: true };

  // Per-IP layer (cheapest)
  const ip = extractClientIp(req.headers);
  const caps = quotaCaps();
  const rl = await checkRateLimit(`updraft-session:${ip ?? 'anon'}`, {
    limit: caps.perIpDaily,
    windowSeconds: 86_400,
  });
  if (!rl.allowed) {
    return {
      allowed: false,
      reason: 'per-ip-daily',
      message: `You've reached the daily session limit. Try again tomorrow.`,
      retryAt: rl.resetAt,
    };
  }

  // Global daily layer
  const today = await getTodayQuota();
  if (today && today.sessions.used >= today.sessions.cap) {
    return {
      allowed: false,
      reason: 'global-daily-sessions',
      message: `UpDraft is at capacity for today. Come back tomorrow.`,
    };
  }
  return { allowed: true };
}

/**
 * Check whether an AI call can proceed (global daily token caps).
 * Per-session token caps are enforced inline by the AI wrapper as it
 * accumulates usage on the session — this only handles the global layer.
 */
export async function canMakeAiCall(req: NextRequest): Promise<QuotaCheck> {
  if (isUpdraftOwner(req)) return { allowed: true };
  const today = await getTodayQuota();
  if (!today) return { allowed: true };
  if (today.tokensIn.used >= today.tokensIn.cap) {
    return {
      allowed: false,
      reason: 'global-daily-tokens',
      message: `UpDraft is at capacity for today. Come back tomorrow.`,
    };
  }
  if (today.tokensOut.used >= today.tokensOut.cap) {
    return {
      allowed: false,
      reason: 'global-daily-tokens',
      message: `UpDraft is at capacity for today. Come back tomorrow.`,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Counters (call AFTER doing the work)
// ---------------------------------------------------------------------------

interface RecordArgs {
  sessions?: number;
  tokensIn?: number;
  tokensOut?: number;
  pdfs?: number;
  sandboxInvocations?: number;
}

/**
 * Atomic UPSERT-increment on today's quota row. Owner-flagged usage still
 * gets counted (we want the visibility) — only the cap-check skips for
 * owner; the analytics still want owner sessions tagged via event.data.
 */
export async function recordQuotaUsage(args: RecordArgs): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getServerSupabase();
  const { error } = await sb.rpc('updraft_increment_quota', {
    p_sessions:  args.sessions           ?? 0,
    p_tokens_in: args.tokensIn           ?? 0,
    p_tokens_out: args.tokensOut         ?? 0,
    p_pdfs:      args.pdfs               ?? 0,
    p_sandbox:   args.sandboxInvocations ?? 0,
  });
  if (error) console.error('updraft.recordQuotaUsage:', error);
}
