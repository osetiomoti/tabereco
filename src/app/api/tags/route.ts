import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/tags
 * Fetch all tags for the current user.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
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

    const tags = await prisma.tag.findMany({
      where: {
        user_id: targetUserId,
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

      // Get next sort_order
      const lastTag = await prisma.tag.findFirst({
        where: { user_id: auth.userId },
        orderBy: { sort_order: 'desc' },
      });
      const nextOrder = lastTag ? lastTag.sort_order + 1 : 0;

      const tag = await prisma.tag.upsert({
        where: {
          user_id_name: {
            user_id: auth.userId,
            name: name.trim(),
          },
        },
        update: {},
        create: {
          user_id: auth.userId,
          name: name.trim(),
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
