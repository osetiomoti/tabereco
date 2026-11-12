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
 * GET /api/posts/map
 * 検索画面マップ表示用API（表示範囲Boundsに基づく軽量ピンデータ取得）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = parseSearchParams(searchParams);

      const appType = request.cookies.get('app_type')?.value || 'tabereco';

      // 共通Where句を構築
      const where = await buildSearchWhereClause(queryParams, auth.userId, appType);

      // マップ表示対象は緯度経度が存在するものに限る
      where.latitude = { ...(where.latitude as any), not: null };
      where.longitude = { ...(where.longitude as any), not: null };

      // 軽量なフィールドのみ SELECT して転送量と描画負荷を最小化
      const posts = await prisma.post.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          user_id: true,
          title: true,
          store_name: true,
          address: true,
          google_place_id: true,
          latitude: true,
          longitude: true,
          status: true,
          rating: true,
          image_url: true,
          image_urls: true,
          price_min: true,
          price_max: true,
          created_at: true,
          tags: {
            select: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
          visiteds: {
            select: {
              user_id: true,
              rating: true,
            },
          },
        },
      });

      // マップピン用に軽量整形
      const items = posts.map((post: any) => {
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

        // 代表画像URL（1枚のみ）
        const repImage = post.image_url || (post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null);

        return {
          id: post.id,
          user_id: post.user_id,
          title: post.title,
          store_name: post.store_name,
          address: post.address,
          google_place_id: post.google_place_id,
          latitude: post.latitude,
          longitude: post.longitude,
          status: post.status,
          rating: post.rating,
          image_url: repImage,
          image_urls: repImage ? [repImage] : [],
          price_min: post.price_min,
          price_max: post.price_max,
          created_at: post.created_at,
          tags: post.tags.map((pt: any) => pt.tag),
          __is_mine: isMine,
          _isMarkedVisited: !!myVisitedEntry,
          _myRating: myRatingVal,
          _avgRating: avgRating,
          _ratingCount: allRatings.length,
        };
      });

      return NextResponse.json({
        success: true,
        items,
        count: items.length,
      });
    } catch (e: any) {
      console.error('[GET /api/posts/map] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

