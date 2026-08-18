import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/rankings/tags
 * ランキング画面用：タグ一覧を投稿数（全ユーザー合計 or 自分のみ）の多い順で返す
 * ?scope=all  → ともだち全員 + 自分のタグ（デフォルト）
 * ?scope=mine → 自分のタグのみ
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const scope = request.nextUrl.searchParams.get('scope') ?? 'all';
      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      // ともだちのIDを取得
      let targetUserIds: string[] = [auth.userId];
      if (scope === 'all') {
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
        targetUserIds = [auth.userId, ...friendIds];
      }

      // 対象ユーザーが持つ投稿から、タグ名ごとの投稿数を集計
      // PostTag → Tag.name で集約
      const postTags = await prisma.postTag.findMany({
        where: {
          post: {
            user_id: { in: targetUserIds },
            app_type: appType,
          },
        },
        include: {
          tag: { select: { name: true } },
          post: { select: { user_id: true } },
        },
      });

      // タグ名ごとに集計
      const tagMap = new Map<string, { postCount: number; userIds: Set<string> }>();
      for (const pt of postTags) {
        const name = pt.tag.name;
        if (!tagMap.has(name)) {
          tagMap.set(name, { postCount: 0, userIds: new Set() });
        }
        const entry = tagMap.get(name)!;
        entry.postCount++;
        entry.userIds.add(pt.post.user_id);
      }

      // 投稿数の多い順にソート
      const sorted = Array.from(tagMap.entries())
        .map(([name, { postCount, userIds }]) => ({
          name,
          post_count: postCount,
          user_count: userIds.size,
        }))
        .filter(t => t.post_count > 0)
        .sort((a, b) => b.post_count - a.post_count);

      return NextResponse.json({ success: true, data: sorted });
    } catch (e: any) {
      console.error('[GET /api/rankings/tags]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
