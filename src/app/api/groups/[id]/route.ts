import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * PUT /api/groups/[id]
 * グループ情報の編集（名前、ひとこと）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { name, description } = await request.json();

      if (!name) {
        return NextResponse.json({ success: false, error: 'グループ名は必須です' }, { status: 400 });
      }

      // グループのメンバーか確認
      const currentMember = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: auth.userId } },
      });

      if (!currentMember) {
        return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 });
      }

      const updated = await prisma.group.update({
        where: { id },
        data: { name: name.trim().slice(0, 100), description: description?.trim().slice(0, 200) || null },
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (e: any) {
      console.error('[PUT /api/groups/[id]]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

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
