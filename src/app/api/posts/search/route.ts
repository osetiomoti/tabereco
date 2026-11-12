import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import {
  parseSearchParams,
  buildSearchWhereClause,
  buildSearchOrderBy,
} from '@/lib/searchQuery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/posts/search
 * 検索画面リスト表示用API（100件ずつページネーション）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = parseSearchParams(searchParams);

      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
      const skip = (page - 1) * limit;

      const appType = request.cookies.get('app_type')?.value || 'tabereco';

      // 共通Where句とOrderBy句を構築
      const where = await buildSearchWhereClause(queryParams, auth.userId, appType);
      const orderBy = buildSearchOrderBy(queryParams.sortOrder);

      // 並列でトータル件数と100件分のレコードを取得
      const [total, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: { select: { id: true, name: true, avatar_url: true } },
            tags: { include: { tag: true } },
            want_to_gos: { select: { user_id: true } },
            visiteds: {
              select: {
                id: true,
                user_id: true,
                rating: true,
                comment: true,
                image_url: true,
                image_urls: true,
                visited_at: true,
                visit_count: true,
                created_at: true,
              },
            },
            likes: { select: { user_id: true } },
            _count: { select: { comments: true, likes: true } },
          },
        }),
      ]);

      // レコード整形
      const items = posts.map((post: any) => {
        // 平均評価
        const allRatings = post.visiteds
          .filter((v: any) => v.rating != null)
          .map((v: any) => v.rating);
        if (post.rating != null && post.rating > 0) allRatings.push(post.rating);
        const rawAvg =
          allRatings.length > 0
            ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length
            : null;
        const avgRating = rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null;

        const myVisitedEntry = post.visiteds?.find((v: any) => v.user_id === auth.userId);
        const isMine = post.user_id === auth.userId;
        const myRatingVal = isMine ? post.rating : (myVisitedEntry?.rating ?? null);

        return {
          ...post,
          tags: post.tags.map((pt: any) => pt.tag),
          __is_mine: isMine,
          _isMarkedWantToGo: post.want_to_gos?.some((w: any) => w.user_id === auth.userId),
          _isMarkedVisited: !!myVisitedEntry,
          _isLikedByMe: post.likes?.some((l: any) => l.user_id === auth.userId),
          _myRating: myRatingVal,
          _myComment: myVisitedEntry?.comment || null,
          _myImageUrl: myVisitedEntry?.image_url || null,
          _myImageUrls: myVisitedEntry?.image_urls || [],
          _comment_count: post._count?.comments ?? 0,
          _like_count: post._count?.likes ?? 0,
          _avgRating: avgRating,
          _ratingCount: allRatings.length,
        };
      });

      const hasMore = skip + posts.length < total;
      const nextCursor = hasMore ? String(page + 1) : null;

      return NextResponse.json({
        success: true,
        items,
        total,
        page,
        limit,
        hasMore,
        nextCursor,
      });
    } catch (e: any) {
      console.error('[GET /api/posts/search] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

