import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

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

      return NextResponse.json({ success: true, data: updated });
    } catch (e: any) {
      console.error('[PUT /api/friends/accept]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
