'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, ChevronRight, Compass, Utensils, AlertCircle } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';
import { getImageUrl } from '@/lib/image';

type Props = {
  posts: Post[];
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function NearbyWantToGo({ posts }: Props) {
  const { appType } = useAppType();
  const isTabireco = appType === 'tabireco';

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');

  // Check sessionStorage for cached coords on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('tabereco_user_loc');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setCurrentLocation(parsed);
          setStatus('success');
        }
      }
    } catch (e) {}
  }, []);

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        setStatus('success');
        try {
          sessionStorage.setItem('tabereco_user_loc', JSON.stringify(loc));
        } catch (e) {}
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('error');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // Calculate distances for posts with coordinates
  const nearbyPosts = useMemo(() => {
    if (!currentLocation || !posts || posts.length === 0) return [];

    return posts
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => {
        const distKm = getDistanceKm(currentLocation.lat, currentLocation.lng, p.latitude!, p.longitude!);
        return { post: p, distKm };
      })
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 3);
  }, [posts, currentLocation]);

  const targetLabel = isTabireco ? 'スポット' : 'お店';
  const sectionTitle = isTabireco ? '現在地近くの行きたいスポット' : '現在地近くの行きたいお店';

  return (
    <section className="px-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
          isTabireco ? 'bg-teal-500' : 'bg-emerald-500'
        }`}>
          <Navigation size={13} />
        </div>
        <h2 className="text-[15px] font-black text-gray-800">{sectionTitle}</h2>
        {status === 'success' && nearbyPosts.length > 0 && (
          <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
            {nearbyPosts.length}件近い
          </span>
        )}
      </div>

      {status === 'idle' ? (
        /* 位置情報未取得：取得誘導カード */
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-black text-gray-800 leading-tight truncate">
                今いる場所の近くにある{targetLabel}を探す
              </h4>
              <p className="text-[11px] text-gray-500 font-bold mt-0.5 truncate">
                現在地を取得して、徒歩や車ですぐ行ける候補を表示
              </p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[12px] shadow-sm active:scale-95 transition-all shrink-0"
          >
            現在地を取得
          </button>
        </div>
      ) : status === 'loading' ? (
        /* 取得中ローディング */
        <div className="bg-white rounded-2xl p-6 border border-gray-100 flex items-center justify-center gap-2 text-gray-500 text-[12px] font-bold">
          <Navigation size={16} className="animate-spin text-emerald-500" />
          <span>現在地を取得中...</span>
        </div>
      ) : status === 'denied' || status === 'error' ? (
        /* 位置情報許可拒否またはエラー */
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-gray-400 shrink-0" />
            <span>位置情報の取得が制限されています</span>
          </div>
          <Link href="/map" className="text-orange-500 font-black shrink-0 hover:underline">
            マップで探す →
          </Link>
        </div>
      ) : nearbyPosts.length === 0 ? (
        /* 近くに座標付きの投稿がない */
        <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
          <p className="text-[12px] font-bold text-gray-500">
            現在地の近く（位置情報付き）の行きたい{targetLabel}がまだありません
          </p>
          <Link
            href="/map"
            className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-full"
          >
            マップで全件を見る <ChevronRight size={12} />
          </Link>
        </div>
      ) : (
        /* 近くの候補カードリスト */
        <div className="space-y-2.5">
          {nearbyPosts.map(({ post, distKm }) => {
            const isWalkable = distKm < 1.5;
            const distLabel = distKm < 1
              ? `${Math.round(distKm * 1000)}m`
              : `${distKm.toFixed(1)}km`;
            const walkTime = Math.max(1, Math.round((distKm * 1000) / 80));

            return (
              <Link
                key={post.id}
                href={`/map?lat=${post.latitude}&lng=${post.longitude}&postId=${post.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform hover:border-emerald-200"
              >
                {/* サムネイル */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {(post.image_url || post.image_urls?.[0]) ? (
                    <img
                      src={getImageUrl(post.image_url || post.image_urls![0])}
                      alt={post.store_name || post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-500">
                      {isTabireco ? <Compass size={22} /> : <Utensils size={22} />}
                    </div>
                  )}
                </div>

                {/* 店舗・スポット情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-black shrink-0">
                      <MapPin size={9} />
                      {distLabel}
                    </span>
                    {isWalkable && (
                      <span className="text-[9px] text-gray-400 font-bold truncate">
                        徒歩約{walkTime}分
                      </span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-black text-gray-800 truncate">
                    {post.store_name || post.title}
                  </h4>
                  {post.address && (
                    <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                      {post.address}
                    </p>
                  )}
                </div>

                {/* マップへ */}
                <div className="flex flex-col items-center justify-center text-emerald-500 shrink-0 pl-1">
                  <span className="text-[10px] font-black">マップ</span>
                  <ChevronRight size={14} className="text-gray-300 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
