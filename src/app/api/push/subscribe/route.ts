import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/push/subscribe
 * Save or update a user's push subscription.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { endpoint, keys } = await request.json();

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json({ success: false, error: 'Invalid subscription data' }, { status: 400 });
      }

      // Upsert subscription (replace if endpoint already exists)
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          user_id: auth.userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        create: {
          user_id: auth.userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[POST /api/push/subscribe] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription (user opted out).
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { endpoint } = await request.json();

      if (!endpoint) {
        return NextResponse.json({ success: false, error: 'No endpoint' }, { status: 400 });
      }

      await prisma.pushSubscription.deleteMany({
        where: { user_id: auth.userId, endpoint },
      });

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/push/subscribe] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
