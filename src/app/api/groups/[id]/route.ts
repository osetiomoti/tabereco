import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { deleteS3Objects } from '@/lib/s3';
import { toS3Key } from '@/lib/image';

/**
 * PUT /api/groups/[id]
 * グループ情報の編集（名前、ひとこと、画像）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { name, description, image_url } = await request.json();

      if (!name && image_url === undefined) {
        return NextResponse.json({ success: false, error: 'グループ名は必須です' }, { status: 400 });
      }

      // グループのメンバーか確認
      const currentMember = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: auth.userId } },
      });

      if (!currentMember) {
        return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 });
      }

      // 画像更新は管理者のみ
      if (image_url !== undefined && currentMember.role !== 'admin') {
        return NextResponse.json({ success: false, error: '画像の変更は管理者のみ可能です' }, { status: 403 });
      }

      const updateData: Record<string, any> = {};
      if (name) updateData.name = name.trim().slice(0, 100);
      if (description !== undefined) updateData.description = description?.trim().slice(0, 200) || null;
      if (image_url !== undefined) updateData.image_url = toS3Key(image_url);

      // 画像が変更された場合、旧画像を S3 から削除
      if (image_url !== undefined) {
        const oldGroup = await prisma.group.findUnique({ where: { id }, select: { image_url: true } });
        if (oldGroup?.image_url && toS3Key(oldGroup.image_url) !== updateData.image_url) {
          deleteS3Objects([oldGroup.image_url], auth.idToken).catch(console.error);
        }
      }

      const updated = await prisma.group.update({
        where: { id },
        data: updateData,
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

      // グループ画像を S3 から削除
      const groupToDelete = await prisma.group.findUnique({ where: { id }, select: { image_url: true } });
      if (groupToDelete?.image_url) {
        deleteS3Objects([groupToDelete.image_url], auth.idToken).catch(console.error);
      }

      await prisma.group.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/groups/[id]]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
