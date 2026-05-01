// Blog — high-level read entrypoints.
//
// These wrap blog-store with the same fall-through-to-empty pattern used by
// conflict-data.ts. Pages can call these without worrying about Supabase
// configuration: an unconfigured store yields an empty list / null post,
// and the page renders an explicit empty state.

import type { BlogPost, BlogPostSummary } from '@/types';

export async function getPublishedPosts(): Promise<BlogPostSummary[]> {
  try {
    const { readPublishedPostSummaries, isBlogStoreConfigured } = await import('./blog-store');
    if (!isBlogStoreConfigured()) return [];
    return await readPublishedPostSummaries();
  } catch (err) {
    console.error('getPublishedPosts:', err);
    return [];
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { readPublishedPostBySlug, isBlogStoreConfigured } = await import('./blog-store');
    if (!isBlogStoreConfigured()) return null;
    return await readPublishedPostBySlug(slug);
  } catch (err) {
    console.error('getPublishedPostBySlug:', err);
    return null;
  }
}

export async function getAnyPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { readAnyPostBySlug, isBlogStoreConfigured } = await import('./blog-store');
    if (!isBlogStoreConfigured()) return null;
    return await readAnyPostBySlug(slug);
  } catch (err) {
    console.error('getAnyPostBySlug:', err);
    return null;
  }
}
