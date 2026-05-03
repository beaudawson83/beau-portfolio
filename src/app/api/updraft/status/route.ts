import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { getTodayQuota, quotaCaps } from '@/lib/updraft/quotas';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/updraft/status
 *
 * Diagnostic heartbeat for UpDraft. Mirrors /api/conflict/status — single
 * curl tells you today's quota burn, the configured caps, and which env
 * pieces resolved at runtime. No secrets in the response.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabaseConfigured = isSupabaseConfigured();
  const today = supabaseConfigured ? await getTodayQuota() : null;

  // Surface env presence without leaking values.
  const envPresent = {
    SUPABASE_URL: Boolean(
      process.env.BEAU_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(
      process.env.BEAU_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    UPDRAFT_OWNER_SECRET: Boolean(process.env.UPDRAFT_OWNER_SECRET),
    UPDRAFT_MAGIC_LINK_SECRET: Boolean(process.env.UPDRAFT_MAGIC_LINK_SECRET),
    UPDRAFT_SESSION_COOKIE_SECRET: Boolean(process.env.UPDRAFT_SESSION_COOKIE_SECRET),
  };

  return NextResponse.json({
    ok: true,
    supabaseConfigured,
    envPresent,
    caps: quotaCaps(),
    today,
    generatedAt: new Date().toISOString(),
  });
}
