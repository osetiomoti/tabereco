import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/posts/[id]/visited
 * Toggle "visited" on another user's post, or update rating.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json().catch(() => ({}));
      const rating = body.rating !== undefined ? body.rating : undefined;

      const existing = await prisma.postVisited.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
      });

      if (rating !== undefined) {
        // Update or Create with specific rating
        const updated = await prisma.postVisited.upsert({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
          update: { rating: rating },
          create: { post_id: postId, user_id: auth.userId, rating: rating },
        });
        return NextResponse.json({ success: true, marked: true, data: updated });
      }

      // No rating provided -> Toggle behavior
      if (existing) {
        await prisma.postVisited.delete({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
        });
        return NextResponse.json({ success: true, marked: false });
      } else {
        await prisma.postVisited.create({
          data: { post_id: postId, user_id: auth.userId },
        });
        return NextResponse.json({ success: true, marked: true });
      }
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/visited] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * GET /api/posts/[id]/visited
 * Get visited count, list, and ratings for a post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const visiteds = await prisma.postVisited.findMany({
        where: { post_id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      const myRecord = visiteds.find((w) => w.user_id === auth.userId);

      return NextResponse.json({
        success: true,
        data: {
          count: visiteds.length,
          isMarked: !!myRecord,
          myRating: myRecord?.rating ?? null,
          users: visiteds.map((w) => ({ ...w.user, rating: w.rating })),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
