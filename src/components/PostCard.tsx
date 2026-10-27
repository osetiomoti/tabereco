'use client';

import type { Post } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { Heart, CheckCircle2, User, MoreHorizontal, Star, MapPin, X, Bookmark, Utensils, MessageCircle, ThumbsUp, Map, BookmarkCheck, Send, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VisitedModal } from '@/components/VisitedModal';
import { StarInput, StarDisplay } from '@/components/StarRating';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = { 
  post: Post;
  layout?: 'vertical' | 'horizontal' | 'compact';
  onLike?: (postId: string) => void | Promise<any>;
  likedByMe?: boolean;
  likesCount?: number;
  commentCount?: number;
};

export function PostCard({ post, layout = 'vertical', onLike, likedByMe, likesCount, commentCount }: Props) {
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasCoords = post.latitude != null && post.longitude != null;
  const staticMapUrl = hasCoords && apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${post.latitude},${post.longitude}&zoom=16&size=600x400&markers=color:0xf43f5e%7C${post.latitude},${post.longitude}&key=${apiKey}`
    : null;

  // 自分の投稿かどうか（フィードレイアウトでも先に計算）
  const _isMine = (post as any).__is_mine !== false;

  // 楽観的UIのためのローカルステート
  const [isFavorite, setIsFavorite] = useState(post.is_favorite);
  const [isWantToGo, setIsWantToGo] = useState((post as any)._isMarkedWantToGo);
  // isVisited: 自分の投稿→status=='visited', 他人の投稿→_isMarkedVisited
  const [isVisited, setIsVisited] = useState(
    _isMine ? post.status === 'visited' : !!((post as any)._isMarkedVisited)
  );
  const initialRatingVal = (post as any)._myRating ?? (_isMine ? post.rating : null);
  const [myRating, setMyRating] = useState<number | null>(initialRatingVal ?? null);
  const [pendingRating, setPendingRating] = useState<number>(initialRatingVal ?? 3.0);
  const [ratingSaving, setRatingSaving] = useState(false);
  // 詳細パネルをアクション後に再フェッチするためのキー
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const bumpDetail = () => setDetailRefreshKey(k => k + 1);

  useEffect(() => {
    setIsFavorite(post.is_favorite);
  }, [post.is_favorite]);

  useEffect(() => {
    setIsWantToGo((post as any)._isMarkedWantToGo);
  }, [(post as any)._isMarkedWantToGo]);

  useEffect(() => {
    setIsVisited(_isMine ? post.status === 'visited' : !!((post as any)._isMarkedVisited));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(post as any)._isMarkedVisited, post.status]);

  useEffect(() => {
    const r = (post as any)._myRating ?? (_isMine ? post.rating : null);
    if (r != null) {
      setMyRating(r);
      setPendingRating(r);
    }
  }, [post.rating, (post as any)._myRating, _isMine]);

  // パネル表示状態
  const [activePanel, setActivePanel] = useState<null | 'rating' | 'comment' | 'detail'>(null);
  const togglePanel = (panel: 'rating' | 'comment' | 'detail') => {
    setActivePanel(p => p === panel ? null : panel);
  };

  if (layout === 'horizontal') {
    return (
      <Link href={`/posts/${post.id}`} className="group block mb-4">
        <div className="relative flex bg-white rounded-[2rem] p-4 border border-gray-100/60 shadow-sm hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98]">
          {/* 左側: 写真 */}
          {post.image_url ? (
            <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] overflow-hidden bg-gray-50 shadow-inner">
              <Image
                src={getImageUrl(post.image_url)}
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
                  {post.visited_at ? formatDate(typeof post.visited_at === 'string' ? post.visited_at : (post.visited_at as Date).toISOString()) : ''}
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
            <div className="flex flex-col gap-1">
              <div className={`p-2 rounded-full transition-all ${isFavorite ? 'bg-pink-50 text-pink-500' : 'text-gray-100'}`}>
                <Heart size={20} className={isFavorite ? 'fill-pink-500' : ''} />
              </div>
              {isWantToGo && (
                <div className="p-2 rounded-full bg-orange-50 text-orange-500 transition-all">
                  <Bookmark size={20} className="fill-orange-500" />
                </div>
              )}
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
                src={getImageUrl(post.image_url)}
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
              {isFavorite && (
                <div className="bg-pink-500 text-white p-1.5 rounded-full shadow-lg">
                  <Heart size={14} className="fill-white" />
                </div>
              )}
              {isWantToGo && (
                <div className="bg-orange-500 text-white p-1.5 rounded-full shadow-lg">
                  <Bookmark size={14} className="fill-white text-white" />
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
                {post.visited_at ? formatDate(typeof post.visited_at === 'string' ? post.visited_at : (post.visited_at as Date).toISOString()).replace(/-/g, '/') : ''}
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

  // フィード型レイアウト
  const rawImages = post.image_urls && post.image_urls.length > 0 ? post.image_urls : (post.image_url ? [post.image_url] : []);
  const images = rawImages.map(getImageUrl).filter(Boolean);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisitedModalOpen, setIsVisitedModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setCurrentImageIndex(newIndex);
    }
  };

  // 確実に日付をパースして表示する
  let formattedDate = '';
  if (post.visited_at) {
    if (typeof post.visited_at === 'string') {
      formattedDate = post.visited_at.split('T')[0];
    } else if ((post.visited_at as any) instanceof Date) {
      formattedDate = (post.visited_at as any).toISOString().split('T')[0];
    }
  }

  // 自分自身の投稿かどうか（feedレイアウト用・_isMineと同値）
  const isMine = _isMine;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFavoriteStatus }),
      });
      if (!res.ok) {
        setIsFavorite(!newFavoriteStatus);
      }
    } catch (e) {
      console.error(e);
      setIsFavorite(!newFavoriteStatus);
    }
  };

  const toggleWantToGo = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !isWantToGo;
    setIsWantToGo(newVal);
    if (newVal) setIsVisited(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/want-to-go`, { method: 'POST' });
      if (!res.ok) setIsWantToGo(!newVal);
      else bumpDetail();
    } catch (e) {
      console.error(e);
      setIsWantToGo(!newVal);
    }
  };

  const toggleVisited = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisitedModalOpen(true);
  };

  const saveRating = async () => {
    setRatingSaving(true);
    try {
      await fetch(`/api/posts/${post.id}/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: pendingRating }),
      });
      setMyRating(pendingRating);
      setActivePanel(null);
      bumpDetail();
    } catch (e) {
      console.error(e);
    } finally {
      setRatingSaving(false);
    }
  };

  return (
    <div className="bg-white mb-2 pb-2 border-b border-gray-100">
      <Link href={`/posts/${post.id}`} className="block group">
        {/* Header: User Info */}
        <div className="px-4 flex items-center justify-between mb-3 mt-3">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/mypage?userId=${post.user_id}`);
            }}
          >
            {post.user?.avatar_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative shadow-sm border border-gray-50">
                <Image src={getImageUrl(post.user.avatar_url)} alt={post.user.name || 'User'} fill className="object-cover" sizes="32px" unoptimized />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                <User size={16} />
              </div>
            )}
            <span className="font-bold text-gray-700 text-sm">{post.user?.name || '名無しさん'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Image Area */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-50">
          {images.length > 0 ? (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative w-full h-full flex-shrink-0 snap-center cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/posts/${post.id}`);
                  }}
                >
                  <Image
                    src={img}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                  />
                </div>
              ))}
            </div>
          ) : post.status === 'want_to_go' ? (
            <div 
              className="w-full h-full relative bg-gray-100 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                router.push(`/posts/${post.id}`);
              }}
            >
              {staticMapUrl ? (
                <>
                  <Image src={staticMapUrl} alt="Map" fill className="object-cover opacity-80" unoptimized />
                  <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-gray-600 font-bold text-[13px] bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
                      画像が登録されていません
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">📍</span>
                  <p className="text-[12px] font-bold text-gray-500">画像が登録されていません</p>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                router.push(`/posts/${post.id}`);
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <span className="text-3xl">🍽️</span>
              </div>
              <p className="text-[12px] font-bold text-gray-400">写真なし</p>
            </div>
          )}
          
          {/* Overlay buttons for own posts */}
          {isMine && (
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="w-9 h-9 bg-white/80 backdrop-blur-md text-gray-600 rounded-full flex items-center justify-center shadow-lg hover:bg-white"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}

          {isMenuOpen && (
            <div className="absolute top-14 right-3 w-36 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1">
              <Link 
                href={`/posts/${post.id}/edit`}
                className="block w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                編集する
              </Link>
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/20 backdrop-blur-sm rounded-full">
              {images.map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-black text-gray-900 truncate mb-0.5">{post.title}</h2>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 font-medium text-[12px] truncate flex items-center gap-1">
                  <MapPin size={10} className="text-orange-500" />
                  {post.store_name}
                </p>
                {(post.price_min != null || post.price_max != null) && (
                  <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    ¥{post.price_min?.toLocaleString() ?? ''}〜{post.price_max?.toLocaleString() ?? ''}
                  </span>
                )}
              </div>
            </div>
            {post.status !== 'want_to_go' && (post.rating != null || post._avgRating != null) && (
              <div className="flex flex-col items-end gap-1">
                {post.rating != null && post.rating > 0 && (
                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                    <Star size={12} className="fill-orange-500 text-orange-500" />
                    <span className="text-orange-600 font-black text-[13px]">
                      {post.rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {post._ratingCount && post._ratingCount > (post.rating != null && post.rating > 0 ? 1 : 0) ? (
                  <span className="text-[10px] text-gray-400 font-bold mr-1">
                    平均: {post._avgRating?.toFixed(1)} ({post._ratingCount}人)
                  </span>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag.id} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{tag.name}</span>
              ))}
              {post.tags.length > 3 && <span className="text-[10px] text-gray-300">...</span>}
            </div>
          )}
        </div>
      </Link>

      {/* ▽ Action Bar ▽ */}
      <div className="px-4 py-2 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center gap-5">
          {/* コメント */}
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePanel('comment'); bumpDetail(); }}
            className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
          >
            <MessageCircle
              size={22}
              className={`transition-colors ${activePanel === 'comment' ? 'fill-blue-400 text-blue-400' : 'text-gray-300'}`}
            />
            <span className={`text-[9px] font-bold leading-none ${activePanel === 'comment' ? 'text-blue-400' : 'text-gray-300'}`}>コメント</span>
          </button>

          {isMine ? (
            /* お気に入り (自分の投稿のみ) */
            <button 
              onClick={toggleFavorite}
              className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
            >
              <Heart
                size={22}
                className={`transition-colors ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-gray-300'}`}
              />
              <span className={`text-[9px] font-bold leading-none ${isFavorite ? 'text-pink-400' : 'text-gray-300'}`}>お気に入り</span>
            </button>
          ) : (
            <>
              {/* いいね */}
              <button 
                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (onLike) await onLike(post.id); bumpDetail(); }}
                className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
              >
                <ThumbsUp
                  size={22}
                  className={`transition-colors ${likedByMe ? 'fill-pink-500 text-pink-500' : 'text-gray-300'}`}
                />
                <span className={`text-[9px] font-bold leading-none ${likedByMe ? 'text-pink-400' : 'text-gray-300'}`}>いいね</span>
              </button>

              {/* 行った */}
              <button 
                onClick={toggleVisited}
                className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
              >
                <BookmarkCheck
                  size={22}
                  className={`transition-colors ${isVisited ? 'text-green-500' : 'text-gray-300'}`}
                  strokeWidth={isVisited ? 2.5 : 1.5}
                />
                <span className={`text-[9px] font-bold leading-none ${isVisited ? 'text-green-500' : 'text-gray-300'}`}>行った</span>
              </button>

              {/* 行きたい */}
              <button 
                onClick={toggleWantToGo}
                className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
              >
                <Bookmark
                  size={22}
                  className={`transition-colors ${isWantToGo ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`}
                />
                <span className={`text-[9px] font-bold leading-none ${isWantToGo ? 'text-orange-400' : 'text-gray-300'}`}>行きたい</span>
              </button>

              {/* 評価 */}
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePanel('rating'); }}
                className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
              >
                <Star
                  size={22}
                  className={`transition-colors ${
                    (myRating != null && myRating > 0) || activePanel === 'rating'
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
                <span className={`text-[9px] font-bold leading-none ${
                  (myRating != null && myRating > 0) || activePanel === 'rating' ? 'text-yellow-400' : 'text-gray-300'
                }`}>評価</span>
              </button>
            </>
          )}
        </div>

        {/* マップ - 右端 */}
        {hasCoords ? (
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}${post.google_place_id ? `&query_place_id=${post.google_place_id}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
          >
            <Map size={22} className="text-gray-300 hover:text-green-500 transition-colors" />
            <span className="text-[9px] font-bold leading-none text-gray-300">マップ</span>
          </a>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* 詳細を見るボタン */}
      <div className="px-4 mt-1 mb-1">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePanel('detail'); }}
          className="text-[12px] font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          詳細を見る
          <ChevronDown size={12} className={`transition-transform ${activePanel === 'detail' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Inline Rating Panel ── */}
      {activePanel === 'rating' && (
        <div className="mx-4 mb-3 bg-orange-50 border border-orange-100 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[12px] font-bold text-orange-800">あなたの評価</label>
            <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <StarInput value={pendingRating} onChange={setPendingRating} />
          <button
            onClick={saveRating}
            disabled={ratingSaving}
            className="mt-3 w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 bg-orange-500 text-white shadow-sm shadow-orange-200 active:scale-95 transition-all disabled:opacity-60"
          >
            <Star size={14} />
            {ratingSaving ? '保存中...' : '評価を保存'}
          </button>
        </div>
      )}

      {/* ── Inline Comment Panel ── */}
      {activePanel === 'comment' && (
        <div className="mx-4 mb-3 animate-in slide-in-from-top-2 duration-200">
          <InlineCommentPanel postId={post.id} onClose={() => setActivePanel(null)} />
        </div>
      )}

      {/* ── Inline Detail Panel ── */}
      {activePanel === 'detail' && (
        <div className="mx-4 mb-3 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <InlineDetailPanel key={`${post.id}-${detailRefreshKey}`} post={post} refreshTrigger={detailRefreshKey} />
        </div>
      )}

      {/* 行ってきた！ボタン（自分の行きたい投稿のみ） */}
      {isMine && post.status === 'want_to_go' && (
        <div className="px-4 pb-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsVisitedModalOpen(true); }}
            className="w-full py-3 text-white font-black text-[13px] rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            style={{
              background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-hover))',
              boxShadow: '0 4px 6px -1px var(--color-primary-shadow)'
            }}
          >
            <Utensils size={16} />
            行ってきた！記録する
          </button>
        </div>
      )}

      {isVisitedModalOpen && (
        <VisitedModal
          isOpen={isVisitedModalOpen}
          postId={post.id}
          storeName={post.store_name || post.title}
          initialData={{
            rating: myRating,
            comment: (post as any)._myComment,
            imageUrl: (post as any)._myImageUrl,
            imageUrls: (post as any)._myImageUrls,
            visitedAt: (post as any)._myVisitedAt,
            isMarked: isVisited,
          }}
          onClose={() => setIsVisitedModalOpen(false)}
          onSuccess={(result) => {
            setIsVisited(true);
            setIsWantToGo(false);
            if (result?.rating !== undefined) {
              setMyRating(result.rating);
            }
            setIsVisitedModalOpen(false);
            bumpDetail();
            if (_isMine && post.status === 'want_to_go') {
              window.location.reload();
            }
          }}
          onDeleted={() => {
            setIsVisited(false);
            setIsVisitedModalOpen(false);
            bumpDetail();
            if (_isMine && post.status === 'want_to_go') {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}


// ── Inline Comment Panel ──────────────────────────────────────────
function InlineCommentPanel({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then(j => { if (j.success) setComments(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const j = await res.json();
      if (j.success) {
        setComments(prev => [j.data, ...prev]);
        setContent('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-[13px] font-black text-gray-700">コメント</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      {/* Comment list */}
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {loading && <p className="text-center py-4 text-[12px] text-gray-400">読み込み中...</p>}
        {!loading && comments.length === 0 && (
          <p className="text-center py-4 text-[12px] text-gray-400">まだコメントはありません</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="px-4 py-2.5 flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {c.user?.avatar_url ? (
                <Image src={getImageUrl(c.user.avatar_url)} alt={c.user.name} width={24} height={24} className="object-cover" unoptimized />
              ) : (
                <User size={12} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-black text-gray-700 mr-1.5">{c.user?.name}</span>
              <span className="text-[12px] text-gray-600">{c.content}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ja })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="コメントを追加..."
          rows={1}
          style={{ minHeight: '38px', maxHeight: '100px' }}
          className="flex-1 bg-white rounded-2xl px-4 py-2 text-[13px] border border-gray-200 outline-none focus:border-orange-400 transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="w-9 h-9 rounded-full text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all bg-[var(--color-primary)]"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}


// ── Inline Detail Panel ──────────────────────────────────────────
function InlineDetailPanel({ post, refreshTrigger }: { post: Post; refreshTrigger?: number }) {
  const [data, setData] = useState<{
    likedUsers: any[];
    visitedUsers: any[];
    wantToGoUsers: any[];
    ratedUsers: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch visited, want-to-go, like, and social data
    Promise.all([
      fetch(`/api/posts/${post.id}/visited`).then(r => r.json()),
      fetch(`/api/posts/${post.id}/want-to-go`).then(r => r.json()),
      fetch(`/api/posts/${post.id}/like`).then(r => r.json()),
    ]).then(([visRes, wtgRes, likeRes]) => {
      setData({
        visitedUsers: visRes.success ? (visRes.data.users || []) : [],
        wantToGoUsers: wtgRes.success ? (wtgRes.data.users || []) : [],
        likedUsers: likeRes.success ? (likeRes.data.users || []) : [],
        ratedUsers: visRes.success ? (visRes.data.users || []).filter((u: any) => u.rating != null) : [],
      });
    }).catch(() => setData({ likedUsers: [], visitedUsers: [], wantToGoUsers: [], ratedUsers: [] }))
      .finally(() => setLoading(false));
  // refreshTrigger が変わるたびに再フェッチ
  }, [post.id, refreshTrigger]);

  if (loading) return <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!data) return null;

  const UserList = ({ users, label, LIcon, iconClass }: { users: any[]; label: string; LIcon: any; iconClass: string }) => (
    <div className="p-4 border-b border-gray-100 last:border-0">
      <p className="text-[11px] font-black text-gray-400 mb-2 tracking-wider flex items-center gap-1">
        <LIcon size={14} className={iconClass} /> {label}
        <span className="ml-1 bg-gray-100 text-gray-500 rounded-full px-1.5 text-[10px]">{users.length}</span>
      </p>
      {users.length === 0 ? (
        <p className="text-[12px] text-gray-300 font-medium">まだいません</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-gray-100 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.avatar_url ? (
                  <Image src={getImageUrl(u.avatar_url)} alt={u.name} width={20} height={20} className="object-cover" unoptimized />
                ) : (
                  <User size={10} className="text-gray-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700">{u.name}</span>
              {u.rating != null && (
                <span className="text-[10px] text-yellow-500 font-black">★{u.rating.toFixed(1)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl">
      {/* メモ */}
      {post.comment && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-[11px] font-black text-gray-400 mb-1.5 tracking-wider">📝 メモ</p>
          <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{post.comment}</p>
        </div>
      )}
      <UserList users={data.likedUsers} label="いいね" LIcon={ThumbsUp} iconClass="text-pink-500 fill-pink-500" />
      <UserList users={data.visitedUsers} label="行った" LIcon={BookmarkCheck} iconClass="text-green-500" />
      <UserList users={data.wantToGoUsers} label="行きたい" LIcon={Bookmark} iconClass="text-orange-400 fill-orange-400" />
      <UserList users={data.ratedUsers} label="評価した人" LIcon={Star} iconClass="text-yellow-400 fill-yellow-400" />
    </div>
  );
}


export function FilterChips({ 
  filters, 
  onRemove, 
  users, 
  groups,
  className 
}: { 
  filters?: any, 
  onRemove: (key: string | string[] | Record<string, any>) => void,
  users?: Array<{ id: string, name: string }>,
  groups?: Array<{ id: string, name: string }>,
  className?: string 
}) {
  if (!filters) return null;

  const primaryChips: Array<{ key: string, label: string, color: string, isRegistrant?: boolean, userId?: string, isGroup?: boolean, groupId?: string }> = [];
  const secondaryChips: Array<{ key: string, label: string, color: string, isTag?: boolean, tagValue?: string }> = [];
  
  const mode = filters.filterMode || 'group';

  if (mode === 'group') {
    const allGroups = !filters.activeGroups || filters.activeGroups.length === 0 || filters.activeGroups.includes('all');
    if (allGroups) {
      if (groups && groups.length > 0) {
        groups.forEach(group => {
          primaryChips.push({
            key: `group-${group.id}`,
            label: `👥 ${group.name}`,
            color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
            isGroup: true,
            groupId: group.id,
          });
        });
      } else {
        primaryChips.push({ key: 'group-all', label: '👥 すべてのグループ', color: 'bg-indigo-50 text-indigo-500 border-indigo-100' });
      }
    } else {
      filters.activeGroups.forEach((groupId: string) => {
        const group = groups?.find(g => g.id === groupId);
        const name = group ? group.name : 'グループ';
        primaryChips.push({ 
          key: `group-${groupId}`, 
          label: `👥 ${name}`, 
          color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
          isGroup: true,
          groupId,
        });
      });
    }
  } else {
    const allSelected = !filters.registrantUserIds || filters.registrantUserIds.length === 0;
    if (allSelected) {
      if (users && users.length > 0) {
        users.forEach(user => {
          primaryChips.push({
            key: `registrant-${user.id}`,
            label: `👤 ${user.name}`,
            color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
            isRegistrant: true,
            userId: user.id,
          });
        });
      } else {
        primaryChips.push({ key: 'member-all', label: '👤 全員', color: 'bg-indigo-50 text-indigo-500 border-indigo-100' });
      }
    } else {
      filters.registrantUserIds.forEach((userId: string) => {
        const user = users?.find((u: { id: string, name: string }) => u.id === userId);
        const name = user ? user.name : '投稿者';
        primaryChips.push({ 
          key: `registrant-${userId}`, 
          label: `👤 ${name}`, 
          color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
          isRegistrant: true,
          userId,
        });
      });
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((t: string) => {
      secondaryChips.push({ key: `tag-${t}`, label: `#${t}`, color: 'bg-pink-50 text-pink-500 border-pink-100', isTag: true, tagValue: t });
    });
  }
  
  if (filters.period && filters.period !== 'all') {
    const periodMap: Record<string, string> = {
      this_month: '今月',
      last_3_months: '過去3ヶ月',
      this_year: '今年',
      last_year: '昨年',
    };
    secondaryChips.push({ key: 'period', label: `🗓️ ${periodMap[filters.period] || filters.period}`, color: 'bg-orange-50 text-orange-500 border-orange-100' });
  }
  if (filters.is_favorite) {
    secondaryChips.push({ key: 'is_favorite', label: '❤️ お気に入り', color: 'bg-red-50 text-red-500 border-red-100' });
  }
  if (filters.is_mine_only) {
    secondaryChips.push({ key: 'is_mine_only', label: '🔒 自分のみ', color: 'bg-gray-100 text-gray-600 border-gray-200' });
  }

  if (primaryChips.length === 0 && secondaryChips.length === 0) return null;

  const renderChip = (chip: any, onRemoveFn: () => void) => (
    <span 
      key={chip.key}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border shadow-sm shrink-0 ${chip.color} animate-in zoom-in`}
    >
      {chip.label}
      {(chip.key !== 'group-all' && chip.key !== 'member-all') && (
        <button 
          onClick={onRemoveFn} 
          className="hover:opacity-60 transition-opacity ml-1 flex items-center justify-center w-3 h-3"
        >
          <X size={10} strokeWidth={4} />
        </button>
      )}
    </span>
  );

  return (
    <div className={`flex flex-col gap-2 mb-6 animate-in slide-in-from-left duration-500 ${className || ''}`}>
      {primaryChips.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ minWidth: 0 }}>
          {primaryChips.map(chip => renderChip(chip, () => {
            if (chip.isRegistrant && chip.userId) {
              const currentIds = (filters.registrantUserIds && filters.registrantUserIds.length > 0)
                ? filters.registrantUserIds
                : (users || []).map(u => u.id);
              const newIds = currentIds.filter((id: string) => id !== chip.userId);
              onRemove({ registrantUserIds: newIds } as any);
            } else if (chip.isGroup && chip.groupId) {
              const currentIds = (filters.activeGroups && filters.activeGroups.length > 0 && !filters.activeGroups.includes('all'))
                ? filters.activeGroups
                : (groups || []).map(g => g.id);
              const newIds = currentIds.filter((id: string) => id !== chip.groupId);
              onRemove({ activeGroups: newIds } as any);
            } else {
              onRemove(chip.key);
            }
          }))}
        </div>
      )}
      {secondaryChips.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-1 items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ minWidth: 0 }}>
          {secondaryChips.map(chip => renderChip(chip, () => {
            if (chip.isTag) {
              const newTags = filters.tags.filter((t: string) => t !== chip.tagValue);
              onRemove(newTags);
            } else {
              onRemove(chip.key);
            }
          }))}
          <button 
            onClick={() => onRemove([])}
            className="text-[11px] font-black text-gray-400 hover:text-gray-600 px-2 transition-colors shrink-0"
          >
            クリア
          </button>
        </div>
      )}
    </div>
  );
}
