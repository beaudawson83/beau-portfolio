import 'server-only';
import { createHash } from 'node:crypto';
import { getServerSupabase, isSupabaseConfigured } from './supabase';

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

function hashKey(raw: string): string {
  const salt = process.env.CHAT_IP_SALT ?? 'fallback-rate-limit-salt';
  const [prefix, rest] = raw.includes(':')
    ? [raw.slice(0, raw.indexOf(':')), raw.slice(raw.indexOf(':') + 1)]
    : [raw, ''];
  const hashed = createHash('sha256').update(`${rest}:${salt}`).digest('hex').slice(0, 16);
  return `${prefix}:${hashed}`;
}

export async function checkRateLimit(
  rawKey: string,
  opts: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  // If Supabase isn't configured, fail open so dev / misconfig doesn't brick the site.
  if (!isSupabaseConfigured()) {
    return {
      allowed: true,
      remaining: opts.limit,
      resetAt: new Date(Date.now() + opts.windowSeconds * 1000),
    };
  }

  const client = getServerSupabase();
  const { data, error } = await client.rpc('increment_rate_limit', {
    p_key: hashKey(rawKey),
    p_limit: opts.limit,
    p_window_seconds: opts.windowSeconds,
  });

  if (error || !data || data.length === 0) {
    console.error('rate-limit: increment_rate_limit failed', error);
    return {
      allowed: true,
      remaining: opts.limit,
      resetAt: new Date(Date.now() + opts.windowSeconds * 1000),
    };
  }

  const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}
