import { NextRequest, NextResponse } from 'next/server';
import { issueMagicLinkToken } from '@/lib/updraft/auth';
import { recordMagicToken } from '@/lib/updraft/store';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/chat-log';
import { sendEmail } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function originFromRequest(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(req.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit so issue can't be hammered to enumerate addresses
    // or burn through Resend quota.
    const ip = extractClientIp(request.headers);
    const rl = await checkRateLimit(`updraft-auth:${ip ?? 'anon'}`, {
      limit: 10,
      windowSeconds: 3600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Try again in an hour.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.max(
              1,
              Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000),
            ).toString(),
          },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();

    const { rawToken, tokenHash, expiresAt } = issueMagicLinkToken();
    const recorded = await recordMagicToken({ tokenHash, email, expiresAt });
    if (!recorded) {
      return NextResponse.json(
        { error: 'Could not start sign-in. Try again in a moment.' },
        { status: 500 },
      );
    }

    const origin = originFromRequest(request);
    const link = `${origin}/api/updraft/auth/callback?token=${encodeURIComponent(rawToken)}`;
    const safeEmail = escapeHtml(email);
    const safeLink = escapeHtml(link);

    // Light-default email with adaptive dark variant via prefers-color-scheme.
    // Inline styles paint the light theme; the <style> block in <head> overrides
    // for clients in dark mode. [data-ogsc] mirrors the dark rules for Outlook
    // web, which sets that attribute and ignores prefers-color-scheme.
    const sent = await sendEmail({
      to: email,
      fromName: 'UpDraft',
      subject: 'Your UpDraft sign-in link',
      html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your UpDraft sign-in link</title>
<style>
  body { margin: 0; padding: 0; }
  a { color: #7C3AED; }
  @media (prefers-color-scheme: dark) {
    .udf-bg { background: #0e0d12 !important; }
    .udf-card { background: #15141b !important; border-color: rgba(255,255,255,0.08) !important; }
    .udf-h1 { color: #ffffff !important; }
    .udf-body { color: rgba(255,255,255,0.72) !important; }
    .udf-muted { color: rgba(255,255,255,0.5) !important; }
    .udf-faint { color: rgba(255,255,255,0.4) !important; }
    .udf-divider { border-color: rgba(255,255,255,0.08) !important; }
    .udf-cta { background: #8b6dff !important; color: #ffffff !important; }
    .udf-link { color: #b59cff !important; }
  }
  [data-ogsc] .udf-bg { background: #0e0d12 !important; }
  [data-ogsc] .udf-card { background: #15141b !important; border-color: rgba(255,255,255,0.08) !important; }
  [data-ogsc] .udf-h1 { color: #ffffff !important; }
  [data-ogsc] .udf-body { color: rgba(255,255,255,0.72) !important; }
  [data-ogsc] .udf-muted { color: rgba(255,255,255,0.5) !important; }
  [data-ogsc] .udf-faint { color: rgba(255,255,255,0.4) !important; }
  [data-ogsc] .udf-divider { border-color: rgba(255,255,255,0.08) !important; }
  [data-ogsc] .udf-cta { background: #8b6dff !important; color: #ffffff !important; }
  [data-ogsc] .udf-link { color: #b59cff !important; }
</style>
</head>
<body class="udf-bg" style="margin:0;padding:0;background:#f5f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="udf-bg" style="background:#f5f5f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="udf-card" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
          <tr>
            <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <h1 class="udf-h1" style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.01em;line-height:1.2;">Sign in to UpDraft</h1>
              <p class="udf-body" style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#374151;">Click the button below to sign in. This link expires in 15 minutes and works once.</p>
              <p style="margin:0 0 24px;">
                <a href="${safeLink}" class="udf-cta" style="display:inline-block;padding:12px 22px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Sign in to UpDraft</a>
              </p>
              <p class="udf-muted" style="margin:0 0 6px;font-size:13px;color:#6b7280;">Or paste this link into your browser:</p>
              <p class="udf-muted" style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all;"><a href="${safeLink}" class="udf-link" style="color:#7C3AED;text-decoration:underline;">${safeLink}</a></p>
              <hr class="udf-divider" style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
              <p class="udf-faint" style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">If you didn't request this, you can safely ignore the email — no account was created. Sent to ${safeEmail}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      text: `Sign in to UpDraft\n\nUse this link to sign in (expires in 15 minutes, single-use):\n${link}\n\nIf you didn't request this, you can safely ignore this email — no account was created.`,
    });

    if (!sent.ok) {
      console.error('updraft-auth.issue: send failed', sent.error);
      return NextResponse.json(
        { error: 'Could not send the sign-in email. Try again in a moment.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('updraft-auth.issue:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
