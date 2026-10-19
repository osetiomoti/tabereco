'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition, useRef, useLayoutEffect, useState } from 'react';
import { Clock, User, Trophy, MapPin, Home } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         icon: Home,   label: 'ホーム',      match: (p: string) => p === '/'              },
  { href: '/posts',    icon: Clock,  label: 'タイムライン', match: (p: string) => p === '/posts'         },
  { href: '/mypage',   icon: User,   label: 'マイページ',   match: (p: string) => p.startsWith('/mypage')},
  { href: '/map',      icon: MapPin, label: 'マップ',       match: (p: string) => p === '/map'           },
  { href: '/rankings', icon: Trophy, label: 'ランキング',   match: (p: string) => p.startsWith('/rankings') },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ログイン画面では下部メニューを非表示にする
  if (pathname === '/login') return null;

  const activeIndex = NAV_ITEMS.findIndex(item => item.match(pathname));

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
      <nav className="max-w-md mx-auto px-3 h-16 flex items-center relative">

        {/* スライドするピル背景 */}
        {activeIndex >= 0 && (
          <PillIndicator activeIndex={activeIndex} total={NAV_ITEMS.length} />
        )}

        {NAV_ITEMS.map((item, index) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className="relative flex flex-col items-center justify-center flex-1 gap-0.5 z-10 py-1"
            >
              {/* アイコン：アクティブ時は少し上にシフトしてバウンス */}
              <div
                className="transition-all duration-300 ease-out"
                style={{
                  color: isActive ? 'var(--color-primary)' : '#9ca3af',
                  transform: isActive ? 'translateY(-2px) scale(1.1)' : 'translateY(0) scale(1)',
                  filter: isActive ? 'drop-shadow(0 2px 6px color-mix(in srgb, var(--color-primary) 40%, transparent))' : 'none',
                }}
              >
                <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>

              {/* ラベル */}
              <span
                className="text-[9px] font-black tracking-wider transition-all duration-300"
                style={{
                  color: isActive ? 'var(--color-primary)' : '#9ca3af',
                  opacity: isActive ? 1 : 0.75,
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

/** ピル（背景バブル）を activeIndex に合わせてスライドさせるコンポーネント */
function PillIndicator({ activeIndex, total }: { activeIndex: number; total: number }) {
  const navRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    // ナビ全体の幅からアイテム1つ分の幅を計算
    if (!navRef.current) return;
    const navWidth = navRef.current.offsetWidth;
    const itemWidth = navWidth / total;
    const pillWidth = itemWidth * 0.72; // ピルの幅はアイテムの72%
    const left = activeIndex * itemWidth + (itemWidth - pillWidth) / 2;
    setPillStyle({ left, width: pillWidth });
  }, [activeIndex, total]);

  return (
    // オフスクリーンで幅計測用の隠し要素
    <>
      <div ref={navRef} className="absolute inset-0 pointer-events-none" aria-hidden />
      {pillStyle && (
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-2xl pointer-events-none"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            height: 44,
            background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      )}
    </>
  );
}
