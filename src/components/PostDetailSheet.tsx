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

  const tags: string[] = (post as any).tags?.map((t: any) => t.name ?? t) ?? [];
  const hasOnsen = tags.includes('温泉');
  const bathTemperatures: any[] = Array.isArray((post as any).bath_temperatures) ? (post as any).bath_temperatures : [];

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

          {/* 温泉情報（温泉タグがある場合のみ） */}
          {hasOnsen && (
            <div className="border-b border-gray-100">
              <div className="bg-gradient-to-r from-cyan-600 to-teal-500 text-white px-5 py-2.5 font-bold text-[12px] tracking-widest flex items-center gap-2">
                ♨️ 温泉情報
              </div>
              <div className="divide-y divide-gray-100/50 bg-white">

                {/* 施設タイプ */}
                {post.facility_types && post.facility_types.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-1.5">🏠 施設タイプ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.facility_types.map((v: string) => (
                        <span key={v} className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[11px] font-black">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 泉質 */}
                {post.spring_qualities && post.spring_qualities.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-1.5">💧 泉質</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.spring_qualities.map((v: string) => (
                        <span key={v} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-black">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 浴槽情報 */}
                {post.bath_types && post.bath_types.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-1.5">🛁 浴槽情報</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.bath_types.map((v: string) => (
                        <span key={v} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-black">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 源泉・管理方法 */}
                {post.source_managements && post.source_managements.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-1.5">🌊 源泉・管理方法</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.source_managements.map((v: string) => (
                        <span key={v} className="px-2.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-[11px] font-black">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* シャンプー・石鹸 */}
                {post.shampoo_types && post.shampoo_types.length > 0 && (
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-[11px] font-black text-gray-400">🧴 シャンプー・石鹸</p>
                    <div className="flex gap-1.5">
                      {post.shampoo_types.map((v: string) => (
                        <span key={v} className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${v === 'あり' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 利用タイプ */}
                {post.stay_types && post.stay_types.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-1.5">🏨 利用タイプ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.stay_types.map((v: string) => (
                        <span key={v} className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-black">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 秘湯感 */}
                {(post as any).hidden_spring_rating != null && (
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-[11px] font-black text-gray-400">🏔️ 秘湯感</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-base ${((post as any).hidden_spring_rating ?? 0) >= s ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-[10px] text-amber-600 font-bold ml-1">{(post as any).hidden_spring_rating}/5</span>
                    </div>
                  </div>
                )}

                {/* 浴槽ごとの温度 */}
                {bathTemperatures.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-black text-gray-400 mb-2">🌡️ 浴槽ごとの温度</p>
                    <div className="space-y-1.5">
                      {bathTemperatures.map((bath: any, i: number) => (
                        bath && (bath.min != null || bath.max != null) && (
                          <div key={bath.id || i} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                            <span className="text-[12px] font-bold text-gray-700">{bath.name || `浴槽${i + 1}`}</span>
                            <span className="text-[12px] font-black text-orange-600">
                              {bath.min != null && bath.max != null && bath.min === bath.max
                                ? `${bath.min}℃`
                                : bath.min != null && bath.max != null
                                ? `${bath.min}〜${bath.max}℃`
                                : bath.min != null ? `${bath.min}℃〜` : `〜${bath.max}℃`}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

              </div>
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
