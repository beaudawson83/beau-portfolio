import { NextRequest, NextResponse } from 'next/server';
import { isBlogEditorAuthorized } from '@/lib/blog-auth';
import {
  createPost,
  isBlogStoreConfigured,
  readAllPostSummaries,
  readPublishedPostSummaries,
  type CreatePostInput,
} from '@/lib/blog-store';
import { normalizeCategory, slugify } from '@/lib/blog-utils';
import type { BlogBlock, BlogCoverId } from '@/types';

const COVER_IDS: ReadonlySet<BlogCoverId> = new Set([
  'cover-mesh',
  'cover-grid',
  'cover-stripe',
  'cover-photo',
  'none',
]);

// ----------------------------------------------------------------------------
// GET /api/blog/posts
// Public: returns published summaries.
// With Bearer: returns all statuses.
// ----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ posts: [] });
  }
  const admin = isBlogEditorAuthorized(request);
  try {
    const posts = admin
      ? await readAllPostSummaries()
      : await readPublishedPostSummaries();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('GET /api/blog/posts:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// POST /api/blog/posts
// Auth: required. Creates a new draft.
// ----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  if (!isBlogEditorAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const input = parseCreateInput(body);
  if (!input) {
    return NextResponse.json({ error: 'Invalid post data' }, { status: 400 });
  }

  try {
    const post = await createPost(input);
    if (!post) {
      return NextResponse.json(
        { error: 'Failed to create post (slug may already exist)' },
        { status: 409 },
      );
    }
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog/posts:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

function parseCreateInput(raw: unknown): CreatePostInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const slugInput = typeof r.slug === 'string' ? r.slug.trim() : '';
  if (!slugInput) return null;
  const slug = slugify(slugInput);
  if (!slug) return null;

  const out: CreatePostInput = { slug };
  if (typeof r.title === 'string') out.title = r.title;
  if (typeof r.dek === 'string') out.dek = r.dek;
  if (r.category === null) {
    out.category = null;
  } else if (typeof r.category === 'string') {
    out.category = normalizeCategory(r.category);
  }
  if (Array.isArray(r.tags)) {
    out.tags = r.tags.filter((t): t is string => typeof t === 'string').slice(0, 16);
  }
  if (typeof r.coverId === 'string' && COVER_IDS.has(r.coverId as BlogCoverId)) {
    out.coverId = r.coverId as BlogCoverId;
  }
  if (r.coverUrl === null || typeof r.coverUrl === 'string') {
    out.coverUrl = (r.coverUrl as string | null) ?? null;
  }
  if (Array.isArray(r.body)) {
    // Trust the editor — block shape is validated implicitly by the renderer
    // (unknown shapes simply render as empty). We strip non-objects.
    out.body = r.body.filter((b): b is BlogBlock => !!b && typeof b === 'object') as BlogBlock[];
  }
  if (typeof r.seoDescription === 'string') out.seoDescription = r.seoDescription;
  return out;
}
