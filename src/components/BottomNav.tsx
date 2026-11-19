'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, BarChart2, Plus, Trophy, User } from 'lucide-react';

interface TabItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  match: (p: string) => boolean;
}

const LEFT_TABS: TabItem[] = [
  {
    href: '/map',
    label: '検索',
    match: (p: string) => p === '/map' || p === '/',
    icon: (active) => <Search size={21} strokeWidth={active ? 2.5 : 2} />,
  },
  {
    href: '/stats',
    label: '統計',
    match: (p: string) => p.startsWith('/stats') || p.startsWith('/calendar'),
    icon: (active) => <BarChart2 size={21} strokeWidth={active ? 2.5 : 2} />,
  },
];

const RIGHT_TABS: TabItem[] = [
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
 * futariba 準拠のモダンタブバー
 * 左2タブ（検索・統計）＋ センターFAB（＋登録）＋ 右2タブ（ランキング・マイページ）
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
      <div className="flex items-end justify-between px-2 max-w-md mx-auto relative h-[60px]">
        {/* 左側2タブ（検索、統計） */}
        <div className="flex flex-1 justify-around h-full items-center">
          {LEFT_TABS.map((tab) => {
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

        {/* センターのアクションボタン（＋ 登録・記録ボタン） */}
        <div className="flex-shrink-0 w-16 flex justify-center h-full relative z-[60]">
          <button
            type="button"
            onClick={() => router.push('/posts/new')}
            className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-tr from-primary-500 to-orange-400 text-white shadow-soft flex items-center justify-center active:scale-90 transition-transform duration-200 hover:shadow-lg"
            title="新しく記録する"
            aria-label="新しく記録する"
          >
            <Plus size={28} strokeWidth={2.6} />
          </button>
        </div>

        {/* 右側2タブ（ランキング、マイページ） */}
        <div className="flex flex-1 justify-around h-full items-center">
          {RIGHT_TABS.map((tab) => {
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
      </div>
    </nav>
  );
}
