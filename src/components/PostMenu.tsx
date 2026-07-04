'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';

export function PostMenu({ postId, postUserId }: { postId: string; postUserId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 自分のプロフィールを取得して、投稿者と照合
  const { data: meData } = useSWR('/api/profiles/me', (url: string) => fetch(url).then(r => r.json()));
  const myId = meData?.data?.id;
  const isOwner = !postUserId || (myId && myId === postUserId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 自分の投稿でない場合はメニューを表示しない
  if (!isOwner) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <MoreHorizontal size={20} className="text-gray-900" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <Link
            href={`/posts/${postId}/edit`}
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Pencil size={16} className="text-gray-400" />
            <span className="font-bold">編集する</span>
          </Link>
        </div>
      )}
    </div>
  );
}
