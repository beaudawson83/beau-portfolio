'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { pageview } from '@/lib/analytics';

// Hardcode the GA ID to ensure it's available at runtime
// This is the recommended approach for Next.js when env vars are problematic
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-CHK1H7XQV3';

// Separate component to handle search params (requires Suspense)
function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the scripts - they'll load on the client
  return (
    <>
      {/* Google Analytics Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
              enhanced_link_attribution: true,
              cookie_flags: 'SameSite=None;Secure',
            });
          `,
        }}
      />
      {/* Page view tracking on route changes */}
      {mounted && (
        <Suspense fallback={null}>
          <AnalyticsPageTracker />
        </Suspense>
      )}
    </>
  );
}
