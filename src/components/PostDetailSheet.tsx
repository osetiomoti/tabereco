'use client';

import { X } from 'lucide-react';
import { CommentsSection, RatingAndActions } from '@/components/PostSocial';
import { Post } from '@/lib/types';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
};

export function PostDetailSheet({ post, isOpen, onClose, isOwner }: Props) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 閉じる操作
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // const isOwner = currentUserId === post.user_id; // Removed in favor of isOwner prop

  const content = (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[100] animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div 
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[101] flex flex-col animate-in slide-in-from-bottom-full duration-300 ease-out"
        style={{ height: '85vh', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="w-8" />
          <h2 className="text-[15px] font-black text-gray-800">詳細</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {/* Memo */}
          {post.comment && (
            <div className="p-5 border-b border-gray-100 bg-white">
              <h3 className="text-[12px] font-black text-gray-400 mb-2 tracking-wider">メモ</h3>
              <p className="text-[14px] text-gray-700 whitespace-pre-wrap leading-relaxed">{post.comment}</p>
            </div>
          )}

          {/* Social Stats & Actions (いいね/行った/行きたい/評価) */}
          <RatingAndActions 
            postId={post.id} 
            isOwner={isOwner} 
            ownerRating={post.rating || null} 
            ownerVisitCount={(post as any).visit_count ?? 1} 
          />

          {/* Comments */}
          <div className="border-t border-gray-100 bg-white min-h-[300px]">
            <CommentsSection 
              postId={post.id} 
              postOwnerId={post.user_id}
              currentUserId={null} 
            />
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
