'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { MapPin, Star } from 'lucide-react';
import type { Post } from '@/lib/types';

export type StoreGroupItem = {
  storeKey: string;
  storeName: string;
  address: string | null;
  representativePost: Post;
  representativeImage: string | null;
  postCount: number;
  hasVisited: boolean;
  hasWantToGo: boolean;
  avgRating: number | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
};

export function SearchStoreCard({ store }: { store: StoreGroupItem }) {
  const post = store.representativePost;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all"
    >
      <div className="flex gap-3.5">
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

          {/* 写真上のステータスバッジ（行った / 行きたい） */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10 pointer-events-none">
            {store.hasVisited && (
              <span className="bg-rose-500/90 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                行った
              </span>
            )}
            {store.hasWantToGo && !store.hasVisited && (
              <span className="bg-blue-500/90 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                行きたい
              </span>
            )}
          </div>
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

            {/* 評価 & 記録件数 */}
            <div className="flex items-center gap-2 pt-0.5">
              {store.avgRating != null && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-black text-[11px]">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{store.avgRating.toFixed(1)}</span>
                </div>
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
  );
}
