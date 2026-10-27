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
 * Get visited count, list, and ratings for a post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const visiteds = await prisma.postVisited.findMany({
        where: { post_id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      const myRecord = visiteds.find((w) => w.user_id === auth.userId);

      return NextResponse.json({
        success: true,
        data: {
          count: visiteds.length,
          isMarked: !!myRecord,
          myRating: myRecord?.rating ?? null,
          myVisitCount: myRecord?.visit_count ?? 1,
          myComment: myRecord?.comment ?? null,
          myImageUrl: myRecord?.image_url ?? null,
          myImageUrls: myRecord?.image_urls ?? [],
          myVisitedAt: myRecord?.visited_at ?? null,
          users: visiteds.map((w) => ({
            ...w.user,
            rating: w.rating,
            visit_count: w.visit_count,
            comment: w.comment,
            image_url: w.image_url,
            image_urls: w.image_urls,
            visited_at: w.visited_at,
          })),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
