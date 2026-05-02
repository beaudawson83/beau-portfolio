import { NextRequest, NextResponse } from 'next/server';
import { isBlogEditorAuthorized } from '@/lib/blog-auth';
import { signUpload } from '@/lib/blog-media';

// POST /api/blog/media/sign
// Auth: required (BLOG_EDITOR_SECRET).
// Body: { filename: string; contentType: string; size: number }
// Returns: { uploadUrl, publicUrl, path }
//
// The client then PUTs the file body directly to `uploadUrl` with the
// matching Content-Type header. After the PUT succeeds, `publicUrl` is
// the URL to embed in the post body.

export async function POST(request: NextRequest) {
  if (!isBlogEditorAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const r = body as Record<string, unknown>;
  const filename = typeof r.filename === 'string' ? r.filename.trim() : '';
  const contentType = typeof r.contentType === 'string' ? r.contentType.trim() : '';
  const size = typeof r.size === 'number' ? r.size : 0;

  if (!filename || !contentType || !size) {
    return NextResponse.json(
      { error: 'filename, contentType, and size are required' },
      { status: 400 },
    );
  }

  const result = await signUpload({ filename, contentType, size });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
