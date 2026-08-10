import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/profiles/[id]
 * Fetch user profile and posts for a given user ID (friend or group member).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (auth) => {
    try {
      const resolvedParams = await params;
      const targetUserId = resolvedParams.id;

      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }

      // Check if target is self
      const isSelf = auth.userId === targetUserId;

      if (!isSelf) {
        // Check if they are friends
        const isFriend = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user_id: auth.userId, friend_id: targetUserId },
              { user_id: targetUserId, friend_id: auth.userId }
            ]
          }
        });

        // Check if they share any groups
        let shareGroup = false;
        if (!isFriend) {
          const myGroups = await prisma.groupMember.findMany({
            where: { user_id: auth.userId },
            select: { group_id: true }
          });
          const myGroupIds = myGroups.map(g => g.group_id);

          if (myGroupIds.length > 0) {
            const commonMember = await prisma.groupMember.findFirst({
              where: {
                user_id: targetUserId,
                group_id: { in: myGroupIds }
              }
            });
            if (commonMember) shareGroup = true;
          }
        }

        if (!isFriend && !shareGroup) {
          return NextResponse.json({ success: false, error: 'Unauthorized to view this profile' }, { status: 403 });
        }
      }

      // Fetch user info
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, avatar_url: true, email: true }
      });

      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      // Fetch user's public/shared posts (is_mine_only = false)
      const posts = await prisma.post.findMany({
        where: {
          user_id: targetUserId,
          is_mine_only: false,
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
        },
        orderBy: {
          visited_at: 'desc',
        },
      });

      // Flatten tags
      const resultPosts = posts.map((post: any) => ({
        ...post,
        tags: post.tags.map((pt: any) => pt.tag),
      }));

      // Count friends (accepted only)
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [
            { user_id: targetUserId },
            { friend_id: targetUserId }
          ],
          status: 'accepted',
        }
      });

      // Count groups
      const groupsCount = await prisma.groupMember.count({
        where: { user_id: targetUserId }
      });

      // Total post count (own visited + own want_to_go + marked)
      const [visitedCount, wantToGoCount, markedVisitedCount, markedWantToGoCount] = await Promise.all([
        prisma.post.count({ where: { user_id: targetUserId, status: 'visited', is_mine_only: false } }),
        prisma.post.count({ where: { user_id: targetUserId, status: 'want_to_go', is_mine_only: false } }),
        prisma.postVisited.count({ where: { user_id: targetUserId, post: { is_mine_only: false } } }),
        prisma.postWantToGo.count({ where: { user_id: targetUserId, post: { is_mine_only: false } } }),
      ]);
      const totalPostCount = visitedCount + wantToGoCount + markedVisitedCount + markedWantToGoCount;

      // Average rating (Ratings the target user has given)
      const ownRatedPosts = await prisma.post.findMany({
        where: { user_id: targetUserId, rating: { not: null }, is_mine_only: false },
        select: {
          id: true,
          title: true,
          image_url: true,
          rating: true,
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });
      const visitedRated = await prisma.postVisited.findMany({
        where: { user_id: targetUserId, rating: { not: null } },
        select: {
          rating: true,
          post: {
            select: {
              id: true,
              title: true,
              image_url: true,
              user: { select: { id: true, name: true, avatar_url: true } },
            },
          },
        },
      });

      const allRatings: number[] = [];
      const ratedPosts: any[] = [];

      ownRatedPosts.forEach(p => {
        if (p.rating != null) {
          allRatings.push(p.rating);
          ratedPosts.push({ id: p.id, title: p.title, image_url: p.image_url, rating: p.rating, user: p.user });
        }
      });

      visitedRated.forEach(v => {
        if (v.rating != null && v.post) {
          allRatings.push(v.rating);
          ratedPosts.push({
            id: v.post.id,
            title: v.post.title,
            image_url: v.post.image_url,
            rating: v.rating,
            user: v.post.user,
          });
        }
      });

      const avgRating = allRatings.length > 0
        ? Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length * 10) / 10
        : null;

      // Rating distribution for chart: bins [0-1), [1-2), [2-3), [3-4), [4-5]
      const ratingDistribution = [0, 1, 2, 3, 4].map(bin => ({
        label: `${bin}〜${bin + 1}`,
        min: bin,
        max: bin + 1,
        count: allRatings.filter(r =>
          bin === 4 ? r >= bin && r <= bin + 1 : r >= bin && r < bin + 1
        ).length,
      }));

      // Total likes received on user's posts
      const ownPosts = await prisma.post.findMany({
        where: { user_id: targetUserId },
        select: { id: true },
      });
      const postIds = ownPosts.map(p => p.id);
      const totalLikesReceived = postIds.length > 0
        ? await prisma.postLike.count({ where: { post_id: { in: postIds } } })
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          user,
          posts: resultPosts,
          friendsCount,
          groupsCount,
          totalPostCount,
          avgRating,
          ratingDistribution,
          totalLikesReceived,
          ratedPosts,
        }
      });
    } catch (e: any) {
      console.error('[GET /api/profiles/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
