import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { getConflictData } from '@/lib/conflict-data';
import GlobalConflictModule from '@/components/GlobalConflict';
import GlobalConflictPageHeader from '@/components/GlobalConflict/PageHeader';

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
    'A daily synthesis of armed conflict data and breaking reportage, refreshed each morning at 7am Central by an AI research agent.',
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
      <GlobalConflictPageHeader
        lastUpdated={data.source === 'empty' ? null : data.lastUpdated}
      />
      {data.source === 'empty' ? <EmptyState /> : <GlobalConflictModule initialData={data} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '120px auto',
        padding: '48px 32px',
        textAlign: 'center',
        color: '#a1a1aa',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: '#52525b', textTransform: 'uppercase', marginBottom: 16 }}>
        no data yet
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        The conflict journal is empty. The Claude Routine populates it daily at
        7am Central. Check <code style={{ color: '#71717a' }}>/api/conflict/status</code> for
        diagnostics.
      </p>
    </div>
  );
}
