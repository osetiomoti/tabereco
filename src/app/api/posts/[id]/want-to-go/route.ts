import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * POST /api/posts/[id]/want-to-go
 * Toggle "want to go" on another user's post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const existing = await prisma.postWantToGo.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
      });

      if (existing) {
        await prisma.postWantToGo.delete({
          where: { post_id_user_id: { post_id: postId, user_id: auth.userId } },
        });
        return NextResponse.json({ success: true, marked: false });
      } else {
        await prisma.postWantToGo.create({
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
              type: 'want_to_go',
              post_id: postId,
              message: 'あなたの投稿を行きたいに追加しました',
            }
          });
          // Send Web Push
          await sendPushNotification(post.user_id, {
            title: '食べレコ',
            body: `${actor?.name || '誰か'}さんが「${post.title}」を行きたいに追加しました`,
            url: `/posts/${postId}`,
            tag: `want-to-go-${postId}`,
          });
        }

        return NextResponse.json({ success: true, marked: true });
      }
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/want-to-go] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * GET /api/posts/[id]/want-to-go
 * Get want-to-go count and list for a post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const wantToGos = await prisma.postWantToGo.findMany({
        where: { post_id: postId },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      const isMarked = wantToGos.some((w) => w.user_id === auth.userId);

      return NextResponse.json({
        success: true,
        data: {
          count: wantToGos.length,
          isMarked,
          users: wantToGos.map((w) => w.user),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
