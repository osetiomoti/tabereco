'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { MapPin, Star, Bookmark, BookmarkCheck, Map } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VisitedModal } from '@/components/VisitedModal';
import { VisitChoiceModal } from '@/components/VisitChoiceModal';
import { buildNewPostUrlFromStore } from '@/lib/storeUtils';
import { getGoogleMapsUrl } from '@/lib/utils';

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

  const handleVisitedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVisited) {
      setIsVisitedModalOpen(true);
    } else {
      setIsChoiceModalOpen(true);
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

