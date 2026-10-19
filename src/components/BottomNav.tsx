'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Clock, User, Trophy, MapPin, Home } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ログイン画面では下部メニューを非表示にする
  if (pathname === '/login') {
    return null;
  }

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
        <nav className="max-w-md mx-auto px-2 h-16 flex items-center justify-between">
          <NavItem href="/" icon={<Home size={22} />} label="ホーム" isActive={pathname === '/'} onClick={navigate} />

          <NavItem href="/posts" icon={<Clock size={22} />} label="タイムライン" isActive={pathname === '/posts'} onClick={navigate} />

          <NavItem href="/mypage" icon={<User size={22} />} label="マイページ" isActive={pathname.startsWith('/mypage')} onClick={navigate} />

          <NavItem href="/map" icon={<MapPin size={22} />} label="マップ" isActive={pathname === '/map'} onClick={navigate} />

          <NavItem href="/rankings" icon={<Trophy size={22} />} label="ランキング" isActive={pathname.startsWith('/rankings')} onClick={navigate} />
        </nav>
      </div>
    </>
  );
}

function NavItem({
  href, icon, label, isActive, onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(href)}
      className="flex flex-col items-center justify-center flex-1 gap-1 group active:scale-95 transition-transform duration-100"
    >
      <div
        className={`transition-colors duration-150 ${isActive ? '' : 'text-gray-500'}`}
        style={isActive ? { color: 'var(--color-primary)' } : undefined}
      >
        {icon}
      </div>
      <span
        className={`text-[9px] font-bold tracking-wider transition-colors duration-150 ${isActive ? '' : 'text-gray-500'}`}
        style={isActive ? { color: 'var(--color-primary)' } : undefined}
      >
        {label}
      </span>
    </button>
  );
}
