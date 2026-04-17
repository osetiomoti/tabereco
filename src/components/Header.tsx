'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, LogOut, User, Navigation, Users, Tag, Settings } from 'lucide-react';

type Props = {
  children?: React.ReactNode;
};

export function Header({ children }: Props) {
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

  const handleSignOut = async () => {
    router.push('/api/auth/logout');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-gray-100/50 h-16 transition-all duration-300">
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-xl shadow-orange-500/20 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
              <UtensilsCrossed size={18} className="text-white" />
            </div>
            <span className="font-black text-gray-900 text-xl tracking-tighter transition-colors group-hover:text-orange-500">モグレコ</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {children}
          
          {!loading && user && (
            <Link
              href="/settings"
              className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50/50 rounded-xl transition-colors"
            >
              <Settings size={22} className="text-gray-500" />
            </Link>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors px-3 py-2 rounded-lg hover:bg-orange-500/5 text-sm font-bold"
            >
              <User size={16} />
              <span>ログイン</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
