'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // 60 秒間は同じキーを再フェッチしない（ページ遷移をまたいでキャッシュ共有）
        dedupingInterval: 60_000,
        // ウィンドウフォーカスで再フェッチしない
        revalidateOnFocus: false,
        // オフラインから復帰時のみ再フェッチ
        revalidateOnReconnect: true,
        // エラー時のリトライ回数
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
