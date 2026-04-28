import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { getConflictData } from '@/lib/conflict-data';
import GlobalConflictModule from '@/components/GlobalConflict';

const interTight = Inter_Tight({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Global Conflict Index — Beau Dawson',
  description:
    'A continuously-updated synthesis of armed conflict data and breaking reportage, refreshed by an automated research agent.',
  robots: { index: false, follow: false },
};

export const revalidate = 900;

export default async function GlobalConflictPage() {
  const data = await getConflictData();

  return (
    <div
      className={`${interTight.className} ${jetbrainsMono.className}`}
      style={{ background: '#0a0a0a', minHeight: '100vh' }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '24px 32px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: '#71717a',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← back to portfolio
        </Link>
        <span
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: '#52525b',
            textTransform: 'uppercase',
          }}
        >
          beaudawson.com / lab
        </span>
      </div>
      <GlobalConflictModule initialData={data} />
    </div>
  );
}
