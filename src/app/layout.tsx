import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Beau Dawson | OPS_DIRECTOR_AI_ARCHITECT',
  description:
    '10+ years scaling revenue systems and support infrastructure. Bridging the gap between Operational Strategy and Technical Execution.',
  keywords: [
    'Operations Director',
    'AI Architect',
    'CRM',
    'Automation',
    'BAD Labs',
    'BAD Labs Console',
    'Austin TX',
  ],
  authors: [{ name: 'Beau Dawson' }],
  openGraph: {
    title: 'Beau Dawson | OPS_DIRECTOR_AI_ARCHITECT',
    description:
      '10+ years scaling revenue systems and support infrastructure. Bridging the gap between Operational Strategy and Technical Execution.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beau Dawson | OPS_DIRECTOR_AI_ARCHITECT',
    description:
      '10+ years scaling revenue systems and support infrastructure.',
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
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#111111] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
