import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '@/lib/contentful';
import type { SystemLogInput } from '@/types/blog';

// Helper to check admin access
async function checkAdminAccess(): Promise<{ authorized: boolean; email?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { authorized: false };
  }

  if (!session.user.isAdmin) {
    return { authorized: false, email: session.user.email };
  }

  return { authorized: true, email: session.user.email };
}

// GET - List all posts (admin only, includes drafts)
export async function GET() {
  try {
    const { authorized, email } = await checkAdminAccess();

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get all posts including drafts for admin
    const { posts, total } = await getAllPosts({ preview: true });

    return NextResponse.json({
      success: true,
      data: { posts, total },
      admin: email,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const { authorized } = await checkAdminAccess();

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const input: SystemLogInput = body;

    // Validate required fields
    if (!input.title || !input.slug || !input.entryId || !input.body) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    const post = await createPost(input);

    return NextResponse.json({
      success: true,
      data: { post },
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { success: false, error: 'CREATE_FAILED' },
      { status: 500 }
    );
  }
}

// PUT - Update existing post
export async function PUT(request: NextRequest) {
  try {
    const { authorized } = await checkAdminAccess();

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...input } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'POST_ID_REQUIRED' },
        { status: 400 }
      );
    }

    // Check post exists
    const existing = await getPostById(id, true);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'POST_NOT_FOUND' },
        { status: 404 }
      );
    }

    const post = await updatePost(id, input);

    return NextResponse.json({
      success: true,
      data: { post },
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { success: false, error: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
}

// DELETE - Delete post
export async function DELETE(request: NextRequest) {
  try {
    const { authorized } = await checkAdminAccess();

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'POST_ID_REQUIRED' },
        { status: 400 }
      );
    }

    await deletePost(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { success: false, error: 'DELETE_FAILED' },
      { status: 500 }
    );
  }
}
