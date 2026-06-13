import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { summarizeRecentFailures } from '@/lib/updraft/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

/**
 * GET|POST /api/updraft/cron/alert
 *
 * Active failure alerting — the watcher that was missing. UpDraft already
 * records failure events (pdf_failed, cover_letter_failed, summary_failed,
 * export_failed) and surfaces 24h counts at /api/updraft/status, but until
 * now *nothing read those counters*. That blind spot is exactly how the
 * 2026-06-10 Gemini outage ran silent for 9 days and the 2026-06-12 Brevo +
 * Drive outages went unnoticed until a manual spot-check (see V1-GATE.md §1).
 *
 * This cron closes the loop: once a day it sums the last 24h of failure
 * events and, if the total meets UPDRAFT_ALERT_MIN_FAILURES (default 1),
 * emails a digest to the operator. A clean window sends nothing.
 *
 * Window == 24h and cadence == daily, so each failure is reported exactly
 * once (no boundary misses, no duplicate nagging). Continuous failures
 * produce a daily digest, which is the desired behavior.
 *
 * Auth: Authorization: Bearer $CRON_SECRET. Vercel Cron supplies this
 * automatically via the schedule entry in vercel.json; manual invocation
 * works too (curl -H "Authorization: Bearer …"). GET is accepted because
 * Vercel Cron uses GET by default.
 *
 * Config (all optional, dialable from the Vercel dashboard):
 *   UPDRAFT_ALERT_EMAIL        — recipient (default: beau.dawson83@gmail.com)
 *   UPDRAFT_ALERT_MIN_FAILURES — threshold to alert (default: 1)
 */

const ALERT_WINDOW_HOURS = 24;
const DEFAULT_ALERT_EMAIL = 'beau.dawson83@gmail.com';

function alertRecipient(): string {
  return process.env.UPDRAFT_ALERT_EMAIL?.trim() || DEFAULT_ALERT_EMAIL;
}

function minFailures(): number {
  const raw = Number(process.env.UPDRAFT_ALERT_MIN_FAILURES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

async function handler(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    // Can't read the failure log without Supabase — report, don't pretend.
    return NextResponse.json({
      ok: false,
      reason: 'supabase-not-configured',
      message: 'Failure counters live in Supabase; cannot evaluate alert.',
    });
  }

  const threshold = minFailures();
  const failures = await summarizeRecentFailures(ALERT_WINDOW_HOURS);

  if (failures.total < threshold) {
    return NextResponse.json({
      ok: true,
      alerted: false,
      windowHours: ALERT_WINDOW_HOURS,
      threshold,
      total: failures.total,
      message: 'Clean window — no alert sent.',
    });
  }

  // Failures crossed the threshold — build a digest and notify the operator.
  const recipient = alertRecipient();
  const lines = Object.entries(failures.byEventType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `  • ${type}: ${count}`);

  const text = [
    `UpDraft logged ${failures.total} failure event(s) in the last ${ALERT_WINDOW_HOURS}h.`,
    '',
    'Breakdown:',
    ...lines,
    '',
    'Full diagnostic (quota burn, env presence, failure counts):',
    '  curl -H "Authorization: Bearer $CRON_SECRET" https://beaudawson.com/api/updraft/status',
    '',
    `Threshold for this alert: ${threshold}. Tune via UPDRAFT_ALERT_MIN_FAILURES.`,
  ].join('\n');

  const html = [
    `<p>UpDraft logged <strong>${failures.total}</strong> failure event(s) in the last ${ALERT_WINDOW_HOURS}h.</p>`,
    '<p><strong>Breakdown:</strong></p>',
    '<ul>',
    ...Object.entries(failures.byEventType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `<li><code>${type}</code>: ${count}</li>`),
    '</ul>',
    '<p>Full diagnostic (quota burn, env presence, failure counts):<br>',
    '<code>curl -H "Authorization: Bearer $CRON_SECRET" https://beaudawson.com/api/updraft/status</code></p>',
    `<p style="color:#888;font-size:12px">Threshold for this alert: ${threshold}. Tune via <code>UPDRAFT_ALERT_MIN_FAILURES</code>.</p>`,
  ].join('\n');

  const sent = await sendEmail({
    to: recipient,
    subject: `⚠️ UpDraft: ${failures.total} failure(s) in last ${ALERT_WINDOW_HOURS}h`,
    text,
    html,
  });

  return NextResponse.json({
    ok: sent.ok,
    alerted: sent.ok,
    windowHours: ALERT_WINDOW_HOURS,
    threshold,
    total: failures.total,
    byEventType: failures.byEventType,
    recipient,
    emailError: sent.ok ? undefined : sent.error,
  });
}

export { handler as GET, handler as POST };
