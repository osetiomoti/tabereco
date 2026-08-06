import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Initialize VAPID details
if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_CONTACT_EMAIL
) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys are missing. Web Push notifications will not work.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all subscriptions of a given user.
 * Silently removes invalid/expired subscriptions.
 */
export async function sendPushNotification(userId: string, payload: PushNotificationPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: userId },
    });

    if (subscriptions.length === 0) return;

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          );
        } catch (err: any) {
          // If the subscription is gone (410 Gone), remove it from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.deleteMany({
              where: { endpoint: sub.endpoint },
            });
          }
        }
      })
    );

    return results;
  } catch (e) {
    console.error('[webpush] sendPushNotification error:', e);
  }
}
