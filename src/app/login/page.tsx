'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(true); // 自動復元チェックのため初期値をtrueに
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const tryRestore = async () => {
      const storedRt = localStorage.getItem('tabereco_rt');
      if (!storedRt) {
        setIsLoading(false);
        return;
      }

      setIsRestoring(true);
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRt }),
        });

        if (res.ok) {
          console.log('[Login] Session restored from localStorage');
          router.replace('/posts');
          return;
        } else {
          console.log('[Login] Restore failed, clearing localStorage');
          localStorage.removeItem('tabereco_rt');
        }
      } catch {
        console.error('[Login] Restore request failed');
      }

      setIsRestoring(false);
      setIsLoading(false);
    };

    tryRestore();
  }, [router]);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = '/api/auth/login';
  };

  const errorMessage = error === 'auth_failed'
    ? 'ログインに失敗しました。もう一度お試しください。'
    : error === 'token_exchange_failed'
      ? '認証処理に失敗しました。しばらくしてからお試しください。'
      : null;

  return (
    <>
      {/* キャラクターアイコン */}
      <div className="mb-2 animate-bounce-slow">
        <img
          src="/icon-512.png"
          alt="食べレコ ロゴ"
          width={180}
          height={180}
          className="drop-shadow-xl rounded-[3.2rem]"
        />
      </div>

      {/* アプリ名 */}
      <h1 className="text-4xl font-bold text-[#ff6b95] mb-1 tracking-wide">
        食べレコ
      </h1>
      <p className="text-gray-400 text-sm mb-10">美味しいの思い出を、ここに</p>

      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="w-full max-w-xs bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-center">
          <p className="text-red-500 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* ログインボタン */}
      <button
        id="login-button"
        onClick={handleLogin}
        disabled={isLoading || isRestoring}
        className="w-full max-w-xs bg-[#ff6b95] text-white py-4 rounded-full font-bold text-lg shadow-lg
           active:scale-95 transition-all duration-150
           disabled:opacity-70 disabled:cursor-not-allowed
           hover:bg-[#ff5a8a]"
      >
        {isLoading || isRestoring ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {isRestoring ? 'セッション復元中...' : 'ログイン中...'}
          </span>
        ) : (
          'ログイン / はじめる'
        )}
      </button>

      <p className="mt-8 text-xs text-gray-300">
        ログインすると利用規約に同意したことになります
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 select-none">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
