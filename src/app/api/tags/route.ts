import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/tags
 * Fetch all tags for the current user.
 * ?scope=group → グループ全員のタグを重複排除して返す
 * ?userId=xxx  → 特定ユーザー（友達）のタグを返す
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const scope = request.nextUrl.searchParams.get('scope');

    // scope=group: 自分が属するグループの全メンバーのタグを返す
    if (scope === 'group') {
      const memberships = await prisma.groupMember.findMany({
        where: { user_id: auth.userId },
        select: { group_id: true },
      });
      const groupIds = memberships.map(m => m.group_id);

      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      if (groupIds.length === 0) {
        // グループ未参加なら自分のタグのみ
        const myTags = await prisma.tag.findMany({ where: { user_id: auth.userId, app_type: appType }, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] });
        return NextResponse.json({ success: true, data: myTags });
      }

      // グループの全メンバーを取得
      const groupMembers = await prisma.groupMember.findMany({
        where: { group_id: { in: groupIds } },
        select: { user_id: true },
      });
      const allUserIds = Array.from(new Set([auth.userId, ...groupMembers.map(m => m.user_id)]));

      // 全員のタグを取得して重複排除（名前ベース）
      const allTags = await prisma.tag.findMany({
        where: { user_id: { in: allUserIds }, app_type: appType },
        orderBy: [{ name: 'asc' }],
      });
      const seen = new Set<string>();
      const uniqueTags = allTags.filter(t => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      });

      return NextResponse.json({ success: true, data: uniqueTags });
    }

    const targetUserId = request.nextUrl.searchParams.get('userId') || auth.userId;

    // もし自分以外のタグを取得する場合、ともだちか確認する
    if (targetUserId !== auth.userId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user_id: auth.userId, friend_id: targetUserId },
            { user_id: targetUserId, friend_id: auth.userId },
          ]
        }
      });
      if (!friendship) {
        return NextResponse.json({ success: false, error: 'ともだちではありません' }, { status: 403 });
      }
    }

    const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';
    const tags = await prisma.tag.findMany({
      where: {
        user_id: targetUserId,
        app_type: appType,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: tags });
  });
}

/**
 * POST /api/tags
 * Create or update a tag.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { name } = await request.json();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      // Get next sort_order
      const lastTag = await prisma.tag.findFirst({
        where: { user_id: auth.userId, app_type: appType },
        orderBy: { sort_order: 'desc' },
      });
      const nextOrder = lastTag ? lastTag.sort_order + 1 : 0;

      const tag = await prisma.tag.upsert({
        where: {
          user_id_name_app_type: {
            user_id: auth.userId,
            name: name.trim(),
            app_type: appType,
          },
        },
        update: {},
        create: {
          user_id: auth.userId,
          name: name.trim(),
          app_type: appType,
          sort_order: nextOrder,
        },
      });

      return NextResponse.json({ success: true, data: tag });
    } catch (e: any) {
      console.error('[POST /api/tags] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
