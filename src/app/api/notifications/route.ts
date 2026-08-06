import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/notifications
 * Fetch user's notifications.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { user_id: auth.userId },
        include: {
          actor: {
            select: { name: true, avatar_url: true }
          },
          post: {
            select: { title: true, store_name: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 30, // Limit to 30 latest
      });

      return NextResponse.json({ success: true, data: notifications });
    } catch (e: any) {
      console.error('[GET /api/notifications] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read.
 */
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      await prisma.notification.updateMany({
        where: { user_id: auth.userId, is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[PATCH /api/notifications] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
