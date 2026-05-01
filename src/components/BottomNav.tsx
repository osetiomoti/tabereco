'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, User, Trophy, MapPin, Home } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  // ログイン画面では下部メニューを非表示にする
  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
        <nav className="max-w-md mx-auto px-2 h-16 flex items-center justify-between">
          <NavItem href="/" icon={<Home size={22} />} label="ホーム" isActive={pathname === '/'} />
          
          <NavItem href="/posts" icon={<Clock size={22} />} label="タイムライン" isActive={pathname === '/posts'} />

          <NavItem href="/mypage" icon={<User size={22} />} label="マイページ" isActive={pathname.startsWith('/mypage')} />

          <NavItem href="/map" icon={<MapPin size={22} />} label="マップ" isActive={pathname === '/map'} />

          <NavItem href="/rankings" icon={<Trophy size={22} />} label="ランキング" isActive={pathname.startsWith('/rankings')} />
        </nav>
      </div>
    </>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center flex-1 gap-1 group">
      <div className={`transition-all duration-300 ${isActive ? 'text-orange-500' : 'text-gray-500 hover:-translate-y-0.5'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-bold tracking-wider transition-colors ${isActive ? 'text-orange-500' : 'text-gray-500'}`}>
        {label}
      </span>
    </Link>
  );
}
