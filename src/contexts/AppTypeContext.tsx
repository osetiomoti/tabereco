'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mutate } from 'swr';

export type AppType = 'tabereco' | 'tabireco';

interface AppTypeContextValue {
  appType: AppType;
  setAppType: (type: AppType) => void;
}

const AppTypeContext = createContext<AppTypeContextValue>({
  appType: 'tabereco',
  setAppType: () => {},
});

/** Cookie から app_type を読み取る（クライアントサイドのみ） */
function readAppTypeCookie(): AppType {
  if (typeof document === 'undefined') return 'tabereco';
  const match = document.cookie.match(/(?:^|;\s*)app_type=([^;]+)/);
  const val = match?.[1];
  return val === 'tabireco' ? 'tabireco' : 'tabereco';
}

/** Cookie に app_type を書き込む */
function writeAppTypeCookie(type: AppType) {
  const maxAge = 365 * 24 * 60 * 60; // 1年
  document.cookie = `app_type=${type}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function AppTypeProvider({ children, initialAppType = 'tabereco' }: { children: React.ReactNode, initialAppType?: AppType }) {
  const [appType, setAppTypeState] = useState<AppType>(initialAppType);

  // クライアントマウント後、Cookieを正として同期
  useEffect(() => {
    const stored = readAppTypeCookie();
    if (stored !== initialAppType) {
      setAppTypeState(stored);
      document.documentElement.setAttribute('data-app-type', stored);
    }
  }, [initialAppType]);

  const setAppType = useCallback((type: AppType) => {
    setAppTypeState(type);
    writeAppTypeCookie(type);

    // HTML 属性を更新してテーマ CSS 変数を即時切り替え
    document.documentElement.setAttribute('data-app-type', type);

    // SWR キャッシュを全クリアして新しい app_type で再フェッチ
    mutate(() => true, undefined, { revalidate: true }).then(() => {
      // 完全に画面をリロードして古いデータを残さないようにする
      window.location.reload();
    });
  }, []);

  return (
    <AppTypeContext.Provider value={{ appType, setAppType }}>
      {children}
    </AppTypeContext.Provider>
  );
}

export function useAppType() {
  return useContext(AppTypeContext);
}
