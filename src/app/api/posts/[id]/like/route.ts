import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * GET /api/posts/[id]/like
 * Get like count and whether current user liked this post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const likes = await prisma.postLike.findMany({
        where: { post_id: id },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      });
      const isLiked = likes.some((l) => l.user_id === auth.userId);
      return NextResponse.json({
        success: true,
        data: {
          count: likes.length,
          isLiked,
          users: likes.map((l) => l.user),
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * POST /api/posts/[id]/like
 * Toggle like for a post (for other user's posts)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // 他人の投稿へのいいねかどうかのバリデーションは特にしない（UI側で制限するがAPIでは許可してもOK）

    const existingLike = await prisma.postLike.findUnique({
      where: {
        post_id_user_id: {
          post_id: id,
          user_id: auth.userId,
        },
      },
    });

    if (existingLike) {
      // 既にいいねしている場合は削除 (Toggle OFF)
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // いいね作成 (Toggle ON)
      await prisma.postLike.create({
        data: {
          post_id: id,
          user_id: auth.userId,
        },
      });

      // Notify post owner
      if (post && post.user_id !== auth.userId) {
        const actor = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
        await prisma.notification.create({
          data: {
            user_id: post.user_id,
            actor_id: auth.userId,
            type: 'like',
            post_id: id,
            message: 'あなたの投稿にいいねしました',
          }
        });
        // Send Web Push
        const isTabireco = post.app_type === 'tabireco';
        await sendPushNotification(post.user_id, {
          title: isTabireco ? '旅レコ' : '食べレコ',
          body: `${actor?.name || '誰か'}さんがあなたの投稿にいいねしました`,
          url: `/posts/${id}`,
          tag: `like-${id}`,
          icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
        }, post.app_type as 'tabereco' | 'tabireco');
      }

      return NextResponse.json({ success: true, action: 'added' });
    }
  });
}
