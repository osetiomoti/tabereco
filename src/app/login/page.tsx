'use client';

import { useState, useEffect } from 'react';
import { UtensilsCrossed, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

const FOOD_EMOJIS = ['🍜', '🍣', '🍕', '🍔', '🌮', '🍱', '🍛', '🥗', '🍝', '🥩'];

export default function LoginPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [randomPositions, setRandomPositions] = useState<{top: string, left: string}[]>([]);

  useEffect(() => {
    setMounted(true);
    setRandomPositions(
      FOOD_EMOJIS.map(() => ({
        top: `${Math.random() * 90}%`,
        left: `${Math.random() * 90}%`,
      }))
    );
  }, []);

  const handleLogin = () => {
    // Next.jsのrouter.pushではなく、通常のページ遷移として外部URL(Cognito)へリダイレクトさせます
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative">
      {/* 背景の浮遊絵文字 (Light Mode) */}
      {mounted && FOOD_EMOJIS.map((emoji, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none text-4xl opacity-[0.03] animate-float"
          style={{
            top: randomPositions[i]?.top || '0%',
            left: randomPositions[i]?.left || '0%',
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${5 + i * 0.5}s`,
          }}
        >
          {emoji}
        </div>
      ))}

      {/* グラデーション (Subtle) */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-transparent" />

      {/* カード */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-2xl shadow-orange-500/5">
          {/* ロゴ */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/20 group hover:scale-105 transition-transform duration-300 overflow-hidden">
              <img src="/icon-192.png" alt="モグレコ ロゴ" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">食べレコ</h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">美味しいを、もっと身近に。</p>
          </div>

          <div className="space-y-6">
            <button
              onClick={handleLogin}
              className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-400 hover:to-red-400 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              ログイン / 新規登録
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">
              セキュアな認証画面へ移動します
            </p>
          </div>

          <footer className="mt-10 text-center">
            <p className="text-[11px] text-gray-300 font-bold uppercase tracking-widest">Premium Gourmet Platform</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
