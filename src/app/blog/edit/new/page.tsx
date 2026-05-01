import { cookies } from 'next/headers';
import NewPostFlow from '@/components/Blog/Builder/NewPostFlow';

export const dynamic = 'force-dynamic';

export default async function BlogEditNewPage() {
  const cookieStore = await cookies();
  const theme: 'dark' | 'light' = cookieStore.get('tn-theme')?.value === 'light' ? 'light' : 'dark';
  return <NewPostFlow theme={theme} />;
}
