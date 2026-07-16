import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/posts/[id]/want-to-go
 * Toggle "want to go" on another user's post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const existing = await prisma.postWantToGo.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
      });

      if (existing) {
        await prisma.postWantToGo.delete({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
        });
        return NextResponse.json({ success: true, marked: false });
      } else {
        await prisma.postWantToGo.create({
          data: { post_id: postId, user_id: auth.userId },
        });
        return NextResponse.json({ success: true, marked: true });
      }
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/want-to-go] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * GET /api/posts/[id]/want-to-go
 * Get want-to-go count and list for a post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const wantToGos = await prisma.postWantToGo.findMany({
        where: { post_id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      const isMarked = wantToGos.some((w) => w.user_id === auth.userId);

      return NextResponse.json({
        success: true,
        data: {
          count: wantToGos.length,
          isMarked,
          users: wantToGos.map((w) => w.user),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
