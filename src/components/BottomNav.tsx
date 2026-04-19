'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Users, User, Calendar, PieChart } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] pb-safe">
        <nav className="max-w-md mx-auto px-2 h-16 flex items-center justify-between">
          <NavItem href="/posts" icon={<Clock size={22} />} label="タイムライン" isActive={pathname === '/posts'} />
          
          <NavItem href="/groups" icon={<Users size={22} />} label="ともだち" isActive={pathname === '/groups' || pathname.startsWith('/groups')} />

          <NavItem href="/mypage" icon={<User size={22} />} label="マイページ" isActive={pathname.startsWith('/mypage')} />

          <NavItem href="/calendar" icon={<Calendar size={22} />} label="カレンダー" isActive={pathname === '/calendar'} />
          
          <NavItem href="/analytics" icon={<PieChart size={22} />} label="分析" isActive={pathname === '/analytics'} />
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
