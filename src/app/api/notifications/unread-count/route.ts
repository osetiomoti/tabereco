import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const count = await prisma.notification.count({
        where: { user_id: auth.userId, is_read: false },
      });

      return NextResponse.json({ success: true, count });
    } catch (e: any) {
      console.error('[GET /api/notifications/unread-count] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
