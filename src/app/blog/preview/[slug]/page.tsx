import { cookies } from 'next/headers';
import PreviewArticle from '@/components/Blog/Reader/PreviewArticle';

// Editor preview — auth-gated client side; renders any-status post.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const theme: 'dark' | 'light' =
    cookieStore.get('tn-theme')?.value === 'light' ? 'light' : 'dark';
  return <PreviewArticle slug={slug} theme={theme} />;
}
