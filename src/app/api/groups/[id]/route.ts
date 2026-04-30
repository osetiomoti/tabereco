import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * DELETE /api/groups/[id]
 * グループ自体を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      // 管理者か確認
      const currentMember = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: auth.userId } },
      });

      if (!currentMember || currentMember.role !== 'admin') {
        return NextResponse.json({ success: false, error: '削除権限がありません' }, { status: 403 });
      }

      await prisma.group.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/groups/[id]]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
