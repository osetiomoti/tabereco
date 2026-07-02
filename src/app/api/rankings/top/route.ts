import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/rankings/top
 * 自分のランキングの各タグの1位を返す（ホーム画面カルーセル用）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      // 1. Get user and friends
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { user_id: auth.userId },
            { friend_id: auth.userId },
          ]
        }
      });
      
      const friendIds = friendships.map(f => f.user_id === auth.userId ? f.friend_id : f.user_id);
      const targetUserIds = [auth.userId, ...friendIds];

      // 2. Get distinct tags across these users
      const allTags = await prisma.tag.findMany({
        where: { user_id: { in: targetUserIds } },
        select: { name: true, user_id: true },
        distinct: ['name', 'user_id'],
      });

      // 3. Shuffle and pick up to 20 for performance
      const shuffledTags = allTags.sort(() => 0.5 - Math.random()).slice(0, 20);

      const results: { tagName: string; post: any }[] = [];

      for (const { name: tagName, user_id: tagUserId } of shuffledTags) {
        // まずランキング登録されている1位を探す
        const topRanked = await prisma.tagRanking.findFirst({
          where: { user_id: tagUserId, tag_name: tagName, rank: 1 },
          include: {
            post: {
              include: {
                user: { select: { id: true, name: true, avatar_url: true } },
              },
            },
          },
        });

        if (topRanked?.post) {
          results.push({
            tagName,
            post: {
              id: topRanked.post.id,
              store_name: topRanked.post.store_name,
              title: topRanked.post.title,
              image_url: topRanked.post.image_url,
              image_urls: topRanked.post.image_urls,
              rating: topRanked.post.rating,
              user: topRanked.post.user,
            },
          });
        } else {
          // ランキング未設定ならそのタグで最高評価の投稿
          const topPost = await prisma.post.findFirst({
            where: {
              user_id: tagUserId,
              status: 'visited',
              tags: { some: { tag: { name: tagName } } },
            },
            orderBy: { rating: 'desc' },
            include: {
              user: { select: { id: true, name: true, avatar_url: true } },
            },
          });
          if (topPost) {
            results.push({
              tagName,
              post: {
                id: topPost.id,
                store_name: topPost.store_name,
                title: topPost.title,
                image_url: topPost.image_url,
                image_urls: (topPost as any).image_urls,
                rating: topPost.rating,
                user: topPost.user,
              },
            });
          }
        }
      }

      // 投稿があるタグのみ返す
      const filtered = results.filter(r => r.post);

      return NextResponse.json({ success: true, data: filtered });
    } catch (e: any) {
      console.error('[GET /api/rankings/top]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
