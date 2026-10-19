'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotificationPermission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setIsLoading(true);
    try {
      // 1. SWの登録を確実に取得する（未登録なら即座に登録する）
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        console.log('[usePushNotifications] Registering SW on demand...');
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      // 2. SWが installing / waiting の場合は activated になるまで待つ
      //    （アプリを開き直さなくてもその場でアクティブ化できる）
      if (registration.installing || registration.waiting) {
        const sw = registration.installing ?? registration.waiting!;
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('SW activation timeout')), 10000);
          sw.addEventListener('statechange', function onStateChange() {
            if (sw.state === 'activated') {
              clearTimeout(timer);
              sw.removeEventListener('statechange', onStateChange);
              resolve();
            } else if (sw.state === 'redundant') {
              clearTimeout(timer);
              sw.removeEventListener('statechange', onStateChange);
              reject(new Error('SW became redundant'));
            }
          });
        });
        // activate 後に最新の registration を取得し直す
        registration = (await navigator.serviceWorker.getRegistration('/'))!;
      }

      // 3. 念のため ready で最終確認（すでに active なのでほぼ即時解決する）
      const finalReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SW ready timeout')), 5000)
        ),
      ]).catch(() => registration!);

      // 4. 通知許可を要求
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);
      if (perm !== 'granted') {
        return;
      }

      // 5. Push 購読を作成
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await finalReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as any,
      });

      // 6. Get appType from data-app-type attribute (added in layout) or default to tabereco
      const appType = document.documentElement.getAttribute('data-app-type') || 'tabereco';

      // 7. サーバーへ購読情報を送信して保存
      const subJson = subscription.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          app_type: appType,
        }),
      });

      setIsSubscribed(true);
    } catch (e) {
      console.error('[usePushNotifications] subscribe error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('[usePushNotifications] unsubscribe error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
