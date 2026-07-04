import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/friends/pending
 * 自分が受け取った（または送信した）承認待ちのともだちリクエストを返す
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      // 自分が受け取ったリクエスト (friend_id === auth.userId)
      const receivedRequests = await prisma.friendship.findMany({
        where: {
          friend_id: auth.userId,
          status: 'pending',
        },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      // 自分が送信したリクエスト (user_id === auth.userId)
      const sentRequests = await prisma.friendship.findMany({
        where: {
          user_id: auth.userId,
          status: 'pending',
        },
        include: {
          friend: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      const formattedReceived = receivedRequests.map((r: any) => ({
        friendship_id: r.id,
        user: r.user,
        type: 'received',
      }));

      const formattedSent = sentRequests.map((r: any) => ({
        friendship_id: r.id,
        user: r.friend,
        type: 'sent',
      }));

      return NextResponse.json({ success: true, data: [...formattedReceived, ...formattedSent] });
    } catch (e: any) {
      console.error('[GET /api/friends/pending]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
