import { NextResponse, type NextRequest } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-DNS-Prefetch-Control': 'on',
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // 'unsafe-inline' + 'unsafe-eval' required for Next.js hydration + Framer Motion runtime styles.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  // Allow any HTTPS image: blog covers + content images live on Supabase Storage,
  // and the editor explicitly supports paste-URL for images from anywhere
  // (Unsplash, embedded thumbnails, etc.). Image content can't execute JS.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co wss://*.supabase.co",
  // Native <audio>/<video> tags from pasted URLs.
  "media-src 'self' https:",
  // YouTube + Vimeo embeds via the blog's video block. Tight allowlist —
  // iframes can run JS, so we don't open this to arbitrary HTTPS.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export function proxy(_request: NextRequest) {
  void _request;
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  return response;
}

export const proxyConfig = {
  matcher: [
    // Apply to all routes except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)',
  ],
};
