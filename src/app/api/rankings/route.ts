import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/rankings?tag=<tag_name>
 * 指定タグのランキング順で投稿一覧を返す
 * まだランキング登録がなければ、そのタグを持つ投稿を作成日順(古い順)で返す
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const tag = request.nextUrl.searchParams.get('tag');
      const targetUserId = request.nextUrl.searchParams.get('userId') || auth.userId;

      if (!tag) {
        return NextResponse.json({ success: false, error: 'tag parameter required' }, { status: 400 });
      }

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

      // 既存ランキングを取得
      const rankings = await prisma.tagRanking.findMany({
        where: { user_id: targetUserId, tag_name: tag },
        orderBy: { rank: 'asc' },
        include: {
          post: {
            include: { tags: { include: { tag: true } } },
          },
        },
      });

      // タグを持つ全投稿を取得
      const postsWithTag = await prisma.post.findMany({
        where: {
          user_id: targetUserId,
          status: 'visited', // ランキングには行った場所のみ表示する条件追加
          tags: { some: { tag: { name: tag } } },
        },
        include: { tags: { include: { tag: true } } },
        orderBy: { created_at: 'asc' },
      });

      // ランキングに登録されていない新規投稿を末尾に追加
      const rankedPostIds = new Set(rankings.map((r: any) => r.post_id));
      const unrankedPosts = postsWithTag.filter((p: any) => !rankedPostIds.has(p.id));

      const rankedPosts = rankings.map((r: any) => r.post);
      const finalPosts = [...rankedPosts, ...unrankedPosts];

      // レスポンス用に整形
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
