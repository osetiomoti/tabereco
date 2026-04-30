'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Settings, ChevronLeft } from 'lucide-react';

type HeaderProps = {
  children?: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  hideSettings?: boolean;
};

export function Header({ children, title, showBackButton, hideSettings }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profiles/me')
      .then(res => res.json())
      .then(json => {
        if (json.success) setUser(json.data);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-all duration-300">
                <UtensilsCrossed size={16} className="text-white" />
              </div>
              <span className="font-black text-gray-900 text-[18px] tracking-tighter hidden xs:block">モグレコ</span>
            </Link>
          )}
        </div>

        {/* Center Title (Absolute) */}
        {title && (
          <div className="absolute inset-x-0 flex justify-center items-center pointer-events-none">
            <h1 className="font-bold text-gray-900 tracking-wide text-[16px]">
              {title}
            </h1>
          </div>
        )}

        {/* Right Side: Actions/Settings */}
        <div className="flex items-center gap-2 z-10">
          {children}
          
          {!loading && user && !hideSettings ? (
            <Link
              href="/settings"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all"
            >
              <Settings size={18} />
            </Link>
          ) : !loading && !user && !hideSettings && (
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
