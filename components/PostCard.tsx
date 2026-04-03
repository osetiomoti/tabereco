'use client';

import type { Post } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, CheckCircle2, Calendar, Hash } from 'lucide-react';

type Props = { 
  post: Post;
  layout?: 'vertical' | 'horizontal';
};

export function PostCard({ post, layout = 'vertical' }: Props) {
  if (layout === 'horizontal') {
    return (
      <Link href={`/posts/${post.id}`} className="group block mb-4">
        <div className="relative flex bg-white rounded-[2rem] p-4 border border-gray-100/60 shadow-sm hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98]">
          {/* 左側: 写真 */}
          {post.image_url ? (
            <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] overflow-hidden bg-gray-50 shadow-inner">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="128px"
              />
            </div>
          ) : (
            <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] overflow-hidden bg-orange-50 flex items-center justify-center shadow-inner border border-orange-100/50">
              <span className="text-4xl opacity-50">🍽️</span>
            </div>
          )}

          {/* 右側: 情報 */}
          <div className="flex-1 ml-5 py-1 flex flex-col justify-between min-w-0">
            <div className="space-y-1.5 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                {post.status === 'want_to_go' && (
                  <span className="text-[9px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Plan</span>
                )}
                <h3 className="text-base font-black text-gray-900 group-hover:text-orange-500 transition-colors leading-none truncate">
                  {post.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[11px] font-bold truncate max-w-[140px] opacity-70">
                  {post.store_name || '場所未指定'}
                </span>
                <span className="text-[10px] opacity-30">•</span>
                <span className="text-[10px] font-medium bg-gray-50 px-2 py-0.5 rounded-full">
                  {formatDate(post.visited_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden relative">
                  <div 
                    className={`absolute inset-0 bg-yellow-400 transition-all duration-500 ${s <= (post.rating || 0) ? 'w-full' : 'w-0'}`} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 右側アクション */}
          <div className="flex flex-col justify-between items-end ml-2">
            <div className={`p-2 rounded-full transition-all ${post.is_favorite ? 'bg-pink-50 text-pink-500' : 'text-gray-100'}`}>
              <Bookmark size={20} className={post.is_favorite ? 'fill-pink-500' : ''} />
            </div>
            
            {post.status === 'visited' && (
              <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200 animate-in zoom-in">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // 従来の縦型レイアウト (プレミアム版)
  return (
    <Link href={`/posts/${post.id}`} className="group block h-full">
      <div className="h-full rounded-[2.5rem] overflow-hidden bg-white border border-gray-100/60 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_30px_60px_rgba(249,115,22,0.08)]">
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
          {post.image_url ? (
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-1000">
              <span className="text-6xl opacity-40">🍽️</span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {post.is_favorite && (
              <div className="bg-pink-500 text-white p-2 rounded-full shadow-xl animate-in zoom-in">
                <Bookmark size={18} className="fill-white" />
              </div>
            )}
            {post.status === 'want_to_go' && (
              <div className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-widest">
                Plan
              </div>
            )}
          </div>
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl px-3 py-2 flex items-center gap-1.5 shadow-xl border border-white/20">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`w-1 h-1 rounded-full ${s <= (post.rating || 0) ? 'bg-orange-500' : 'bg-gray-200'}`} />
              ))}
            </div>
            <span className="text-gray-900 text-[10px] font-black">{post.rating}</span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-black text-gray-900 text-base leading-tight mb-2 group-hover:text-orange-500 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-tighter">
              {formatDate(post.visited_at)}
            </span>
            {post.status === 'visited' && (
              <div className="text-green-500 bg-green-50 p-1 rounded-full">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** フィルタチップ用コンポーネント */
export function FilterChips({ filters, onRemove }: { filters: any, onRemove: (key: string) => void }) {
  if (!filters) return null;

  const activeChips = [];
  if (filters.tag) activeChips.push({ key: 'tag', label: `#${filters.tag}`, color: 'bg-pink-50 text-pink-500' });
  if (filters.period !== 'all') activeChips.push({ key: 'period', label: `🗓️ ${filters.period}`, color: 'bg-orange-50 text-orange-500' });
  if (filters.is_favorite) activeChips.push({ key: 'is_favorite', label: '❤️ お気に入り', color: 'bg-red-50 text-red-500' });

  if (activeChips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6 animate-in slide-in-from-left duration-500">
      {activeChips.map((chip) => (
        <span 
          key={chip.key}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-sm ${chip.color} animate-in zoom-in`}
        >
          {chip.label}
          <button onClick={() => onRemove(chip.key)} className="hover:opacity-60 transition-opacity">
            <span className="text-[14px]">×</span>
          </button>
        </span>
      ))}
    </div>
  );
}
