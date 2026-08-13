import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/groups/[id]/posts
 * Fetch all posts shared to a specific group.
 * Validates membership before returning data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    // 1. Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: auth.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // 2. Fetch all members of the group
    const members = await prisma.groupMember.findMany({
      where: { group_id: id },
      select: { user_id: true }
    });
    const memberIds = members.map((m: { user_id: string }) => m.user_id);

    // 3. Fetch shared posts from these members (excluding private posts)
    const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';
    const postsResult = await prisma.post.findMany({
      where: { 
        user_id: { in: memberIds },
        is_mine_only: false,
        app_type: appType
      },
      include: {
        user: {
          select: { id: true, name: true, avatar_url: true }
        },
        tags: {
          include: {
            tag: true,
          },
        },
        want_to_gos: true,
        visiteds: true,
        likes: true,
        _count: {
          select: { comments: true, likes: true }
        }
      },
      orderBy: {
        visited_at: 'desc',
      },
    });

    // Flatten results
    const posts = postsResult.map((post: any) => {
      // Calculate average rating
      const allRatings = post.visiteds.filter((v: any) => v.rating != null).map((v: any) => v.rating);
      if (post.rating != null && post.rating > 0) allRatings.push(post.rating);
      const rawAvg = allRatings.length > 0 ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length : null;
      const avgRating = rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null;

      return {
        ...post,
        tags: post.tags.map((pt: any) => pt.tag),
        shared_at: post.created_at, // Use created_at as shared_at for compatibility
        _isMarkedWantToGo: post.want_to_gos?.some((w: any) => w.user_id === auth.userId),
        _isLikedByMe: post.likes?.some((l: any) => l.user_id === auth.userId),
        _comment_count: post._count?.comments ?? 0,
        _like_count: post._count?.likes ?? 0,
        _avgRating: avgRating,
        _ratingCount: allRatings.length,
      };
    });

    return NextResponse.json({ success: true, data: posts });
  });
}
