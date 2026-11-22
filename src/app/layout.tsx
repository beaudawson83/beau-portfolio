import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
  title: 'Beau Dawson | Operations Leader, Systems Builder, AI Architect',
  description:
    '20+ years turning cost centers into profit engines. $1M+ recovered at Expedia. 31 promotions driven. Now building autonomous AI systems at BAD Labs.',
  keywords: [
    'Operations Director',
    'AI Architect',
    'CRM',
    'Automation',
    'BAD Labs',
    'Austin TX',
  ],
  authors: [{ name: 'Beau Dawson' }],
  openGraph: {
    title: 'Beau Dawson | Operations Leader, Systems Builder, AI Architect',
    description:
      '20+ years turning cost centers into profit engines. $1M+ recovered at Expedia. 31 promotions driven. Now building autonomous AI systems at BAD Labs.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beau Dawson | Operations Leader, Systems Builder, AI Architect',
    description:
      '20+ years turning cost centers into profit engines. Now building autonomous AI systems.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${geist.variable} ${jetbrainsMono.variable} antialiased bg-canvas text-ink`}
      >
        <div className="ui-backdrop" aria-hidden="true" />
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
