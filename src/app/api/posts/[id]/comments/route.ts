import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/posts/[id]/comments
 * Get all comments for a post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (_auth) => {
    try {
      const comments = await prisma.postComment.findMany({
        where: { post_id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      return NextResponse.json({ success: true, data: comments });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * POST /api/posts/[id]/comments
 * Add a comment (and optional rating) to a post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { content, rating } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
      }

      const comment = await prisma.postComment.create({
        data: {
          post_id: postId,
          user_id: auth.userId,
          content: content.trim(),
          rating: rating ?? null,
        },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      return NextResponse.json({ success: true, data: comment });
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/comments] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PUT /api/posts/[id]/comments?commentId=xxx
 * Edit own comment.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const commentId = searchParams.get('commentId');
      if (!commentId) {
        return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });
      }

      const { content, rating } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
      }

      const comment = await prisma.postComment.updateMany({
        where: { id: commentId, user_id: auth.userId },
        data: {
          content: content.trim(),
          rating: rating ?? null,
        },
      });

      if (comment.count === 0) {
        return NextResponse.json({ success: false, error: 'Not found or not authorized' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[PUT /api/posts/[id]/comments] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/posts/[id]/comments?commentId=xxx
 * Delete own comment.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const commentId = searchParams.get('commentId');
      if (!commentId) {
        return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });
      }

      await prisma.postComment.deleteMany({
        where: { id: commentId, user_id: auth.userId },
      });

      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
