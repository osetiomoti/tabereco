import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

/**
 * POST /api/push/test
 * Send a test push notification to the current user.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      await sendPushNotification(auth.userId, {
        title: 'テスト通知 🔔',
        body: 'プッシュ通知の設定が正しく完了しています！',
        url: '/settings',
        tag: 'test-notification',
      });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[POST /api/push/test] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
