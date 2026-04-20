'use client';

import type { Post } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, CheckCircle2, Calendar, Hash, User, MoreHorizontal, Star } from 'lucide-react';
import { useState, useRef } from 'react';

type Props = { 
  post: Post;
  layout?: 'vertical' | 'horizontal' | 'compact';
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
              {/* グループ表示 (Horizontal) */}
              {((post as any).__group_name || (post as any).__is_mine) && (
                <div className="flex items-center mt-1">
                  {(post as any).__is_mine ? (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 flex items-center gap-1 px-1.5 py-0.5 rounded-md">
                      👤 自分
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 flex items-center gap-1 px-1.5 py-0.5 rounded-md truncate max-w-[150px]">
                      👥 {(post as any).__group_name}
                    </span>
                  )}
                </div>
              )}
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

  if (layout === 'compact') {
    return (
      <Link href={`/posts/${post.id}`} className="group block h-full">
        <div className="h-full rounded-[2rem] overflow-hidden bg-white border border-gray-100 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
            {post.image_url ? (
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, 260px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <span className="text-5xl opacity-40">🍽️</span>
              </div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {post.is_favorite && (
                <div className="bg-pink-500 text-white p-1.5 rounded-full shadow-lg">
                  <Bookmark size={14} className="fill-white" />
                </div>
              )}
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm border border-black/5">
              <Star size={12} className="fill-orange-500 text-orange-500" />
              <span className="text-gray-900 text-[11px] font-black">{post.rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>

          <div className="p-4 flex flex-col h-[100px]">
            <h3 className="font-extrabold text-gray-900 text-[14px] leading-snug mb-1 group-hover:text-orange-500 transition-colors line-clamp-2">
              {post.title}
            </h3>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded-md">
                {formatDate(post.visited_at).replace(/-/g, '/')}
              </span>
              {/* グループ表示 */}
              {((post as any).__group_name || (post as any).__is_mine) && (
                <div className="flex items-center justify-end">
                  {(post as any).__is_mine ? (
                    <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">👤 自分</span>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-0.5 truncate max-w-[80px]">
                      👥 {(post as any).__group_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // フィード型レイアウト (リニューアル版)
  const images = post.image_urls && post.image_urls.length > 0 ? post.image_urls : (post.image_url ? [post.image_url] : []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setCurrentImageIndex(newIndex);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Favorite clicked');
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!window.confirm('この記録を削除してもよろしいですか？（この操作は取り消せません）')) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('削除に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました。');
    }
  };

  // 確実に日付をパースして表示する
  let formattedDate = '';
  if (post.visited_at) {
    const d = new Date(post.visited_at);
    if (!isNaN(d.getTime())) {
      formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      formattedDate = post.visited_at.split('T')[0]; // fallback
    }
  }

  // 自分自身の投稿かどうか（グループ投稿等で__is_mineがfalseになっている場合を除く）
  const isMine = (post as any).__is_mine !== false;

  return (
    <div className="bg-white mb-6 pb-8 border-b-8 border-gray-50/50">
      {/* Header: User Info */}
      <div className="px-4 flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-3">
          {post.user?.avatar_url ? (
            <div className="w-11 h-11 rounded-full overflow-hidden relative shadow-sm border border-gray-100">
              <Image src={post.user.avatar_url} alt={post.user.name || 'User'} fill className="object-cover" sizes="44px" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
              <User size={22} />
            </div>
          )}
          <span className="font-bold text-gray-900 text-[16px]">{post.user?.name || '名無しさん'}</span>
        </div>
        <div className="flex items-center gap-3 relative">
          <span className="text-gray-500 text-[14px] font-medium tracking-wide">{formattedDate}</span>
          
          {isMine && (
            <>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="text-gray-400 p-1 hover:bg-gray-50 rounded-full transition-colors relative"
              >
                <MoreHorizontal size={22} />
              </button>
              
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <Link 
                      href={`/posts/${post.id}/edit`}
                      className="block w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-orange-500 transition-colors"
                    >
                      編集する
                    </Link>
                    <div className="h-[1px] bg-gray-50 w-full" />
                    <button 
                      onClick={handleDelete}
                      className="block w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      削除する
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Title / Store Name */}
      <div className="px-4 mb-4">
        <p className="text-gray-900 font-medium text-[16px] leading-relaxed tracking-wide">
          「<span className="font-bold underline decoration-gray-400 underline-offset-4 decoration-2">{post.store_name}</span>」に行きました！
        </p>
      </div>

      <Link href={`/posts/${post.id}`} className="block relative group">
        {/* Images */}
        <div className="relative bg-gray-50 aspect-[4/5] w-full mt-1">
          {images.length > 0 ? (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {images.map((img, idx) => (
                <div key={idx} className="relative w-full h-full flex-shrink-0 snap-center">
                  <Image
                    src={img}
                    alt={`${post.store_name} - image ${idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                    sizes="(max-width: 768px) 100vw, 42rem"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center group-hover:scale-[1.01] transition-transform duration-700">
              <span className="text-6xl opacity-40">🍽️</span>
            </div>
          )}
        </div>
      </Link>

      {/* Pagination Dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {images.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-gray-600 scale-110' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}

      {/* Details Below Image */}
      <div className="px-4 mt-4">
        {post.address && (
          <p className="text-gray-500 text-[13px] mb-3 font-medium truncate max-w-full">
            {post.address}
          </p>
        )}
        
        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star 
              key={star} 
              size={24} 
              className={star <= (post.rating || 0) ? "fill-orange-500 text-orange-500 drop-shadow-sm" : "text-gray-300"} 
            />
          ))}
          <span className="ml-1 text-gray-900 font-extrabold text-xl">{post.rating?.toFixed(1) || '0.0'}</span>
        </div>

        {/* Comment Box */}
        {post.comment && (
          <div className="bg-[#f3f4f6] rounded-xl p-5 mb-5 text-[15px] text-gray-700 leading-loose whitespace-pre-wrap shadow-sm ring-1 ring-gray-900/5">
            <span className="text-xl mr-1.5 inline-block -translate-y-0.5">⭐</span>
            {post.comment}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8 mt-2">
            {post.tags.map(tag => (
              <span key={tag.id} className="text-gray-800 font-bold text-[14px]"># {tag.name}</span>
            ))}
          </div>
        )}

      </div>
    </div>
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
