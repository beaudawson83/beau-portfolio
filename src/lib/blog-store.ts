// Blog persistence — Supabase CRUD layer.
//
// Reads are public (only `status='published' and publish_at <= now()` for the
// anonymous reader; the builder can request all statuses). Writes are gated
// upstream by isBlogEditorAuthorized (Bearer secret) and use the service-role
// client, which bypasses RLS by design.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase, isSupabaseConfigured } from './supabase';
import { computeReadTime, computeWordCount } from './blog-utils';
import type {
  BlogBlock,
  BlogCategory,
  BlogCoverId,
  BlogPost,
  BlogPostStatus,
  BlogPostSummary,
} from '@/types';

export const isBlogStoreConfigured = isSupabaseConfigured;

function client(): SupabaseClient | null {
  return isSupabaseConfigured() ? getServerSupabase() : null;
}

// ---------------------------------------------------------------------------
// Row → object mapping (snake_case → camelCase)
// ---------------------------------------------------------------------------

interface PostRow {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string | null;
  tags: string[] | null;
  cover_id: string;
  cover_url: string | null;
  body: BlogBlock[] | null;
  word_count: number;
  read_time: number;
  seo_description: string;
  status: string;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

const ALL_COLUMNS =
  'id,slug,title,dek,category,tags,cover_id,cover_url,body,word_count,read_time,seo_description,status,publish_at,created_at,updated_at';

const SUMMARY_COLUMNS =
  'id,slug,title,dek,category,tags,cover_id,cover_url,word_count,read_time,seo_description,status,publish_at,created_at,updated_at';

function rowToPost(r: PostRow): BlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    category: (r.category ?? null) as BlogCategory | null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    coverId: (r.cover_id || 'cover-mesh') as BlogCoverId,
    coverUrl: r.cover_url,
    body: Array.isArray(r.body) ? r.body : [],
    wordCount: r.word_count,
    readTime: r.read_time,
    seoDescription: r.seo_description,
    status: (r.status as BlogPostStatus) || 'draft',
    publishAt: r.publish_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToSummary(r: Omit<PostRow, 'body'>): BlogPostSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    category: (r.category ?? null) as BlogCategory | null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    coverId: (r.cover_id || 'cover-mesh') as BlogCoverId,
    coverUrl: r.cover_url,
    wordCount: r.word_count,
    readTime: r.read_time,
    seoDescription: r.seo_description,
    status: (r.status as BlogPostStatus) || 'draft',
    publishAt: r.publish_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// READ — public reader (only published-and-live posts)
// ---------------------------------------------------------------------------

export async function readPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('blog_posts')
    .select(ALL_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('publish_at', new Date().toISOString())
    .maybeSingle<PostRow>();
  if (error) {
    console.error('readPublishedPostBySlug:', error);
    return null;
  }
  return data ? rowToPost(data) : null;
}

export interface PostListQuery {
  category?: BlogCategory;
  query?: string;
  limit?: number;
}

export async function readPublishedPostSummaries(
  q: PostListQuery = {},
): Promise<BlogPostSummary[]> {
  const sb = client();
  if (!sb) return [];
  const limit = Math.max(1, Math.min(200, q.limit ?? 50));
  let query = sb
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: false })
    .limit(limit);
  if (q.category) query = query.eq('category', q.category);
  if (q.query) query = query.ilike('title', `%${q.query}%`);
  const { data, error } = await query;
  if (error) {
    console.error('readPublishedPostSummaries:', error);
    return [];
  }
  return ((data ?? []) as Omit<PostRow, 'body'>[]).map(rowToSummary);
}

// ---------------------------------------------------------------------------
// READ — admin (drafts + scheduled + published, by slug or all)
// ---------------------------------------------------------------------------

export async function readAnyPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('blog_posts')
    .select(ALL_COLUMNS)
    .eq('slug', slug)
    .maybeSingle<PostRow>();
  if (error) {
    console.error('readAnyPostBySlug:', error);
    return null;
  }
  return data ? rowToPost(data) : null;
}

export async function readAllPostSummaries(): Promise<BlogPostSummary[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('readAllPostSummaries:', error);
    return [];
  }
  return ((data ?? []) as Omit<PostRow, 'body'>[]).map(rowToSummary);
}

export interface CategoryQuery {
  /** When true, includes categories that exist on drafts/scheduled posts. */
  includeUnpublished?: boolean;
}

/**
 * Distinct category values across the blog, sorted alphabetically.
 * The default scope returns only categories used on published posts; pass
 * `includeUnpublished` to surface categories that exist on drafts (used by
 * the editor dropdown so a freshly-typed category appears immediately).
 */
export async function readDistinctCategories(
  q: CategoryQuery = {},
): Promise<string[]> {
  const sb = client();
  if (!sb) return [];
  let query = sb
    .from('blog_posts')
    .select('category')
    .not('category', 'is', null);
  if (!q.includeUnpublished) {
    query = query
      .eq('status', 'published')
      .lte('publish_at', new Date().toISOString());
  }
  const { data, error } = await query;
  if (error) {
    console.error('readDistinctCategories:', error);
    return [];
  }
  const set = new Set<string>();
  for (const row of (data ?? []) as { category: string | null }[]) {
    if (row.category) set.add(row.category);
  }
  return Array.from(set).sort();
}

export async function readMostRecentDraftSlug(): Promise<string | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('blog_posts')
    .select('slug')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ slug: string }>();
  if (error) {
    console.error('readMostRecentDraftSlug:', error);
    return null;
  }
  return data?.slug ?? null;
}

// ---------------------------------------------------------------------------
// WRITE — gated upstream by isBlogEditorAuthorized
// ---------------------------------------------------------------------------

export interface CreatePostInput {
  slug: string;
  title?: string;
  dek?: string;
  category?: BlogCategory | null;
  tags?: string[];
  coverId?: BlogCoverId;
  coverUrl?: string | null;
  body?: BlogBlock[];
  seoDescription?: string;
}

export async function createPost(input: CreatePostInput): Promise<BlogPost | null> {
  const sb = client();
  if (!sb) return null;
  const body = input.body ?? [];
  const wordCount = computeWordCount(body, input.title ?? '', input.dek ?? '');
  const readTime = computeReadTime(body, input.title ?? '', input.dek ?? '');
  const { data, error } = await sb
    .from('blog_posts')
    .insert({
      slug: input.slug,
      title: input.title ?? '',
      dek: input.dek ?? '',
      category: input.category ?? null,
      tags: input.tags ?? [],
      cover_id: input.coverId ?? 'cover-mesh',
      cover_url: input.coverUrl ?? null,
      body,
      word_count: wordCount,
      read_time: readTime,
      seo_description: input.seoDescription ?? '',
      status: 'draft',
      publish_at: null,
    })
    .select(ALL_COLUMNS)
    .single<PostRow>();
  if (error) {
    console.error('createPost:', error);
    return null;
  }
  return data ? rowToPost(data) : null;
}

export interface PatchPostInput {
  slug?: string;
  title?: string;
  dek?: string;
  category?: BlogCategory | null;
  tags?: string[];
  coverId?: BlogCoverId;
  coverUrl?: string | null;
  body?: BlogBlock[];
  seoDescription?: string;
  status?: BlogPostStatus;
  publishAt?: string | null;
}

export async function patchPost(
  currentSlug: string,
  patch: PatchPostInput,
): Promise<BlogPost | null> {
  const sb = client();
  if (!sb) return null;

  // If body/title/dek changed, recompute counts. Otherwise leave them.
  const recompute =
    patch.body !== undefined || patch.title !== undefined || patch.dek !== undefined;

  let wordCount: number | undefined;
  let readTime: number | undefined;
  if (recompute) {
    const existing = await readAnyPostBySlug(currentSlug);
    if (!existing) return null;
    const nextBody = patch.body ?? existing.body;
    const nextTitle = patch.title ?? existing.title;
    const nextDek = patch.dek ?? existing.dek;
    wordCount = computeWordCount(nextBody, nextTitle, nextDek);
    readTime = computeReadTime(nextBody, nextTitle, nextDek);
  }

  // If transitioning to 'published' without an explicit publish_at, set now.
  const updates: Record<string, unknown> = {};
  if (patch.slug !== undefined) updates.slug = patch.slug;
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.dek !== undefined) updates.dek = patch.dek;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.coverId !== undefined) updates.cover_id = patch.coverId;
  if (patch.coverUrl !== undefined) updates.cover_url = patch.coverUrl;
  if (patch.body !== undefined) updates.body = patch.body;
  if (patch.seoDescription !== undefined) updates.seo_description = patch.seoDescription;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.publishAt !== undefined) updates.publish_at = patch.publishAt;
  if (wordCount !== undefined) updates.word_count = wordCount;
  if (readTime !== undefined) updates.read_time = readTime;

  // Auto-set publish_at when going to published if caller didn't set one.
  if (patch.status === 'published' && patch.publishAt === undefined) {
    updates.publish_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return readAnyPostBySlug(currentSlug);
  }

  const { data, error } = await sb
    .from('blog_posts')
    .update(updates)
    .eq('slug', currentSlug)
    .select(ALL_COLUMNS)
    .maybeSingle<PostRow>();
  if (error) {
    console.error('patchPost:', error);
    return null;
  }
  return data ? rowToPost(data) : null;
}

export async function deletePost(slug: string): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb.from('blog_posts').delete().eq('slug', slug);
  if (error) {
    console.error('deletePost:', error);
    return false;
  }
  return true;
}
