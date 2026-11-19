'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Clock, User, Trophy, Search, Home } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         icon: Home,   label: 'ホーム',       match: (p: string) => p === '/'               },
  { href: '/posts',    icon: Clock,  label: 'タイムライン',  match: (p: string) => p === '/posts'          },
  { href: '/mypage',   icon: User,   label: 'マイページ',    match: (p: string) => p.startsWith('/mypage') },
  { href: '/map',      icon: Search, label: '検索',          match: (p: string) => p === '/map'            },
  { href: '/rankings', icon: Trophy, label: 'ランキング',    match: (p: string) => p.startsWith('/rankings') },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  // 初回レンダー時はアニメーションを無効化（初期位置へのflash防止）
  const isFirstRender = useRef(true);

  // 実際のURLから計算したインデックス
  const pathnameActiveIndex = NAV_ITEMS.findIndex(item => item.match(pathname));

  // タップ時に即座にアニメーションを開始するための楽観的インデックス
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const targetIndex = optimisticIndex !== null ? optimisticIndex : pathnameActiveIndex;

  // 移動距離に応じたアニメーション時間を動的に計算
  const prevIndexRef = useRef(targetIndex >= 0 ? targetIndex : 0);
  const [transitionDuration, setTransitionDuration] = useState(360);

  // URL遷移が完了したら楽観的状態をリセット
  useEffect(() => {
    setOptimisticIndex(null);
  }, [pathname]);

  // iOS Safari: position:fixed + backdrop-blur のバグ対策
  // アプリ復帰時に fixed 要素が中途半端な位置に固まる現象を防ぐ
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navRef.current) {
        const el = navRef.current;
        el.style.display = 'none';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.offsetHeight;
        el.style.display = '';
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ピル位置の計測とアニメーション時間の設定
  useLayoutEffect(() => {
    if (targetIndex < 0) {
      setPillStyle(null);
      return;
    }

    // 移動距離（ステップ数）を算出
    const fromIndex = prevIndexRef.current >= 0 ? prevIndexRef.current : targetIndex;
    const diff = Math.abs(targetIndex - fromIndex);
    prevIndexRef.current = targetIndex;

    // 2つ以上離れているときも動きがしっかり見えるよう、距離に応じて時間をスケール
    // 1ステップ: 340ms, 2ステップ: 410ms, 3ステップ: 470ms, 4ステップ: 530ms
    const duration = isFirstRender.current ? 0 : Math.min(540, 300 + Math.max(1, diff) * 60);
    setTransitionDuration(duration);

    const updatePill = () => {
      const btn = buttonRefs.current[targetIndex];
      if (!btn) return;

      // btn.offsetLeft は relative である nav の padding-box を基準にした正確な座標
      // ピル（position: absolute）も nav の padding-box が基準のため、ズレなく一致する
      const btnWidth = btn.offsetWidth;
      const pillWidth = Math.round(Math.min(68, Math.max(48, btnWidth * 0.78)));
      const left = btn.offsetLeft + Math.round((btnWidth - pillWidth) / 2);

      setPillStyle({ left, width: pillWidth });
    };

    updatePill();

    // 画面サイズ変更時（回転等）も再計算
    window.addEventListener('resize', updatePill);

    // 初回描画フラグ解除
    const timer = setTimeout(() => {
      isFirstRender.current = false;
    }, 50);

    return () => {
      window.removeEventListener('resize', updatePill);
      clearTimeout(timer);
    };
  }, [targetIndex]);

  // ログイン画面では下部メニューを非表示
  if (pathname === '/login') return null;

  const handleNavClick = (href: string, index: number) => {
    if (index === targetIndex) return;

    // 即座に楽観的状態をセットしてアニメーションを即時スタート（ゼロ遅延）
    setOptimisticIndex(index);

    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe"
      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
    >
      <nav ref={navRef} className="max-w-md mx-auto px-2 h-16 flex items-center relative">

        {/* スライドするピル背景 */}
        {pillStyle && (
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-2xl pointer-events-none"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              height: 46,
              background: 'color-mix(in srgb, var(--color-primary) 13%, transparent)',
              boxShadow: '0 2px 10px color-mix(in srgb, var(--color-primary) 16%, transparent)',
              // 距離に応じた滑らかなアニメーション。2つ以上離れても移動の軌跡がくっきり見えるカーブ
              transition: isFirstRender.current
                ? 'none'
                : `left ${transitionDuration}ms cubic-bezier(0.28, 1.1, 0.42, 1), width ${transitionDuration}ms cubic-bezier(0.28, 1.1, 0.42, 1)`,
            }}
          />
        )}

        {NAV_ITEMS.map((item, index) => {
          const isActive = index === targetIndex;
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              ref={el => { buttonRefs.current[index] = el; }}
              type="button"
              onClick={() => handleNavClick(item.href, index)}
              className="relative flex flex-col items-center justify-center flex-1 gap-0.5 z-10 h-full"
            >
              {/* アイコン */}
              <div
                style={{
                  color: isActive ? 'var(--color-primary)' : '#9ca3af',
                  transform: isActive ? 'translateY(-2px) scale(1.12)' : 'translateY(0) scale(1)',
                  filter: isActive
                    ? 'drop-shadow(0 2px 8px color-mix(in srgb, var(--color-primary) 45%, transparent))'
                    : 'none',
                  transition: 'color 0.25s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s',
                }}
              >
                <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>

              {/* ラベル */}
              <span
                className="text-[9px] font-black tracking-wider"
                style={{
                  color: isActive ? 'var(--color-primary)' : '#9ca3af',
                  opacity: isActive ? 1 : 0.7,
                  transition: 'color 0.25s, opacity 0.25s',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
