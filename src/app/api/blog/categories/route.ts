import { NextRequest, NextResponse } from 'next/server';
import { isBlogEditorAuthorized } from '@/lib/blog-auth';
import { isBlogStoreConfigured, readDistinctCategories } from '@/lib/blog-store';
import { CATEGORY_SUGGESTIONS } from '@/types';

// GET /api/blog/categories
// Public:        distinct categories from published posts.
// Bearer (admin): distinct categories from all posts (drafts + scheduled
//                 + published) — used by the editor dropdown so a freshly
//                 typed category surfaces immediately.
// In both cases the four legacy seeds are unioned in so the dropdown is
// never empty on a brand-new install.
export async function GET(request: NextRequest) {
  if (!isBlogStoreConfigured()) {
    return NextResponse.json({ categories: [...CATEGORY_SUGGESTIONS] });
  }
  const admin = isBlogEditorAuthorized(request);
  try {
    const live = await readDistinctCategories({ includeUnpublished: admin });
    const merged = new Set<string>(live);
    if (admin) {
      // Editor flow: include the four seeds so a fresh install isn't empty.
      for (const c of CATEGORY_SUGGESTIONS) merged.add(c);
    }
    return NextResponse.json({
      categories: Array.from(merged).sort(),
    });
  } catch (error) {
    console.error('GET /api/blog/categories:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}
