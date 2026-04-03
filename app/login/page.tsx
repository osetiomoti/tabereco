'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from './actions';
import { UtensilsCrossed, Loader2 } from 'lucide-react';

const FOOD_EMOJIS = ['🍜', '🍣', '🍕', '🍔', '🌮', '🍱', '🍛', '🥗', '🍝', '🥩'];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-400 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          ログイン中...
        </>
      ) : (
        'ログイン'
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative">
      {/* 背景の浮遊絵文字 (Light Mode) */}
      {FOOD_EMOJIS.map((emoji, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none text-4xl opacity-[0.03] animate-float"
          style={{
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
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
            <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/20 group hover:scale-105 transition-transform duration-300">
              <UtensilsCrossed size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">モグレコ</h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">美味しいを、もっと身近に。</p>
          </div>

          {/* フォーム */}
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-black text-gray-600 ml-1">
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-base font-bold shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-black text-gray-600 ml-1">
                パスワード
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-base font-bold shadow-inner"
              />
            </div>

            {state?.error && (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-4 text-sm text-red-500 font-bold break-words leading-relaxed animate-shake">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>

          <footer className="mt-10 text-center">
            <p className="text-[11px] text-gray-300 font-bold uppercase tracking-widest">Premium Gourmet Platform</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
