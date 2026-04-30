import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * DELETE /api/friends/[id]
 * ともだちを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      // 自分が関わっているフレンドシップのみ削除可能
      const friendship = await prisma.friendship.findFirst({
        where: {
          id,
          OR: [
            { user_id: auth.userId },
            { friend_id: auth.userId },
          ],
        },
      });

      if (!friendship) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }

      await prisma.friendship.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/friends/[id]]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
