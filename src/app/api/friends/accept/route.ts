import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * PUT /api/friends/accept
 * リクエストを承認する
 * body: { friendshipId }
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { friendshipId } = await request.json();

      if (!friendshipId) {
        return NextResponse.json({ success: false, error: 'friendshipId is required' }, { status: 400 });
      }

      // 自分が受け取ったリクエストか確認
      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship || friendship.friend_id !== auth.userId) {
        return NextResponse.json({ success: false, error: '無効なリクエストです' }, { status: 403 });
      }

      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'accepted' },
      });

      // Notify the original requester that their request was accepted
      const accepter = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      await prisma.notification.create({
        data: {
          user_id: friendship.user_id,
          actor_id: auth.userId,
          type: 'friend_accepted',
          message: 'ともだちリクエストが承認されました',
        }
      });
      await sendPushNotification(friendship.user_id, {
        title: '食べレコ',
        body: `${accepter?.name || '誰か'}さんがともだちリクエストを承認しました！`,
        url: '/groups',
        tag: `friend-accepted-${auth.userId}`,
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (e: any) {
      console.error('[PUT /api/friends/accept]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
