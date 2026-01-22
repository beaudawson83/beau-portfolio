import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllSlugs } from '@/lib/contentful';
import LogArticle from '@/components/SystemLogs/LogArticle';

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Log Not Found | SYSTEM_LOGS',
    };
  }

  return {
    title: `${post.title} | SYSTEM_LOGS`,
    description: post.metaDescription || post.executiveSummary,
    openGraph: {
      title: `${post.entryId}: ${post.title}`,
      description: post.executiveSummary,
      type: 'article',
      publishedTime: post.publishedDate,
      modifiedTime: post.updatedAt,
      authors: ['Beau Dawson'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.entryId}: ${post.title}`,
      description: post.executiveSummary,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Only show deployed posts on public site
  if (post.status !== 'DEPLOYED') {
    notFound();
  }

  return <LogArticle post={post} />;
}
