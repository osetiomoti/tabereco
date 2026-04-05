'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, LogOut, User, Navigation, Users, Tag } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
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

          {user && (
            <div className="hidden sm:flex items-center gap-6">
              <Link 
                href="/map" 
                className="flex items-center gap-2 text-sm font-black text-gray-500 hover:text-orange-500 transition-all hover:translate-x-0.5"
              >
                <Navigation size={15} strokeWidth={3} />
                マップ
              </Link>
              <Link 
                href="/groups" 
                className="flex items-center gap-2 text-sm font-black text-gray-500 hover:text-orange-500 transition-all hover:translate-x-0.5"
              >
                <Users size={15} strokeWidth={3} />
                グループ
              </Link>
              <Link 
                href="/tags" 
                className="flex items-center gap-2 text-sm font-black text-gray-500 hover:text-orange-500 transition-all hover:translate-x-0.5"
              >
                <Tag size={15} strokeWidth={3} />
                タグ
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <div className="flex sm:hidden items-center gap-2">
              <Link 
                href="/map" 
                className="p-2 text-gray-600 hover:text-orange-500"
              >
                <Navigation size={20} />
              </Link>
              <Link 
                href="/tags" 
                className="p-2 text-gray-600 hover:text-orange-500"
              >
                <Tag size={20} />
              </Link>
              <Link 
                href="/groups" 
                className="p-2 text-gray-600 hover:text-orange-500"
              >
                <Users size={20} />
              </Link>
            </div>
          )}
          
          {!loading && (
            user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors px-3 py-2 rounded-lg hover:bg-orange-500/5 text-sm font-bold"
              >
                <User size={16} />
                <span>ログイン</span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
