import { cookies } from 'next/headers';
import EditorPage from '@/components/Blog/Builder/EditorPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogEditSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const theme: 'dark' | 'light' = cookieStore.get('tn-theme')?.value === 'light' ? 'light' : 'dark';
  return <EditorPage slug={slug} theme={theme} />;
}
