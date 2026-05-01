import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ArticleView from '@/components/Blog/Reader/ArticleView';
import { getPublishedPostBySlug } from '@/lib/blog-data';
import { readPublishedPostSummaries } from '@/lib/blog-store';

export const revalidate = 900;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { robots: { index: false, follow: false } };
  return {
    title: `${post.title} | Beau Dawson`,
    description: post.seoDescription || post.dek,
    robots: { index: false, follow: false }, // blog stays noindex until launch
    openGraph: {
      title: post.title,
      description: post.seoDescription || post.dek,
      type: 'article',
      publishedTime: post.publishAt ?? undefined,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  // For prev/next, fetch all summaries (cheap — small set, single DB call).
  const all = await readPublishedPostSummaries();
  const idx = all.findIndex((p) => p.slug === slug);
  // Newer-first ordering: prev = newer post, next = older post.
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const themeCookie = cookieStore.get('tn-theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  return <ArticleView post={post} prev={prev} next={next} theme={theme} />;
}
