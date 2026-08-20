'use client';

import { useEffect, useRef } from 'react';

const SCROLL_DEBOUNCE_MS = 200;
// どれだけ待ってから復元を試みるか（データ取得・レイアウト安定化のため）
const RESTORE_DELAY_MS = 80;

export function useScrollRestore(key: string) {
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  const hasScrolledRef = useRef(false);

  // Load and apply saved scroll position on mount (once only)
  useEffect(() => {
    hasRestoredRef.current = false;
    hasScrolledRef.current = false;

    const savedPos = sessionStorage.getItem(`scroll_${key}`);
    if (!savedPos || parseInt(savedPos, 10) === 0) return;

    const target = parseInt(savedPos, 10);

    const tryRestore = () => {
      // ユーザーがすでにスクロールしていたら復元しない
      if (hasScrolledRef.current) return;
      if (hasRestoredRef.current) return;

      // ページの高さがターゲット位置に届いていない場合はまだ待つ
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll < target - 50) {
        // コンテンツがまだ描画されていないので少し待つ
        restoreTimer = setTimeout(tryRestore, 100);
        return;
      }

      hasRestoredRef.current = true;
      window.scrollTo({ top: target, behavior: 'instant' });
    };

    let restoreTimer = setTimeout(tryRestore, RESTORE_DELAY_MS);

    return () => {
      clearTimeout(restoreTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Save scroll position when it changes
  useEffect(() => {
    const handleScroll = () => {
      // ユーザーが自分でスクロールしたことを記録
      hasScrolledRef.current = true;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        sessionStorage.setItem(`scroll_${key}`, window.scrollY.toString());
      }, SCROLL_DEBOUNCE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [key]);
}
