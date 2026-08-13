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

export function AppTypeProvider({ children }: { children: React.ReactNode }) {
  const [appType, setAppTypeState] = useState<AppType>('tabereco');

  // クライアントマウント後に Cookie を読み取る
  useEffect(() => {
    const stored = readAppTypeCookie();
    setAppTypeState(stored);
    // HTML属性をすぐ反映
    document.documentElement.setAttribute('data-app-type', stored);
  }, []);

  const setAppType = useCallback((type: AppType) => {
    setAppTypeState(type);
    writeAppTypeCookie(type);

    // HTML 属性を更新してテーマ CSS 変数を即時切り替え
    document.documentElement.setAttribute('data-app-type', type);

    // SWR キャッシュを全クリアして新しい app_type で再フェッチ
    mutate(() => true, undefined, { revalidate: true });
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
