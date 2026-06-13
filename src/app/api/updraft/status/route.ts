import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { getTodayQuota, quotaCaps } from '@/lib/updraft/quotas';
import { isSupabaseConfigured } from '@/lib/supabase';
import { summarizeRecentFailures } from '@/lib/updraft/store';

/**
 * GET /api/updraft/status
 *
 * Diagnostic heartbeat for UpDraft. Mirrors /api/conflict/status — single
 * curl tells you today's quota burn, configured caps, env presence, AND
 * recent-failure counts (pdf_failed, retry_exhausted, cover_letter_failed,
 * etc.) over the last 24h. No secrets in the response.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabaseConfigured = isSupabaseConfigured();
  const today = supabaseConfigured ? await getTodayQuota() : null;
  const failures = supabaseConfigured ? await summarizeRecentFailures(24) : null;

  // Surface env presence without leaking values. Transactional email goes
  // through Brevo (old Resend env retired). PDF generation is native
  // (pdf-builder.tsx) and needs no env var — the Drive-era
  // UPDRAFT_GOOGLE_SA_JSON_B64 was retired 2026-06-13.
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
    GEMINI_API_KEY:                 Boolean(process.env.GEMINI_API_KEY),
    BREVO_API_KEY:                  Boolean(process.env.BREVO_API_KEY),
    MAIL_FROM_ADDRESS:              Boolean(process.env.MAIL_FROM_ADDRESS),
    UPDRAFT_OWNER_SECRET:           Boolean(process.env.UPDRAFT_OWNER_SECRET),
    UPDRAFT_MAGIC_LINK_SECRET:      Boolean(process.env.UPDRAFT_MAGIC_LINK_SECRET),
    UPDRAFT_SESSION_COOKIE_SECRET:  Boolean(process.env.UPDRAFT_SESSION_COOKIE_SECRET),
  };

  return NextResponse.json({
    ok: true,
    supabaseConfigured,
    envPresent,
    caps: quotaCaps(),
    today,
    failures,
    generatedAt: new Date().toISOString(),
  });
}
