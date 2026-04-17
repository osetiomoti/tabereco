'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Users, User, Share2, Search, Plus } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Floating Action Button (+) */}
      <Link 
        href="/posts/new" 
        className="fixed bottom-[90px] right-6 z-50 w-[60px] h-[60px] bg-[#df3a35] text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/20 active:scale-95 hover:scale-105 transition-transform"
      >
        <Plus size={36} strokeWidth={2} />
      </Link>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
        <nav className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <NavItem href="/posts" icon={<Clock size={24} />} label="タイムライン" isActive={pathname === '/posts'} />
          <NavItem href="/groups" icon={<Users size={24} />} label="ともだち" isActive={pathname === '/groups'} />
          
          <Link href="/mypage" className={`flex flex-col items-center justify-center min-w-[70px] h-12 rounded-[2rem] transition-all px-2 ${pathname.startsWith('/mypage') ? 'bg-orange-50' : 'bg-transparent'}`}>
            <User size={24} className={pathname.startsWith('/mypage') ? 'text-orange-500' : 'text-gray-900'} />
            <span className={`text-[10px] font-black mt-0.5 tracking-wider ${pathname.startsWith('/mypage') ? 'text-orange-500' : 'text-gray-900'}`}>
              マイページ
            </span>
          </Link>

          <NavItem href="#" icon={<Share2 size={24} />} label="シェア" isActive={false} />
          <NavItem href="/search" icon={<Search size={24} />} label="見つける" isActive={pathname === '/search'} />
        </nav>
      </div>
    </>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center w-14 gap-1 group">
      <div className={`transition-all duration-300 ${isActive ? 'text-gray-900 drop-shadow-sm' : 'text-gray-900 hover:-translate-y-0.5'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-bold tracking-wider transition-colors ${isActive ? 'text-gray-900' : 'text-gray-900'}`}>
        {label}
      </span>
    </Link>
  );
}
