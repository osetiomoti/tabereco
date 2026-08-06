'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import Link from 'next/link';
import { Heart, MessageCircle, BookmarkCheck, Bookmark, Bell } from 'lucide-react';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NotificationsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/notifications', fetcher);
  const { mutate: mutateUnread } = useUnreadNotifications();

  useEffect(() => {
    // Mark as read when entering the page
    if (data?.data?.some((n: any) => !n.is_read)) {
      fetch('/api/notifications', { method: 'PATCH' }).then(() => {
        mutate(); // update local state to all read
        mutateUnread(); // update badge
      });
    }
  }, [data, mutate, mutateUnread]);

  const notifications = data?.data || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} className="fill-pink-500 text-pink-500" />;
      case 'comment': return <MessageCircle size={20} className="text-blue-500" />;
      case 'visited': return <BookmarkCheck size={20} className="text-orange-500" />;
      case 'want_to_go': return <Bookmark size={20} className="text-orange-400" />;
      case 'new_post': return <Bell size={20} className="text-yellow-500" />;
      default: return <Bell size={20} className="text-gray-400" />;
    }
  };

  return (
    <main className="w-full max-w-md mx-auto bg-gray-50 min-h-screen pb-24 shadow-sm border-x border-gray-100">
      <Header title="お知らせ" showBackButton hideSettings />

      <div className="bg-white">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {!isLoading && notifications.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Bell size={40} className="mb-4 opacity-50" />
            <p className="font-bold">新しいお知らせはありません</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {notifications.map((n: any) => (
            <Link key={n.id} href={`/posts/${n.post_id}`} className={`block p-4 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-orange-50/30' : ''}`}>
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">{getIcon(n.type)}</div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-800 font-medium">
                    <span className="font-black mr-1">{n.actor?.name || 'ゲスト'}</span>
                    さんが{n.message}
                  </p>
                  {n.post?.title && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                      {n.post.store_name ? `📍${n.post.store_name} ` : ''}{n.post.title}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5 font-bold">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ja })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </main>
  );
}
