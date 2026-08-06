'use client';

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center justify-between p-5 bg-gray-50 opacity-60">
        <div className="flex items-center gap-4">
          <span className="text-gray-400"><BellOff size={20} /></span>
          <div>
            <span className="font-bold text-gray-800 text-[15px] block">プッシュ通知</span>
            <span className="text-[11px] text-gray-500 font-medium">お使いのブラウザは対応していません</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-4">
          {isSubscribed ? (
            <span className="text-blue-500"><Bell size={20} fill="currentColor" fillOpacity={0.2} /></span>
          ) : (
            <span className="text-gray-400"><BellOff size={20} /></span>
          )}
          <div>
            <span className="font-bold text-gray-800 text-[15px] block group-hover:translate-x-1 transition-transform">
              プッシュ通知
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              {permission === 'denied' ? 'ブラウザの設定でブロックされています' : '新しいお知らせを通知します'}
            </span>
          </div>
        </div>
        
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading || permission === 'denied'}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isSubscribed ? 'bg-blue-500' : 'bg-gray-200'
          } ${(isLoading || permission === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isLoading && <Loader2 size={12} className="text-gray-400 animate-spin" />}
          </span>
        </button>
      </div>
      
      {isSubscribed && (
        <div className="px-5 pb-5">
          <button
            onClick={async () => {
              try {
                await fetch('/api/push/test', { method: 'POST' });
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full py-2 bg-blue-50 text-blue-500 font-bold rounded-xl text-[12px] hover:bg-blue-100 transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <Bell size={14} /> テスト通知を送信する
          </button>
        </div>
      )}
    </div>
  );
}
