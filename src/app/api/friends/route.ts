import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * GET /api/friends
 * 自分のともだち一覧を返す
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { user_id: auth.userId },
            { friend_id: auth.userId },
          ],
          status: 'accepted',
        },
        include: {
          user: { select: { id: true, name: true, avatar_url: true, email: true } },
          friend: { select: { id: true, name: true, avatar_url: true, email: true } },
        },
      });

      const friends = friendships.map((f: any) => {
        const other = f.user_id === auth.userId ? f.friend : f.user;
        return { ...other, friendship_id: f.id };
      });

      return NextResponse.json({ success: true, data: friends });
    } catch (e: any) {
      console.error('[GET /api/friends]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * POST /api/friends
 * ともだち追加（body: { friendUserId }）
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { friendUserId } = await request.json();

      if (!friendUserId || friendUserId === auth.userId) {
        return NextResponse.json({ success: false, error: '無効なユーザーIDです' }, { status: 400 });
      }

      // ユーザー存在確認
      const targetUser = await prisma.user.findUnique({ where: { id: friendUserId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'ユーザーが見つかりませんでした' }, { status: 404 });
      }

      // 既存チェック（どちらの方向も）
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user_id: auth.userId, friend_id: friendUserId },
            { user_id: friendUserId, friend_id: auth.userId },
          ],
        },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: '既にともだちです' }, { status: 409 });
      }

      const friendship = await prisma.friendship.create({
        data: { user_id: auth.userId, friend_id: friendUserId, status: 'pending' },
        include: {
          friend: { select: { id: true, name: true, avatar_url: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Notify the target user about the friend request
      const actor = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      await prisma.notification.create({
        data: {
          user_id: friendUserId,
          actor_id: auth.userId,
          type: 'friend_request',
          message: 'あなたにともだちリクエストを送りました',
        }
      });
      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';
      const isTabireco = appType === 'tabireco';
      await sendPushNotification(friendUserId, {
        title: isTabireco ? '旅レコ' : '食べレコ',
        body: `${actor?.name || '誰か'}さんからともだちリクエストが届きました！`,
        url: '/groups?tab=pending',
        tag: `friend-request-${auth.userId}`,
        icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
      });

      return NextResponse.json({ success: true, data: friendship });
    } catch (e: any) {
      console.error('[POST /api/friends]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
