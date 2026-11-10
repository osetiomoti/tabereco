'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { MapPin, Star, Bookmark, BookmarkCheck, Map, MessageCircle, ThumbsUp, ChevronDown, X } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VisitedModal } from '@/components/VisitedModal';
import { VisitChoiceModal } from '@/components/VisitChoiceModal';
import { buildNewPostUrlFromStore } from '@/lib/storeUtils';
import { getGoogleMapsUrl } from '@/lib/utils';
import { StarInput } from '@/components/StarRating';
import { InlineCommentPanel, InlineDetailPanel } from '@/components/PostCard';

export type StoreGroupItem = {
  storeKey: string;
  storeName: string;
  address: string | null;
  representativePost: Post;
  representativeImage: string | null;
  postCount: number;
  userCount: number; // ユニークユーザー数（行った人の数）
  hasVisited: boolean;
  hasWantToGo: boolean;
  avgRating: number | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  myPostId?: string | null;
};

function formatPriceRange(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    if (min === max) return `¥${min.toLocaleString()}`;
    return `¥${min.toLocaleString()}〜${max.toLocaleString()}`;
  }
  if (min != null) return `¥${min.toLocaleString()}〜`;
  if (max != null) return `〜¥${max.toLocaleString()}`;
  return null;
}

export function SearchStoreCard({ store }: { store: StoreGroupItem }) {
  const router = useRouter();
  const post = store.representativePost;
  const priceText = formatPriceRange(store.priceMin, store.priceMax);

  const [isVisited, setIsVisited] = useState(store.hasVisited);
  const [isWantToGo, setIsWantToGo] = useState(store.hasWantToGo);
  const [visitorCount, setVisitorCount] = useState(store.userCount);
  const [isVisitedModalOpen, setIsVisitedModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const _isMine = (post as any).__is_mine !== false;
  const [likedByMe, setLikedByMe] = useState(!!((post as any)._is_liked || (post as any).liked_by_me));
  const initialRatingVal = (post as any)._myRating ?? (_isMine ? post.rating : null);
  const [myRating, setMyRating] = useState<number | null>(initialRatingVal ?? null);
  const [pendingRating, setPendingRating] = useState<number>(initialRatingVal ?? 3.0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<null | 'rating' | 'comment' | 'detail'>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const bumpDetail = () => setDetailRefreshKey(k => k + 1);

  const togglePanel = (panel: 'rating' | 'comment' | 'detail') => {
    setActivePanel(p => p === panel ? null : panel);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextVal = !likedByMe;
    setLikedByMe(nextVal);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      if (!res.ok) setLikedByMe(!nextVal);
      else bumpDetail();
    } catch {
      setLikedByMe(!nextVal);
    }
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

  const handleVisitedClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 未登録時 → 記録方法選択モーダル（詳細を記録する or 行ったのみ記録）を開く
    if (!isVisited) {
      setIsChoiceModalOpen(true);
      return;
    }

    // ── 登録済みの時 ──
    // 1. 詳細を登録している場合（自分が作成した投稿がある） → その編集画面へ遷移
    if (store.myPostId) {
      router.push(`/posts/${store.myPostId}/edit`);
      return;
    }

    // 2. 他人の投稿に PostVisited で詳細（写真やコメント）を登録している場合 → 編集モーダルを開く
    const hasDetailedVisited = !!(
      (post as any)._myComment || 
      (post as any)._myImageUrl || 
      ((post as any)._myImageUrls && (post as any)._myImageUrls.length > 0)
    );
    if (hasDetailedVisited) {
      setIsVisitedModalOpen(true);
      return;
    }

    // 3. 行ったに登録だけしている場合 → 単純に行ったを外す
    if (toggling) return;
    setToggling(true);
    setIsVisited(false);
    setVisitorCount(c => Math.max(0, c - 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/visited`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setIsVisited(true);
        setVisitorCount(c => c + 1);
      }
    } catch {
      setIsVisited(true);
      setVisitorCount(c => c + 1);
    } finally {
      setToggling(false);
    }
  };

  const handleWantToGoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    const newVal = !isWantToGo;
    setIsWantToGo(newVal);
    if (newVal) setIsVisited(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/want-to-go`, { method: 'POST' });
      if (!res.ok) setIsWantToGo(!newVal);
    } catch {
      setIsWantToGo(!newVal);
    } finally {
      setToggling(false);
    }
  };

  const handleQuickVisit = async () => {
    const res = await fetch(`/api/posts/${post.id}/visited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMarked: true }),
    });
    if (res.ok) {
      setIsVisited(true);
      setIsWantToGo(false);
      setIsChoiceModalOpen(false);
      setVisitorCount(c => c + 1);
    }
  };

  const hasCoords = post.latitude != null && post.longitude != null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all overflow-hidden">
      <Link href={`/posts/${post.id}`} className="group block">
        <div className="flex gap-3.5 p-3">
          {/* 左側: 店舗画像 */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100/80">
            {store.representativeImage ? (
              <Image
                src={getImageUrl(store.representativeImage)}
                alt={store.storeName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 96px, 112px"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-gray-400 p-2 text-center">
                <span className="text-2xl mb-1">🍽️</span>
                <span className="text-[9px] font-bold text-gray-500 line-clamp-1">写真なし</span>
              </div>
            )}

            {/* 画像左上: 行った人数バッジ（マイページ同様） */}
            {visitorCount > 0 && (
              <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
                <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
                  👤 {visitorCount}人
                </span>
              </div>
            )}

            {/* 行きたいバッジ（右上） */}
            {isWantToGo && !isVisited && (
              <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
                <span className="bg-blue-500/90 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                  行きたい
                </span>
              </div>
            )}
          </div>

          {/* 右側: 店舗情報 */}
          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
            <div className="space-y-1">
              {/* 店舗名 */}
              <h3 className="text-[15px] font-black text-gray-900 group-hover:text-orange-600 transition-colors leading-tight line-clamp-1">
                {store.storeName}
              </h3>

              {/* 住所・地域 */}
              {store.address && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <MapPin size={12} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate text-[11px] leading-tight">{store.address}</span>
                </div>
              )}

              {/* 評価 & 価格帯 & 記録件数 */}
              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                {store.avgRating != null && (
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-black text-[11px]">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span>{store.avgRating.toFixed(1)}</span>
                  </div>
                )}
                {priceText && (
                  <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    {priceText}
                  </span>
                )}
                {store.postCount > 1 && (
                  <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded-md">
                    {store.postCount}件の記録
                  </span>
                )}
              </div>
            </div>

            {/* タグチップ */}
            {store.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden max-h-5">
                {store.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* アクションバー（タイムラインと同一デザイン） */}
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

          {/* いいね */}
          <button
            onClick={handleLikeClick}
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
            onClick={handleVisitedClick}
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
            onClick={handleWantToGoClick}
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
        </div>

        {/* マップ - 右端 */}
        {hasCoords ? (
          <a
            href={getGoogleMapsUrl(post)}
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

      {/* 記録方法選択モーダル（未登録時） */}
      {isChoiceModalOpen && (
        <VisitChoiceModal
          isOpen={isChoiceModalOpen}
          storeName={store.storeName}
          onClose={() => setIsChoiceModalOpen(false)}
          onDetailRecord={() => {
            setIsChoiceModalOpen(false);
            router.push(buildNewPostUrlFromStore(post));
          }}
          onQuickVisit={handleQuickVisit}
        />
      )}

      {/* 行ったモーダル（既登録時の編集） */}
      {isVisitedModalOpen && (
        <VisitedModal
          isOpen={isVisitedModalOpen}
          postId={post.id}
          storeName={store.storeName}
          onClose={() => setIsVisitedModalOpen(false)}
          initialData={{
            isMarked: isVisited,
          }}
          onSuccess={() => {
            setIsVisited(true);
            setIsWantToGo(false);
            setIsVisitedModalOpen(false);
          }}
          onDeleted={() => {
            setIsVisited(false);
            setVisitorCount(c => Math.max(0, c - 1));
            setIsVisitedModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

