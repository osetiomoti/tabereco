import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export type StorePhotoItem = {
  id: string;
  url: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  comment: string | null;
  visited_at: string | null;
  created_at: string;
  postId: string;
  visitedId?: string;
  sourceType: 'post' | 'visited';
  isMe: boolean;
};

/**
 * GET /api/posts/[id]/store-photos
 * 開いている投稿と同じ店舗に属する、閲覧権限のあるユーザー（自分・フレンド・同じグループのメンバー）の
 * 写真一覧（PostおよびPostVisited）を取得する。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  return withAuth(request, async (auth) => {
    try {
      // 1. 対象の投稿を取得
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      if (!currentPost) {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
      }

      // 2. 同一店舗の投稿を検索（storeUtils.ts の getStoreKey 仕様に準拠）
      let sameStorePosts: any[] = [];
      if (currentPost.google_place_id?.trim()) {
        sameStorePosts = await prisma.post.findMany({
          where: {
            google_place_id: currentPost.google_place_id.trim(),
            app_type: currentPost.app_type,
          },
          include: {
            user: { select: { id: true, name: true, avatar_url: true } },
          },
          orderBy: { visited_at: 'desc' },
        });
      } else if (currentPost.store_name?.trim() && currentPost.address?.trim()) {
        sameStorePosts = await prisma.post.findMany({
          where: {
            store_name: currentPost.store_name.trim(),
            address: currentPost.address.trim(),
            app_type: currentPost.app_type,
          },
          include: {
            user: { select: { id: true, name: true, avatar_url: true } },
          },
          orderBy: { visited_at: 'desc' },
        });
      } else {
        sameStorePosts = [currentPost];
      }

      const postIds = sameStorePosts.map((p) => p.id);

      // 3. 身内（フレンド・共通グループ）判定用データの取得
      // A. フレンド判定
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'accepted',
          OR: [
            { user_id: auth.userId },
            { friend_id: auth.userId },
          ],
        },
      });
      const friendIds = new Set(
        friendships.map((f) => (f.user_id === auth.userId ? f.friend_id : f.user_id))
      );

      // B. 共通グループ判定
      const myGroupMembers = await prisma.groupMember.findMany({
        where: { user_id: auth.userId },
        select: { group_id: true },
      });
      const myGroupIds = myGroupMembers.map((g) => g.group_id);

      let groupMemberIds = new Set<string>();
      if (myGroupIds.length > 0) {
        const sharedMembers = await prisma.groupMember.findMany({
          where: { group_id: { in: myGroupIds } },
          select: { user_id: true },
        });
        groupMemberIds = new Set(sharedMembers.map((m) => m.user_id));
      }

      // 閲覧許可関数（自分自身・フレンド・同じグループのメンバー）
      const isAllowedUser = (userId: string) => {
        return userId === auth.userId || friendIds.has(userId) || groupMemberIds.has(userId);
      };

      // 4. 同一店舗の全 PostVisited レコードを取得
      const visiteds = await prisma.postVisited.findMany({
        where: { post_id: { in: postIds } },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      // 5. 記録の収集
      type RawRecord = {
        recordDate: Date;
        sourceType: 'post' | 'visited';
        author: { id: string; name: string; avatar_url: string | null };
        comment: string | null;
        visited_at: Date | null;
        created_at: Date;
        postId: string;
        visitedId?: string;
        isMe: boolean;
        images: string[];
      };

      const records: RawRecord[] = [];

      // A. Post レコード
      for (const p of sameStorePosts) {
        if (!p.user) continue;
        // 権限チェック: フレンドでも同グループでもないユーザーは除外
        if (!isAllowedUser(p.user_id)) continue;
        // 非公開投稿（is_mine_only）は本人のみ閲覧可
        if (p.is_mine_only && p.user_id !== auth.userId) continue;

        const images = p.image_urls && p.image_urls.length > 0
          ? p.image_urls
          : (p.image_url ? [p.image_url] : []);
        const validImages = images.filter((img: string) => img && typeof img === 'string' && img.trim().length > 0);
        if (validImages.length === 0) continue;

        const recordDate = p.visited_at ? new Date(p.visited_at) : new Date(p.created_at);

        records.push({
          recordDate,
          sourceType: 'post',
          author: {
            id: p.user.id,
            name: p.user.name,
            avatar_url: p.user.avatar_url,
          },
          comment: p.comment || null,
          visited_at: p.visited_at,
          created_at: p.created_at,
          postId: p.id,
          isMe: p.user_id === auth.userId,
          images: validImages,
        });
      }

      // B. PostVisited レコード
      for (const v of visiteds) {
        if (!v.user) continue;
        // 権限チェック: フレンドでも同グループでもないユーザーは除外
        if (!isAllowedUser(v.user_id)) continue;

        const images = v.image_urls && v.image_urls.length > 0
          ? v.image_urls
          : (v.image_url ? [v.image_url] : []);
        const validImages = images.filter((img: string) => img && typeof img === 'string' && img.trim().length > 0);
        if (validImages.length === 0) continue;

        const recordDate = v.visited_at ? new Date(v.visited_at) : new Date(v.created_at);

        records.push({
          recordDate,
          sourceType: 'visited',
          author: {
            id: v.user.id,
            name: v.user.name,
            avatar_url: v.user.avatar_url,
          },
          comment: v.comment || null,
          visited_at: v.visited_at,
          created_at: v.created_at,
          postId: v.post_id,
          visitedId: v.id,
          isMe: v.user_id === auth.userId,
          images: validImages,
        });
      }

      // 6. 記録を新しい順（訪問日または作成日降順）にソート
      records.sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());

      // 7. 各記録内の写真順序を維持しつつ展開し、画像URL単位で重複排除
      const seenUrls = new Set<string>();
      const photos: StorePhotoItem[] = [];

      for (const rec of records) {
        for (let i = 0; i < rec.images.length; i++) {
          const rawUrl = rec.images[i].trim();
          if (!rawUrl || seenUrls.has(rawUrl)) continue;
          seenUrls.add(rawUrl);

          photos.push({
            id: `${rec.sourceType}_${rec.visitedId || rec.postId}_${i}`,
            url: rawUrl,
            author: rec.author,
            comment: rec.comment,
            visited_at: rec.visited_at ? rec.visited_at.toISOString() : null,
            created_at: rec.created_at.toISOString(),
            postId: rec.postId,
            visitedId: rec.visitedId,
            sourceType: rec.sourceType,
            isMe: rec.isMe,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          photos,
          totalCount: photos.length,
        },
      });
    } catch (e: any) {
      console.error('[GET /api/posts/[id]/store-photos] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
