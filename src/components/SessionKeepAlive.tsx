'use client';

import { useEffect, useRef } from 'react';

/**
 * SessionKeepAlive
 * iOSのPWAではアプリを終了するとCookieが消えてしまう問題を回避するため、
 * 定期的にサーバーへトークンのリフレッシュをリクエストし、
 * セッションを維持し続けるコンポーネント。
 *
 * アクセストークンの有効期限(60分)より短い間隔(50分)で実行することで、
 * 期限切れ前に確実に更新する。
 * また、ページがフォーカスを取り戻したとき（iPhoneでアプリを再開したとき）にも実行する。
 */
export function SessionKeepAlive() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        console.warn('[SessionKeepAlive] Refresh returned non-OK status:', res.status);
      }
    } catch (e) {
      // ネットワークエラーなどは無視（次回タイマーで再試行）
      console.warn('[SessionKeepAlive] Refresh fetch failed:', e);
    }
  };

  useEffect(() => {
    // 初回: 10秒後に一度実行（ページロード直後のリフレッシュ）
    const initialTimer = setTimeout(refresh, 10_000);

    // 50分ごとに定期実行（アクセストークンの有効期限60分より前に更新）
    timerRef.current = setInterval(refresh, 50 * 60 * 1000);

    // ページがバックグラウンドから復帰したとき（iPhoneでアプリを再開したとき）に実行
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    // iOSのPWAではpageshowイベントでも実行（ホーム画面から復帰時）
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // このコンポーネントは何も表示しない
  return null;
}
