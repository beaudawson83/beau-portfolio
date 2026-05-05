// Shared transactional email — Brevo (formerly Sendinblue).
//
// Single send function used by /api/updraft/auth/issue (magic link) and
// /api/contact (contact form). Brevo's free tier supports 300 sends/day
// and domain verification — both load-bearing for our use case. The
// previous Resend wiring required a paid plan to verify a domain, which
// blocked anyone-but-Beau from receiving magic-link emails.
//
// This module is provider-specific in implementation but provider-
// agnostic at the signature level — if we ever need to swap (Postmark,
// SES, etc.) we change this file and nothing else.

import 'server-only';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback. Important for deliverability — gmail flags
   *  HTML-only emails as more spam-prone. */
  text: string;
  /** Optional override for the visible sender name. Default falls back to
   *  whatever's in MAIL_FROM_ADDRESS (parsed if "Name <email@domain>" form). */
  fromName?: string;
  /** Optional Reply-To header — useful when the FROM address is a noreply
   *  but you want responses to go somewhere real. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface ParsedFrom {
  email: string;
  name?: string;
}

/**
 * Parses MAIL_FROM_ADDRESS. Accepts either a bare address ("hi@x.com")
 * or "Name <email@x.com>" format. Returns null when not configured.
 */
function parseFromAddress(): ParsedFrom | null {
  const raw = process.env.MAIL_FROM_ADDRESS;
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = /^(.+?)\s*<\s*([^>]+)\s*>\s*$/.exec(trimmed);
  if (m) {
    return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  }
  return { email: trimmed };
}

/**
 * Send a single transactional email through Brevo. Returns
 * { ok: false, error } on any failure path; caller logs and surfaces
 * a sanitized message to the user.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('email.sendEmail: BREVO_API_KEY not configured');
    return { ok: false, error: 'BREVO_API_KEY not configured' };
  }
  const parsed = parseFromAddress();
  if (!parsed) {
    console.error('email.sendEmail: MAIL_FROM_ADDRESS not configured');
    return { ok: false, error: 'MAIL_FROM_ADDRESS not configured' };
  }

  const body: Record<string, unknown> = {
    sender: {
      name: args.fromName || parsed.name || 'BAD Labs',
      email: parsed.email,
    },
    to: [{ email: args.to }],
    subject: args.subject,
    htmlContent: args.html,
    textContent: args.text,
  };
  if (args.replyTo) {
    body.replyTo = { email: args.replyTo };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.error('email.sendEmail: Brevo API error', {
        status: res.status,
        body: errorBody.slice(0, 500),
      });
      return {
        ok: false,
        error: `Brevo ${res.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error('email.sendEmail: network/exception', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}
