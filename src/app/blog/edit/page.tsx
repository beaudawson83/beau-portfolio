import { cookies } from 'next/headers';
import DraftsList from '@/components/Blog/Builder/DraftsList';

// Auth-gated client-side; the page itself just renders the shell.
export const dynamic = 'force-dynamic';

export default async function BlogEditEntryPage() {
  const cookieStore = await cookies();
  const theme: 'dark' | 'light' = cookieStore.get('tn-theme')?.value === 'light' ? 'light' : 'dark';
  return <DraftsList theme={theme} />;
}
