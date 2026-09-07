import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/posts/bulk-rating
 * Bulk update ratings by a given delta (+0.1, -0.2, etc.) for selected posts.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json();
      const { postIds, delta } = body;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return NextResponse.json({ error: 'postIds must be a non-empty array' }, { status: 400 });
      }

      if (typeof delta !== 'number' || isNaN(delta)) {
        return NextResponse.json({ error: 'delta must be a valid number' }, { status: 400 });
      }

      // Fetch user's own posts that match postIds
      const ownPosts = await prisma.post.findMany({
        where: {
          id: { in: postIds },
          user_id: auth.userId,
        },
        select: {
          id: true,
          rating: true,
        },
      });

      // Fetch visited records for posts that match postIds
      const visitedRecords = await prisma.postVisited.findMany({
        where: {
          post_id: { in: postIds },
          user_id: auth.userId,
        },
        select: {
          id: true,
          post_id: true,
          rating: true,
        },
      });

      const operations: any[] = [];
      let updatedCount = 0;

      for (const p of ownPosts) {
        const currentRating = p.rating ?? 3.0;
        const newRating = Math.max(0.1, Math.min(5.0, Math.round((currentRating + delta) * 10) / 10));
        operations.push(
          prisma.post.update({
            where: { id: p.id },
            data: { rating: newRating },
          })
        );
        updatedCount++;
      }

      for (const v of visitedRecords) {
        // Only update if not already updated via ownPosts
        if (!ownPosts.some(op => op.id === v.post_id)) {
          const currentRating = v.rating ?? 3.0;
          const newRating = Math.max(0.1, Math.min(5.0, Math.round((currentRating + delta) * 10) / 10));
          operations.push(
            prisma.postVisited.update({
              where: { id: v.id },
              data: { rating: newRating },
            })
          );
          updatedCount++;
        }
      }

      if (operations.length > 0) {
        await prisma.$transaction(operations);
      }

      return NextResponse.json({
        success: true,
        updatedCount,
      });
    } catch (error: any) {
      console.error('[BULK_RATING_ERROR]', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to bulk update ratings' },
        { status: 500 }
      );
    }
  });
}
