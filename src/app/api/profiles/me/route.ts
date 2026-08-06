import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { deleteS3Objects } from '@/lib/s3';

/**
 * GET /api/profiles/me
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

      // Total post count
      const [visitedCount, wantToGoCount] = await Promise.all([
        prisma.post.count({ where: { user_id: auth.userId, status: 'visited' } }),
        prisma.post.count({ where: { user_id: auth.userId, status: 'want_to_go' } }),
      ]);
      const totalPostCount = visitedCount + wantToGoCount;

      // Friends count
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [{ user_id: auth.userId }, { friend_id: auth.userId }],
          status: 'accepted',
        }
      });

      // Average rating
      const ownPosts = await prisma.post.findMany({
        where: { user_id: auth.userId },
        select: { id: true, rating: true },
      });
      const postIds = ownPosts.map(p => p.id);
      const allRatings: number[] = [];
      ownPosts.forEach(p => { if (p.rating) allRatings.push(p.rating); });
      if (postIds.length > 0) {
        const visitedRatings = await prisma.postVisited.findMany({
          where: { post_id: { in: postIds }, rating: { not: null } },
          select: { rating: true },
        });
        visitedRatings.forEach(v => { if (v.rating) allRatings.push(v.rating); });
      }
      const avgRating = allRatings.length > 0
        ? Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length * 10) / 10
        : null;

      // Rating distribution
      const ratingDistribution = [0, 1, 2, 3, 4].map(bin => ({
        label: `${bin}〜${bin + 1}`,
        min: bin,
        max: bin + 1,
        count: allRatings.filter(r => bin === 4 ? r >= bin && r <= bin + 1 : r >= bin && r < bin + 1).length,
      }));

      // Total likes received
      const totalLikesReceived = postIds.length > 0
        ? await prisma.postLike.count({ where: { post_id: { in: postIds } } })
        : 0;

      return NextResponse.json({
        success: true,
        data: { ...user, totalPostCount, friendsCount, avgRating, ratingDistribution, totalLikesReceived },
      });
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
