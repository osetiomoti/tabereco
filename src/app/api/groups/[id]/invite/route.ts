import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * POST /api/groups/[id]/invite
 * グループにともだちを招待してメンバー追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { userId } = await request.json();

      // 招待者がグループメンバーか確認
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: groupId, user_id: auth.userId } },
      });
      if (!membership) {
        return NextResponse.json({ success: false, error: 'グループメンバーのみ招待できます' }, { status: 403 });
      }

      // すでにメンバーか確認
      const existing = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: groupId, user_id: userId } },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: '既にメンバーです' }, { status: 409 });
      }

      // メンバーとして追加
      const member = await prisma.groupMember.create({
        data: { group_id: groupId, user_id: userId, role: 'member' },
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
      });

      // Notify the added user
      const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
      const inviter = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      await prisma.notification.create({
        data: {
          user_id: userId,
          actor_id: auth.userId,
          type: 'group_added',
          message: `グループ「${group?.name || 'グループ'}」に追加されました`,
        }
      });
      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';
      const isTabireco = appType === 'tabireco';
      await sendPushNotification(userId, {
        title: isTabireco ? '旅レコ' : '食べレコ',
        body: `${inviter?.name || '誰か'}さんが「${group?.name || 'グループ'}」に追加しました！`,
        url: '/groups',
        tag: `group-added-${groupId}`,
        icon: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
      });

      return NextResponse.json({ success: true, data: member });
    } catch (e: any) {
      console.error('[POST /api/groups/[id]/invite]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
