'use client';

import { usePathname } from 'next/navigation';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, BarChart2, Trophy, User } from 'lucide-react';

interface TabItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  match: (p: string) => boolean;
}

const TABS: TabItem[] = [
  {
    href: '/',
    label: 'ホーム',
    match: (p: string) => p === '/',
    icon: (active) => <Home size={21} strokeWidth={active ? 2.5 : 2} />,
  },
  {
    href: '/map',
    label: '検索',
    match: (p: string) => p === '/map',
    icon: (active) => <Search size={21} strokeWidth={active ? 2.5 : 2} />,
  },
  {
    href: '/stats',
    label: '統計',
    match: (p: string) => p.startsWith('/stats') || p.startsWith('/calendar'),
    icon: (active) => <BarChart2 size={21} strokeWidth={active ? 2.5 : 2} />,
  },
  {
    href: '/rankings',
    label: 'ランキング',
    match: (p: string) => p.startsWith('/rankings'),
    icon: (active) => <Trophy size={21} strokeWidth={active ? 2.5 : 2} />,
  },
  {
    href: '/mypage',
    label: 'マイページ',
    match: (p: string) => p.startsWith('/mypage'),
    icon: (active) => <User size={21} strokeWidth={active ? 2.5 : 2} />,
  },
];

/**
 * 5タブボトムナビゲーション（ホーム・検索・統計・ランキング・マイページ）
 * futariba 準拠のモダンなデザイン
 */
export function BottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // ログイン画面では下部メニューを非表示
  if (pathname === '/login') return null;

  // iOS Safari: position:fixed + backdrop-blur のバグ対策
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

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
    >
      <div className="flex items-center justify-around px-2 max-w-md mx-auto h-[60px]">
        {TABS.map((tab) => {
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-150 active:scale-90 ${
                isActive ? 'text-primary-500 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
              style={isActive ? { color: 'var(--color-primary)' } : undefined}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                {tab.icon(isActive)}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
