import { NextResponse } from 'next/server';
import { getConflictData } from '@/lib/conflict-data';

// ISR: re-read from Supabase at most every 15 minutes. The Routine writes
// once daily — short stale-while-revalidate is fine.
export const revalidate = 900;

export async function GET() {
  const payload = await getConflictData();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control':
        payload.source === 'live'
          ? 'public, s-maxage=900, stale-while-revalidate=3600'
          : 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}
