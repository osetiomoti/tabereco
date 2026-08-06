'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Settings, ChevronLeft, Bell } from 'lucide-react';
import { useMyProfile } from '@/hooks/useAppData';
import { useUnreadNotifications } from '@/hooks/useNotifications';

function NotificationBadge() {
  const { count } = useUnreadNotifications();
  if (count === 0) return null;
  return (
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white shadow-sm">
      {count > 9 ? '9+' : count}
    </div>
  );
}

type HeaderProps = {
  children?: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  hideSettings?: boolean;
};

export function Header({ children, title, showBackButton, hideSettings }: HeaderProps) {
  const router = useRouter();
  const { profile: user, isLoading } = useMyProfile();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 h-14 transition-all duration-300">
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between relative">
        {/* Left Side: Logo or Back Button */}
        <div className="flex items-center z-10">
          {showBackButton ? (
            <button 
              onClick={() => router.back()}
              className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-900" />
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-all duration-300 overflow-hidden">
                <img src="/icon-192.png" alt="食べレコ ロゴ" className="w-full h-full object-cover" />
              </div>
              <span className="font-black text-gray-900 text-[18px] tracking-tighter hidden xs:block">食べレコ</span>
            </Link>
          )}
        </div>

        {/* Center Title */}
        {title && (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none px-24">
            <h1 className="font-bold text-gray-900 tracking-wide text-[16px] truncate">
              {title}
            </h1>
          </div>
        )}

        {/* Right Side: Actions/Settings */}
        <div className="flex items-center gap-2 z-10">
          {children}
          
          {!isLoading && user && !hideSettings ? (
            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all"
              >
                <Bell size={18} />
                {/* 🔴 未読バッジは専用コンポーネントかここで取得して表示する */}
                <NotificationBadge />
              </Link>
              <Link
                href="/settings"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all"
              >
                <Settings size={18} />
              </Link>
            </div>
          ) : !isLoading && !user && !hideSettings && (
            <Link
              href="/login"
              className="text-orange-500 font-bold text-sm px-3 py-1.5 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
