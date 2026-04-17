'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Users, User, Plus, Settings } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
        <nav className="max-w-md mx-auto px-2 h-16 flex items-center justify-between">
          <NavItem href="/posts" icon={<Clock size={22} />} label="タイムライン" isActive={pathname === '/posts'} />
          
          <NavItem href="/groups" icon={<Users size={22} />} label="ともだち" isActive={pathname === '/groups' || pathname.startsWith('/groups')} />

          <Link 
            href="/posts/new" 
            className="flex flex-col items-center justify-center flex-1 gap-1 group"
          >
            <div className="w-11 h-11 bg-gradient-to-tr from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-transform -mt-3">
              <Plus size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-bold tracking-wider text-gray-500">記録</span>
          </Link>

          <Link href="/mypage" className={`flex flex-col items-center justify-center flex-1 gap-1 group`}>
            <User size={22} className={pathname.startsWith('/mypage') ? 'text-orange-500' : 'text-gray-500'} />
            <span className={`text-[9px] font-bold tracking-wider ${pathname.startsWith('/mypage') ? 'text-orange-500' : 'text-gray-500'}`}>
              マイページ
            </span>
          </Link>
          
          <NavItem href="/settings" icon={<Settings size={22} />} label="設定" isActive={pathname === '/settings'} />
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
