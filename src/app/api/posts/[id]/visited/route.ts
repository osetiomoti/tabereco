import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * POST /api/posts/[id]/visited
 * Toggle "visited" on another user's post, or update rating.
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

      const existing = await prisma.postVisited.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
      });

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

      if (rating !== undefined) {
        // Update or Create with specific rating
        const updated = await prisma.postVisited.upsert({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
          update: { rating: rating },
          create: { post_id: postId, user_id: auth.userId, rating: rating },
        });
        return NextResponse.json({ success: true, marked: true, data: updated });
      }

      // No rating provided -> Toggle behavior
      if (existing) {
        await prisma.postVisited.delete({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
        });
        return NextResponse.json({ success: true, marked: false });
      } else {
        await prisma.postVisited.create({
          data: { post_id: postId, user_id: auth.userId },
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
          // Send Web Push
          await sendPushNotification(post.user_id, {
            title: '食べレコ',
            body: `${actor?.name || '誰か'}さんが「${post.title}」を行ったに追加しました`,
            url: `/posts/${postId}`,
            tag: `visited-${postId}`,
          });
        }

        return NextResponse.json({ success: true, marked: true });
      }
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/visited] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
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
          users: visiteds.map((w) => ({ ...w.user, rating: w.rating, visit_count: w.visit_count })),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
