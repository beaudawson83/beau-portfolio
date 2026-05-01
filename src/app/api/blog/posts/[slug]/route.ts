import { NextRequest, NextResponse } from 'next/server';
import { isBlogEditorAuthorized } from '@/lib/blog-auth';
import {
  deletePost,
  isBlogStoreConfigured,
  patchPost,
  readAnyPostBySlug,
  readPublishedPostBySlug,
  type PatchPostInput,
} from '@/lib/blog-store';
import { isBlogPostStatus, slugify } from '@/lib/blog-utils';
import type { BlogBlock, BlogCategory, BlogCoverId } from '@/types';

const COVER_IDS: ReadonlySet<BlogCoverId> = new Set([
  'cover-mesh',
  'cover-grid',
  'cover-stripe',
  'cover-photo',
  'none',
]);

const CATEGORIES: ReadonlySet<BlogCategory> = new Set(['OPS', 'AI', 'CRAFT', 'NOTE']);

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// ----------------------------------------------------------------------------
// GET — public reads see only published posts; Bearer reads see any status.
// ----------------------------------------------------------------------------
export async function GET(request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }
  const admin = isBlogEditorAuthorized(request);
  try {
    const post = admin
      ? await readAnyPostBySlug(slug)
      : await readPublishedPostBySlug(slug);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('GET /api/blog/posts/[slug]:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// PATCH — auth required.
// ----------------------------------------------------------------------------
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  if (!isBlogEditorAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }
  const { slug } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch = parsePatchInput(body);
  if (!patch) {
    return NextResponse.json({ error: 'Invalid patch' }, { status: 400 });
  }

  try {
    const post = await patchPost(slug, patch);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('PATCH /api/blog/posts/[slug]:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// DELETE — auth required.
// ----------------------------------------------------------------------------
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  if (!isBlogEditorAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }
  const { slug } = await ctx.params;
  try {
    const ok = await deletePost(slug);
    if (!ok) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/blog/posts/[slug]:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

function parsePatchInput(raw: unknown): PatchPostInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: PatchPostInput = {};

  if (r.slug !== undefined) {
    if (typeof r.slug !== 'string') return null;
    const s = slugify(r.slug);
    if (!s) return null;
    out.slug = s;
  }
  if (r.title !== undefined) {
    if (typeof r.title !== 'string') return null;
    out.title = r.title;
  }
  if (r.dek !== undefined) {
    if (typeof r.dek !== 'string') return null;
    out.dek = r.dek;
  }
  if (r.category !== undefined) {
    if (r.category === null) {
      out.category = null;
    } else if (typeof r.category === 'string' && CATEGORIES.has(r.category as BlogCategory)) {
      out.category = r.category as BlogCategory;
    } else {
      return null;
    }
  }
  if (r.tags !== undefined) {
    if (!Array.isArray(r.tags)) return null;
    out.tags = r.tags.filter((t): t is string => typeof t === 'string').slice(0, 16);
  }
  if (r.coverId !== undefined) {
    if (typeof r.coverId !== 'string' || !COVER_IDS.has(r.coverId as BlogCoverId)) return null;
    out.coverId = r.coverId as BlogCoverId;
  }
  if (r.coverUrl !== undefined) {
    if (r.coverUrl !== null && typeof r.coverUrl !== 'string') return null;
    out.coverUrl = (r.coverUrl as string | null) ?? null;
  }
  if (r.body !== undefined) {
    if (!Array.isArray(r.body)) return null;
    out.body = r.body.filter((b): b is BlogBlock => !!b && typeof b === 'object') as BlogBlock[];
  }
  if (r.seoDescription !== undefined) {
    if (typeof r.seoDescription !== 'string') return null;
    out.seoDescription = r.seoDescription;
  }
  if (r.status !== undefined) {
    if (!isBlogPostStatus(r.status)) return null;
    out.status = r.status;
  }
  if (r.publishAt !== undefined) {
    if (r.publishAt === null) out.publishAt = null;
    else if (typeof r.publishAt === 'string') out.publishAt = r.publishAt;
    else return null;
  }
  return out;
}
