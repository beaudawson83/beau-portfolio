import { NextRequest, NextResponse } from 'next/server';
import { trackPostView, generateVisitorHash } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'SLUG_REQUIRED' },
        { status: 400 }
      );
    }

    // Generate visitor hash for unique visitor tracking
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0] ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    const visitorHash = generateVisitorHash(ip, userAgent);

    await trackPostView(slug, visitorHash);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Don't fail the request for analytics errors
    return NextResponse.json({ success: true });
  }
}
