import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/rankings?tag=<tag_name>
 * ?mode=all  → そのタグを持つともだち全員分のランキングを一括返却（デフォルト）
 * ?userId=xx → 特定ユーザー（後方互換）
 *
 * mode=all の場合のレスポンス:
 * {
 *   success: true,
 *   data: {
 *     users: [
 *       {
 *         id: string, name: string, avatar_url: string|null,
 *         isMe: boolean,
 *         postCount: number,
 *         isKing: boolean,
 *         posts: [{id, title, store_name, image_url, image_urls, rating, visited_at}]
 *       }
 *     ]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const tag = request.nextUrl.searchParams.get('tag');
      const mode = request.nextUrl.searchParams.get('mode') ?? 'all';
      const targetUserId = request.nextUrl.searchParams.get('userId') || auth.userId;

      if (!tag) {
        return NextResponse.json({ success: false, error: 'tag parameter required' }, { status: 400 });
      }

      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      // ── mode=all: ともだち全員分のランキングを返す ─────────────────────
      if (mode === 'all') {
        // ともだちのID一覧を取得
        const friendships = await prisma.friendship.findMany({
          where: {
            status: 'accepted',
            OR: [
              { user_id: auth.userId },
              { friend_id: auth.userId },
            ],
          },
          select: { user_id: true, friend_id: true },
        });
        const friendIds = friendships.map(f =>
          f.user_id === auth.userId ? f.friend_id : f.user_id
        );
        const allUserIds = [auth.userId, ...friendIds];

        // 各ユーザーのプロフィールを取得
        const users = await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, avatar_url: true },
        });

        // 各ユーザーのタグ付き投稿を取得
        const results = await Promise.all(
          users.map(async (user) => {
            // そのユーザーのそのタグが付いた全投稿を取得
            const postsWithTag = await prisma.post.findMany({
              where: {
                user_id: user.id,
                app_type: appType,
                tags: { some: { tag: { name: tag } } },
              },
              select: {
                id: true,
                title: true,
                store_name: true,
                image_url: true,
                image_urls: true,
                rating: true,
                visited_at: true,
                created_at: true,
              },
              orderBy: { created_at: 'asc' },
            });

            if (postsWithTag.length === 0) return null;

            // 既存ランキングを取得
            const rankings = await prisma.tagRanking.findMany({
              where: { user_id: user.id, tag_name: tag },
              orderBy: { rank: 'asc' },
            });

            // ランキング順に並び替え（未登録は末尾）
            const rankedPostIds = rankings.map(r => r.post_id);
            const rankedSet = new Set(rankedPostIds);
            const rankedPosts = rankedPostIds
              .map(id => postsWithTag.find(p => p.id === id))
              .filter(Boolean) as typeof postsWithTag;
            const unrankedPosts = postsWithTag.filter(p => !rankedSet.has(p.id));
            const orderedPosts = [...rankedPosts, ...unrankedPosts];

            return {
              id: user.id,
              name: user.name,
              avatar_url: user.avatar_url,
              isMe: user.id === auth.userId,
              postCount: postsWithTag.length,
              posts: orderedPosts.map(p => ({
                id: p.id,
                title: p.title,
                store_name: p.store_name,
                image_url: p.image_url,
                image_urls: p.image_urls,
                rating: p.rating,
                visited_at: p.visited_at,
              })),
            };
          })
        );

        // nullを除外（タグを持たないユーザーを除く）
        const validResults = results.filter(Boolean) as NonNullable<typeof results[0]>[];

        // ○○王判定（投稿数最大）
        const maxPostCount = Math.max(...validResults.map(r => r.postCount));
        const finalResults = validResults.map(r => ({
          ...r,
          isKing: r.postCount === maxPostCount && maxPostCount > 0,
        }));

        // 自分を先頭に、次いで投稿数の多い順に並べる
        finalResults.sort((a, b) => {
          if (a.isMe && !b.isMe) return -1;
          if (!a.isMe && b.isMe) return 1;
          return b.postCount - a.postCount;
        });

        return NextResponse.json({ success: true, data: { users: finalResults } });
      }

      // ── 後方互換: 特定ユーザーのランキングを返す（旧仕様） ────────────
      if (targetUserId !== auth.userId) {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user_id: auth.userId, friend_id: targetUserId },
              { user_id: targetUserId, friend_id: auth.userId },
            ]
          }
        });
        if (!friendship) {
          return NextResponse.json({ success: false, error: 'ともだちではありません' }, { status: 403 });
        }
      }

      const rankings = await prisma.tagRanking.findMany({
        where: { user_id: targetUserId, tag_name: tag },
        orderBy: { rank: 'asc' },
        include: { post: { include: { tags: { include: { tag: true } } } } },
      });

      const postsWithTag = await prisma.post.findMany({
        where: {
          user_id: targetUserId,
          app_type: appType,
          tags: { some: { tag: { name: tag } } },
        },
        include: { tags: { include: { tag: true } } },
        orderBy: { created_at: 'asc' },
      });

      const rankedPostIds = new Set(rankings.map((r: any) => r.post_id));
      const unrankedPosts = postsWithTag.filter((p: any) => !rankedPostIds.has(p.id));
      const rankedPosts = rankings.map((r: any) => r.post);
      const finalPosts = [...rankedPosts, ...unrankedPosts];

      const formatted = finalPosts.map((p: any) => ({
        id: p.id,
        title: p.title,
        store_name: p.store_name,
        image_url: p.image_url,
        image_urls: p.image_urls,
        rating: p.rating,
        visited_at: p.visited_at,
        created_at: p.created_at,
        tags: p.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) ?? [],
      }));

      return NextResponse.json({ success: true, data: formatted });
    } catch (e: any) {
      console.error('[GET /api/rankings]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PUT /api/rankings
 * ランキング順を一括保存
 * body: { tag: string, orderedPostIds: string[] }
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { tag, orderedPostIds } = await request.json();
      if (!tag || !Array.isArray(orderedPostIds)) {
        return NextResponse.json({ success: false, error: 'tag and orderedPostIds required' }, { status: 400 });
      }

      // upsert で一括更新
      await prisma.$transaction(
        orderedPostIds.map((postId: string, i: number) =>
          prisma.tagRanking.upsert({
            where: { user_id_tag_name_post_id: { user_id: auth.userId, tag_name: tag, post_id: postId } },
            create: { user_id: auth.userId, tag_name: tag, post_id: postId, rank: i + 1 },
            update: { rank: i + 1 },
          })
        )
      );

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[PUT /api/rankings]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
