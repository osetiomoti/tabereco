import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { deleteS3Objects } from '@/lib/s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/me
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

      // Total post count (own posts + marked posts)
      const [visitedCount, wantToGoCount, markedVisitedCount, markedWantToGoCount] = await Promise.all([
        prisma.post.count({ where: { user_id: auth.userId, status: 'visited' } }),
        prisma.post.count({ where: { user_id: auth.userId, status: 'want_to_go' } }),
        prisma.postVisited.count({ where: { user_id: auth.userId } }),
        prisma.postWantToGo.count({ where: { user_id: auth.userId } }),
      ]);
      const totalPostCount = visitedCount + wantToGoCount + markedVisitedCount + markedWantToGoCount;

      // Friends count
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [{ user_id: auth.userId }, { friend_id: auth.userId }],
          status: 'accepted',
        }
      });

      // Own posts with rating (ratings the user gave on their own posts)
      const ownRatedPosts = await prisma.post.findMany({
        where: { user_id: auth.userId, rating: { not: null } },
        select: {
          id: true,
          title: true,
          image_url: true,
          rating: true,
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      // PostVisited entries where user gave a rating (on others' posts)
      const visitedRated = await prisma.postVisited.findMany({
        where: { user_id: auth.userId, rating: { not: null } },
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

      // Collect all ratings
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

      // Rating distribution: bins [0-1), [1-2), [2-3), [3-4), [4-5]
      const ratingDistribution = [0, 1, 2, 3, 4].map(bin => ({
        label: `${bin}〜${bin + 1}`,
        min: bin,
        max: bin + 1,
        count: allRatings.filter(r =>
          bin === 4 ? r >= bin && r <= bin + 1 : r >= bin && r < bin + 1
        ).length,
      }));

      // Total likes received (on their own posts)
      const ownPostIds = await prisma.post.findMany({
        where: { user_id: auth.userId },
        select: { id: true },
      });
      const postIds = ownPostIds.map(p => p.id);
      const totalLikesReceived = postIds.length > 0
        ? await prisma.postLike.count({ where: { post_id: { in: postIds } } })
        : 0;

      const response = NextResponse.json({
        success: true,
        data: {
          ...user,
          totalPostCount,
          friendsCount,
          avgRating,
          ratingDistribution,
          totalLikesReceived,
          ratedPosts,
        },
      });
      response.headers.set('Cache-Control', 'no-store, no-cache');
      return response;
    } catch (e: any) {
      console.error('[GET /api/profiles/me]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/profiles/me
 * Update the user's name and/or avatar_url.
 */
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { name, avatar_url } = await request.json();
      const data: { name?: string; avatar_url?: string | null } = {};
      if (name && typeof name === 'string') data.name = name.trim().slice(0, 50);
      if (avatar_url !== undefined) data.avatar_url = avatar_url;

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
      }

      // If avatar_url is being updated, delete the old one from S3
      if (data.avatar_url !== undefined) {
        const oldUser = await prisma.user.findUnique({ where: { id: auth.userId } });
        if (oldUser && oldUser.avatar_url && oldUser.avatar_url !== data.avatar_url) {
          deleteS3Objects([oldUser.avatar_url], auth.idToken).catch(console.error);
        }
      }

      const user = await prisma.user.update({ where: { id: auth.userId }, data });
      return NextResponse.json({ success: true, data: user });
    } catch (e: any) {
      console.error('[PATCH /api/profiles/me]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
