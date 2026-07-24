'use client';

import { useEffect, useRef } from 'react';

const LS_KEY = 'tabereco_rt'; // localStorageのキー名

/**
 * Cookieからの値を読み取るヘルパー
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Cookieを削除するヘルパー
 */
function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

/**
 * SessionKeepAlive
 *
 * iOSのPWA（ホーム画面に追加）では、アプリをタスクキルするとCookieが消えることがある。
 * これを完全に防ぐため、Auth0・Firebase・AWS Amplifyと同じ方式で
 * リフレッシュトークンをlocalStorageにも保存し、アプリ起動時にCookieを復元する。
 *
 * 動作フロー:
 * 1. ログイン直後: サーバーがセットした rt_transfer Cookie からリフレッシュトークンを取得し
 *    localStorageに保存、Cookieを即削除
 * 2. アプリ起動時: Cookieが消えていたらlocalStorageのトークンでリフレッシュしCookieを復元
 * 3. 50分ごと: 定期リフレッシュ（アクセストークン60分期限の前に更新）
 * 4. アプリ復帰時: バックグラウンドから戻ったとき・ホーム画面から起動したとき即リフレッシュ
 */
export function SessionKeepAlive() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshing = useRef(false);

  /**
   * localStorageからリフレッシュトークンを使ってCookieを復元
   */
  const restoreSessionFromLocalStorage = async (): Promise<boolean> => {
    const savedToken = localStorage.getItem(LS_KEY);
    if (!savedToken) return false;

    console.log('[SessionKeepAlive] Restoring session from localStorage...');
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: savedToken }),
      });

      if (!res.ok) {
        console.warn('[SessionKeepAlive] localStorage token is expired, clearing...');
        localStorage.removeItem(LS_KEY);
        return false;
      }

      const data = await res.json();
      // サーバーが新しいリフレッシュトークンを返してきた場合はlocalStorageを更新
      if (data.refresh_token) {
        localStorage.setItem(LS_KEY, data.refresh_token);
      }

      console.log('[SessionKeepAlive] Session restored from localStorage ✅');
      return true;
    } catch (e) {
      console.warn('[SessionKeepAlive] Restore failed:', e);
      return false;
    }
  };

  /**
   * Cookieによる通常のリフレッシュ（定期実行）
   */
  const refreshSession = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });

      if (res.status === 401) {
        // Cookieが消えている → localStorageから復元を試みる
        await restoreSessionFromLocalStorage();
        return;
      }

      // 成功（httpOnly Cookieも自動更新される）
    } catch (e) {
      console.warn('[SessionKeepAlive] Refresh fetch failed:', e);
    } finally {
      isRefreshing.current = false;
    }
  };

  useEffect(() => {
    // ── Step 1: ログイン直後の rt_transfer Cookie を localStorage に移動 ──
    const transferToken = getCookie('rt_transfer');
    if (transferToken) {
      localStorage.setItem(LS_KEY, transferToken);
      deleteCookie('rt_transfer');
      console.log('[SessionKeepAlive] Refresh token saved to localStorage ✅');
    }

    // ── Step 2: 起動時にCookieの有無を確認し、なければlocalStorageから復元 ──
    const initSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.status === 401) {
          // Cookieが消えているのでlocalStorageから復元
          const restored = await restoreSessionFromLocalStorage();
          if (!restored) {
            console.log('[SessionKeepAlive] No saved session found. Redirecting to login.');
            if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/api/auth')) {
              window.location.href = '/api/auth/logout';
            }
            return;
          }
        }
        // 成功でも失敗でも localStorage がある場合は念のため更新
        if (!transferToken) {
          const data = await res.json().catch(() => null);
          if (data?.refresh_token) {
            localStorage.setItem(LS_KEY, data.refresh_token);
          }
        }
      } catch {}
    };

    // すぐに実行（SWRのフェッチより前にCookieを復元するため）
    initSession();

    // ── Step 3: 50分ごとに定期リフレッシュ ──
    timerRef.current = setInterval(refreshSession, 50 * 60 * 1000);

    // ── Step 4: アプリ復帰時にリフレッシュ（iOSのPWA対応）──
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    // iOSでホーム画面から起動したとき（bfcacheから復帰）
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
