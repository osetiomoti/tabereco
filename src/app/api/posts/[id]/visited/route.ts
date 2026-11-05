import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * POST /api/posts/[id]/visited
 * Toggle "visited" on another user's post, or update rating/comment/images/visit date.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json().catch(() => ({}));
      const rating = body.rating !== undefined ? body.rating : undefined;
      const action = body.action; // 'increment' | 'decrement' | undefined
      const comment = body.comment !== undefined ? body.comment : undefined;
      const imageUrl = body.image_url !== undefined ? body.image_url : undefined;
      const imageUrls = body.image_urls !== undefined ? body.image_urls : undefined;
      const visitedAt = body.visited_at !== undefined ? (body.visited_at ? new Date(body.visited_at) : null) : undefined;
      const visitCount = body.visit_count !== undefined ? Number(body.visit_count) : undefined;

      const existing = await prisma.postVisited.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
      });

      // 1. Visit count increment/decrement
      if (action === 'increment' || action === 'decrement') {
        if (!existing) return NextResponse.json({ success: false, error: 'Not visited yet' }, { status: 400 });
        
        let newCount = existing.visit_count;
        if (action === 'increment') newCount++;
        if (action === 'decrement' && newCount > 1) newCount--;
        
        const updated = await prisma.postVisited.update({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
          data: { visit_count: newCount },
        });
        return NextResponse.json({ success: true, marked: true, data: updated });
      }

      // 2. Specific data update (rating, comment, image_url, image_urls, visited_at, visit_count)
      const hasDetailedData = 
        rating !== undefined || 
        comment !== undefined || 
        imageUrl !== undefined || 
        imageUrls !== undefined || 
        visitedAt !== undefined ||
        visitCount !== undefined;

      if (hasDetailedData) {
        const updateData: any = {};
        if (rating !== undefined) updateData.rating = rating;
        if (comment !== undefined) updateData.comment = comment;
        if (imageUrl !== undefined) updateData.image_url = imageUrl;
        if (imageUrls !== undefined) updateData.image_urls = imageUrls;
        if (visitedAt !== undefined) updateData.visited_at = visitedAt;
        if (visitCount !== undefined) updateData.visit_count = visitCount;

        const createData: any = {
          post_id: postId,
          user_id: auth.userId,
          rating: rating ?? null,
          comment: comment ?? null,
          image_url: imageUrl ?? null,
          image_urls: imageUrls ?? [],
          visited_at: visitedAt ?? null,
          visit_count: visitCount ?? 1,
        };

        const updated = await prisma.postVisited.upsert({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
          update: updateData,
          create: createData,
        });

        // 互いに排他にする: 行ったを追加・更新した場合は行きたいを削除
        await prisma.postWantToGo.deleteMany({
          where: { post_id: postId, user_id: auth.userId }
        });

        // Notify post owner about update (if not owner)
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (post && post.user_id !== auth.userId) {
          const actor = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
          const isTabireco = post.app_type === 'tabireco';
          
          if (rating !== undefined && !existing) {
            await prisma.notification.create({
              data: {
                user_id: post.user_id,
                actor_id: auth.userId,
                type: 'rating',
                post_id: postId,
                message: `あなたの投稿に★${rating}の評価をつけました`,
              }
            });
            await sendPushNotification(post.user_id, {
              title: isTabireco ? '旅レコ' : '食べレコ',
              body: `${actor?.name || '誰か'}さんが「${post.title}」に★${rating}をつけました`,
              url: `/posts/${postId}`,
              tag: `rating-${postId}`,
              icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
            }, post.app_type as 'tabereco' | 'tabireco');
          } else if (!existing) {
            await prisma.notification.create({
              data: {
                user_id: post.user_id,
                actor_id: auth.userId,
                type: 'visited',
                post_id: postId,
                message: 'あなたの投稿を行ったに追加しました',
              }
            });
            await sendPushNotification(post.user_id, {
              title: isTabireco ? '旅レコ' : '食べレコ',
              body: `${actor?.name || '誰か'}さんが「${post.title}」を行ったに追加しました`,
              url: `/posts/${postId}`,
              tag: `visited-${postId}`,
              icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
            }, post.app_type as 'tabereco' | 'tabireco');
          }
        }

        return NextResponse.json({ success: true, marked: true, data: updated });
      }

      // 3. No detailed data provided -> Simple Toggle behavior
      if (existing) {
        await prisma.postVisited.delete({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
        });
        return NextResponse.json({ success: true, marked: false });
      } else {
        const created = await prisma.postVisited.create({
          data: { post_id: postId, user_id: auth.userId },
        });

        // 互いに排他にする: 行ったを追加した場合は行きたいを削除
        await prisma.postWantToGo.deleteMany({
          where: { post_id: postId, user_id: auth.userId }
        });

        // Notify post owner
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (post && post.user_id !== auth.userId) {
          const actor = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
          await prisma.notification.create({
            data: {
              user_id: post.user_id,
              actor_id: auth.userId,
              type: 'visited',
              post_id: postId,
              message: 'あなたの投稿を行ったに追加しました',
            }
          });
          const isTabireco = post.app_type === 'tabireco';
          await sendPushNotification(post.user_id, {
            title: isTabireco ? '旅レコ' : '食べレコ',
            body: `${actor?.name || '誰か'}さんが「${post.title}」を行ったに追加しました`,
            url: `/posts/${postId}`,
            tag: `visited-${postId}`,
            icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
          }, post.app_type as 'tabereco' | 'tabireco');
        }

        return NextResponse.json({ success: true, marked: true, data: created });
      }
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/visited] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PUT /api/posts/[id]/visited
 * Explicit update endpoint for visited data.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}

/**
 * GET /api/posts/[id]/visited
 * Get visited count, list, and ratings for a post, aggregated by store.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      if (!currentPost) {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
      }

      // 1. 同一店舗の投稿を検索（google_place_id優先、なければ store_name + address）
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
        });
      } else {
        sameStorePosts = [currentPost];
      }

      const postIds = sameStorePosts.map((p) => p.id);

      // 2. 該当店舗に紐づくすべての PostVisited レコードを取得
      const visiteds = await prisma.postVisited.findMany({
        where: { post_id: { in: postIds } },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      // 3. 身内（フレンド・共通グループ）判定用データを一括取得
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

      // 4. 訪問者をユーザー単位でマージ（ユニーク化）
      const visitorMap = new Map<string, any>();

      // A. 元投稿の投稿者（status === 'visited' の場合）
      for (const p of sameStorePosts) {
        if (p.status === 'visited' && p.user) {
          const isMe = p.user_id === auth.userId;
          const isInsider = isMe || friendIds.has(p.user_id) || groupMemberIds.has(p.user_id);
          const isRestricted = !isInsider && (p.is_mine_only || false);
          const images = p.image_urls && p.image_urls.length > 0 ? p.image_urls : (p.image_url ? [p.image_url] : []);

          visitorMap.set(p.user_id, {
            id: p.user.id,
            name: p.user.name,
            avatar_url: p.user.avatar_url,
            rating: p.rating,
            comment: isRestricted ? null : p.comment,
            image_url: isRestricted ? null : (images[0] || null),
            image_urls: isRestricted ? [] : images,
            visited_at: p.visited_at,
            visit_count: p.visit_count || 1,
            isAuthor: true,
            postId: p.id,
            isMe,
            is_restricted: isRestricted,
          });
        }
      }

      // B. PostVisited 登録ユーザー
      for (const v of visiteds) {
        if (!v.user) continue;
        const isMe = v.user_id === auth.userId;
        const isInsider = isMe || friendIds.has(v.user_id) || groupMemberIds.has(v.user_id);
        const isRestricted = !isInsider;
        const images = v.image_urls && v.image_urls.length > 0 ? v.image_urls : (v.image_url ? [v.image_url] : []);

        const existing = visitorMap.get(v.user_id);
        if (!existing || (!existing.comment && v.comment) || (existing.image_urls.length === 0 && images.length > 0)) {
          visitorMap.set(v.user_id, {
            id: v.user.id,
            name: v.user.name,
            avatar_url: v.user.avatar_url,
            rating: v.rating ?? existing?.rating ?? null,
            comment: isRestricted ? null : (v.comment || existing?.comment || null),
            image_url: isRestricted ? null : (images[0] || existing?.image_url || null),
            image_urls: isRestricted ? [] : (images.length > 0 ? images : (existing?.image_urls || [])),
            visited_at: v.visited_at || existing?.visited_at || null,
            visit_count: v.visit_count || existing?.visit_count || 1,
            isAuthor: existing?.isAuthor || false,
            postId: v.post_id,
            visitedId: v.id,
            isMe,
            is_restricted: isRestricted,
          });
        }
      }

      const visitorsList = Array.from(visitorMap.values()).sort((a, b) => {
        // isMe（自分）を最優先、次に isAuthor（投稿者）、残りはそのまま
        if (a.isMe && !b.isMe) return -1;
        if (!a.isMe && b.isMe) return 1;
        if (a.isAuthor && !b.isAuthor) return -1;
        if (!a.isAuthor && b.isAuthor) return 1;
        return 0;
      });

      // 5. ログインユーザー自身の記録判定
      const mySpecificVisited = visiteds.find((w) => w.user_id === auth.userId && w.post_id === postId);
      const myAnyStoreRecord = visitorMap.get(auth.userId);

      return NextResponse.json({
        success: true,
        data: {
          count: visitorsList.length,
          isMarked: !!mySpecificVisited || (currentPost.user_id === auth.userId && currentPost.status === 'visited') || !!myAnyStoreRecord,
          myRating: mySpecificVisited?.rating ?? myAnyStoreRecord?.rating ?? null,
          myVisitCount: mySpecificVisited?.visit_count ?? myAnyStoreRecord?.visit_count ?? 1,
          myComment: mySpecificVisited?.comment ?? myAnyStoreRecord?.comment ?? null,
          myImageUrl: mySpecificVisited?.image_url ?? myAnyStoreRecord?.image_url ?? null,
          myImageUrls: mySpecificVisited?.image_urls ?? myAnyStoreRecord?.image_urls ?? [],
          myVisitedAt: mySpecificVisited?.visited_at ?? myAnyStoreRecord?.visited_at ?? null,
          users: visitorsList,
        },
      });
    } catch (e: any) {
      console.error('[GET /api/posts/[id]/visited] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
