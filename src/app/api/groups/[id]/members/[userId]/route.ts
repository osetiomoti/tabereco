import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * DELETE /api/groups/[id]/members/[userId]
 * グループからメンバーを削除（管理者のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: groupId, userId: targetUserId } = await params;
  
  return withAuth(request, async (auth) => {
    try {
      // 現在のユーザーが管理者か確認
      const currentMember = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: groupId, user_id: auth.userId } },
      });

      if (!currentMember || currentMember.role !== 'admin') {
        return NextResponse.json({ success: false, error: '削除権限がありません' }, { status: 403 });
      }

      // 自分自身（管理者）は削除できないようにする（グループ削除機能を使用してもらう）
      if (targetUserId === auth.userId) {
        return NextResponse.json({ success: false, error: '管理者自身は削除できません。グループを削除してください。' }, { status: 400 });
      }

      // メンバー削除
      await prisma.groupMember.delete({
        where: { group_id_user_id: { group_id: groupId, user_id: targetUserId } },
      });

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/groups/[id]/members/[userId]]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
