import { NextRequest, NextResponse } from 'next/server';
import { issueMagicLinkToken } from '@/lib/updraft/auth';
import { recordMagicToken } from '@/lib/updraft/store';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/chat-log';

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

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('updraft-auth.issue: RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured.' },
        { status: 500 },
      );
    }

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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'UpDraft <onboarding@resend.dev>',
        to: [email],
        subject: 'Your UpDraft sign-in link',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #111; color: #fff; max-width: 560px;">
            <h1 style="margin: 0 0 16px; font-size: 22px; color: #fff;">Sign in to UpDraft</h1>
            <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.5;">Click the button below to sign in. This link expires in 15 minutes and works once.</p>
            <p style="margin: 24px 0;">
              <a href="${safeLink}" style="display: inline-block; padding: 12px 20px; background: #7C3AED; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign in to UpDraft</a>
            </p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #94A3B8;">Or paste this link into your browser:</p>
            <p style="margin: 0; font-size: 12px; color: #94A3B8; word-break: break-all;">${safeLink}</p>
            <hr style="border: 0; border-top: 1px solid #2A2A2A; margin: 24px 0;" />
            <p style="margin: 0; font-size: 12px; color: #64748b;">If you didn't request this, you can safely ignore the email — no account was created. Sent to ${safeEmail}.</p>
          </div>
        `,
        text: `Sign in to UpDraft\n\nUse this link to sign in (expires in 15 minutes, single-use):\n${link}\n\nIf you didn't request this, you can safely ignore this email — no account was created.`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('updraft-auth.issue: Resend API error', err);
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
