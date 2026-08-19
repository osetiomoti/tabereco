import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/tags/bulk
 * 複数投稿に一括でタグを追加（上書きではなく追記）
 * body: { postIds: string[], tagNames: string[] }
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { postIds, tagNames } = await request.json();

      if (!Array.isArray(postIds) || !Array.isArray(tagNames) || tagNames.length === 0 || postIds.length === 0) {
        return NextResponse.json({ success: false, error: 'postIds and tagNames are required' }, { status: 400 });
      }

      // まず、指定されたタグ名に対応するTagレコードを取得（または作成）
      const cookieStore = request.cookies;
      const appType = cookieStore.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      const tagRecords = [];
      for (const name of tagNames) {
        let tag = await prisma.tag.findFirst({
          where: { user_id: auth.userId, name },
        });
        if (!tag) {
          // 最も大きいsort_orderを取得
          const lastTag = await prisma.tag.findFirst({
            where: { user_id: auth.userId },
            orderBy: { sort_order: 'desc' },
          });
          const nextOrder = lastTag ? lastTag.sort_order + 1 : 0;
          
          tag = await prisma.tag.create({
            data: {
              user_id: auth.userId,
              name,
              app_type: appType,
              sort_order: nextOrder,
            },
          });
        }
        tagRecords.push(tag);
      }

      // 各投稿に対して、重複しないようにタグを紐付ける
      const tagIds = tagRecords.map(t => t.id);

      // まず、指定された投稿が現在のユーザーのものであることを確認
      const validPosts = await prisma.post.findMany({
        where: { id: { in: postIds }, user_id: auth.userId },
        select: { id: true },
      });
      const validPostIds = validPosts.map(p => p.id);

      if (validPostIds.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid posts found' }, { status: 404 });
      }

      // 既存の紐付けを取得
      const existingMappings = await prisma.postTag.findMany({
        where: {
          post_id: { in: validPostIds },
          tag_id: { in: tagIds },
        },
      });

      // 追加すべき紐付けを計算
      const newMappings = [];
      for (const postId of validPostIds) {
        for (const tagId of tagIds) {
          const exists = existingMappings.some(m => m.post_id === postId && m.tag_id === tagId);
          if (!exists) {
            newMappings.push({ post_id: postId, tag_id: tagId });
          }
        }
      }

      if (newMappings.length > 0) {
        await prisma.postTag.createMany({
          data: newMappings,
          skipDuplicates: true,
        });
      }

      return NextResponse.json({ success: true, addedCount: newMappings.length });
    } catch (e: any) {
      console.error('[POST /api/tags/bulk]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
