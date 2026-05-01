import { NextRequest, NextResponse } from 'next/server';
import { isBlogEditorAuthorized } from '@/lib/blog-auth';

// Probe endpoint — the editor's AuthGate calls this to validate a candidate
// secret before storing it in localStorage. Returns 200 on match, 401 otherwise.
export async function POST(request: NextRequest) {
  if (!isBlogEditorAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
