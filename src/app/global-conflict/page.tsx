import type { Metadata } from 'next';
import { getConflictData } from '@/lib/conflict-data';
import GlobalConflictModule from '@/components/GlobalConflict';
import GlobalConflictPageHeader from '@/components/GlobalConflict/PageHeader';

export const metadata: Metadata = {
  title: 'Global Conflict Index — Beau Dawson',
  description:
    'A daily synthesis of armed conflict data and breaking reportage, refreshed each morning at 7am Central by an AI research agent.',
  robots: { index: true, follow: true },
};

export const revalidate = 900;

export default async function GlobalConflictPage() {
  const data = await getConflictData();

  return (
    <div className="min-h-screen">
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
        color: 'var(--muted)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-bright)', marginBottom: 16 }}>
        no data yet
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        The conflict journal is empty. The Claude Routine populates it daily at
        7am Central. Check <code style={{ color: 'var(--faint)' }}>/api/conflict/status</code> for
        diagnostics.
      </p>
    </div>
  );
}
