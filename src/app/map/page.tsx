'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import type { Post } from '@/lib/types';
import { MapPin, Search, Filter, X, UtensilsCrossed } from 'lucide-react';
import { useFilteredPosts } from '@/hooks/useFilteredPosts';
import { FilterModal } from '@/components/FilterModal';
import { FilterChips } from '@/components/PostCard';
import { useAppType } from '@/contexts/AppTypeContext';
import { SearchStoreCard, type StoreGroupItem } from '@/components/SearchStoreCard';
import { groupPostsByStore, pickRepresentativeImage } from '@/lib/storeUtils';

// Leaflet / Google Maps は `window` を使うため、SSR をオフにして動的インポートする
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});

const JAPAN_CENTER = { lat: 37.0, lng: 137.5 };
const JAPAN_ZOOM = 5;

function SearchPageInner() {
  const { appType } = useAppType();
  const { posts, loading, filterState, updateFilter, activeFilterCount, removeFilter, memberUsers, joinedGroups } = useFilteredPosts();
  const { activeTab, keyword, searchMode, activeGroups, advancedFilters, activeMapTag } = filterState;

  // 初期表示は「リスト」
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const searchParams = useSearchParams();
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');
  const queryPostId = searchParams.get('postId');

  // URLパラメータ（lat, lng, postId）で遷移してきた場合は自動的にマップを表示
  useEffect(() => {
    if (queryLat && queryLng) {
      setViewMode('map');
    }
  }, [queryLat, queryLng]);

  const [center, setCenter] = useState<{ lat: number, lng: number }>(() => {
    if (queryLat && queryLng) {
      return { lat: parseFloat(queryLat), lng: parseFloat(queryLng) };
    }
    return JAPAN_CENTER;
  });
  const [zoom, setZoom] = useState<number>(() => {
    return (queryLat && queryLng) || queryPostId ? 16 : JAPAN_ZOOM;
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number, lng: number, placeId?: string, name?: string, address?: string } | null>(null);

  // 投稿絞り込み用のキーワード入力（ローカル状態：デバウンスで shared filter に反映）
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // shared filter の keyword が外部から変わった場合に同期
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  const handleKeywordChange = (value: string) => {
    setLocalKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter({ keyword: value });
    }, 300);
  };

  const handleClearKeyword = () => {
    setLocalKeyword('');
    updateFilter({ keyword: '' });
  };

  useEffect(() => {
    if (queryLat && queryLng) {
      setCenter({ lat: parseFloat(queryLat), lng: parseFloat(queryLng) });
      setZoom(16);
    }
  }, [queryLat, queryLng]);

  // 絞り込み済み投稿リスト（アクティブなタグがあればさらにフィルタ）
  const displayedPosts = useMemo(() => {
    return activeMapTag 
      ? posts.filter((p: Post) => p.tags?.some((t: any) => t.name === activeMapTag))
      : posts;
  }, [posts, activeMapTag]);

  // 店舗単位でのグルーピング（リスト表示用）
  const storeGroups = useMemo<StoreGroupItem[]>(() => {
    const map = groupPostsByStore(displayedPosts);
    const items: StoreGroupItem[] = [];

    for (const [storeKey, storePosts] of map.entries()) {
      if (storePosts.length === 0) continue;

      // 自分の投稿を優先、なければ写真がある投稿、それもなければ最新の投稿
      const myPost = storePosts.find(p => (p as any).__is_mine !== false);
      const postWithImg = storePosts.find(p => p.image_url || (p.image_urls && p.image_urls.length > 0));
      const repPost = myPost || postWithImg || storePosts[0];

      // 代表画像
      const repImage = pickRepresentativeImage(storePosts) || repPost.image_url || (repPost.image_urls && repPost.image_urls[0]) || null;

      // 評価の平均値
      const ratings = storePosts.map(p => p.rating).filter((r): r is number => r != null && r > 0);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;

      // ステータス判定
      const hasVisited = storePosts.some(p => p.status === 'visited' || (p as any)._isMarkedVisited);
      const hasWantToGo = storePosts.some(p => p.status === 'want_to_go' || (p as any)._isMarkedWantToGo);

      // タグの収集（重複なし）
      const tagSet = new Set<string>();
      storePosts.forEach(p => {
        p.tags?.forEach((t: any) => {
          if (t.name) tagSet.add(t.name);
        });
      });

      // ユニークユーザー数（行った人の数）
      const userIds = new Set<string>();
      storePosts.forEach(p => {
        if (p.user_id) userIds.add(p.user_id);
      });

      // 価格帯（店舗内の全投稿から最小・最大を算出）
      const pricesMin = storePosts.map(p => p.price_min).filter((p): p is number => p != null);
      const pricesMax = storePosts.map(p => p.price_max).filter((p): p is number => p != null);
      const priceMin = pricesMin.length > 0 ? Math.min(...pricesMin) : (repPost.price_min ?? null);
      const priceMax = pricesMax.length > 0 ? Math.max(...pricesMax) : (repPost.price_max ?? null);

      items.push({
        storeKey,
        storeName: repPost.store_name || repPost.title || '店舗名未設定',
        address: repPost.address || null,
        representativePost: repPost,
        representativeImage: repImage,
        postCount: storePosts.length,
        userCount: userIds.size,
        hasVisited,
        hasWantToGo,
        avgRating,
        tags: Array.from(tagSet),
        latitude: repPost.latitude || null,
        longitude: repPost.longitude || null,
        priceMin,
        priceMax,
      });
    }

    return items;
  }, [displayedPosts]);

  return (
    <>
      <Header title="検索">
        <button 
          onClick={() => setIsFilterModalOpen(true)}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeFilterCount > 0
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Filter size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white text-orange-500 text-[9px] font-black rounded-full flex items-center justify-center border border-orange-200">
              {activeFilterCount}
            </span>
          )}
        </button>
      </Header>

      <main className="max-w-2xl mx-auto w-full px-4 pt-3 pb-28 animate-fade-in">
        {/* 1. 検索・フィルター操作エリア */}
        <div className="flex flex-col gap-2 mb-3">
          {/* 検索モード切り替えトグル（店名 / 住所） */}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                updateFilter({ searchMode: 'store_name', keyword: '' });
                setLocalKeyword('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                searchMode !== 'address'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200/60'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              🏪 店名で絞り込み
            </button>
            <button
              onClick={() => {
                updateFilter({ searchMode: 'address', keyword: '' });
                setLocalKeyword('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                searchMode === 'address'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200/60'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              📍 住所で絞り込み
            </button>
          </div>

          {/* キーワード入力バー */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={
                searchMode === 'address'
                  ? '住所・エリアで絞り込み（例：渋谷区、銀座...）'
                  : '店名で絞り込み...'
              }
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-2xl text-[12px] font-medium text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-300 shadow-xs transition-all"
              value={localKeyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
            {localKeyword && (
              <button
                onClick={handleClearKeyword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* アクティブなフィルターチップ */}
          <FilterChips
            filters={{ 
              ...(advancedFilters || {}), 
              status: activeTab, 
              filterMode: filterState.filterMode || 'group',
              activeGroups: activeGroups,
            }}
            onRemove={removeFilter}
            users={memberUsers}
            groups={joinedGroups}
          />
        </div>

        {/* 2. リスト／マップ 切り替えUI（思い出画面と完全同一仕様） */}
        <div className="flex bg-gray-100/80 rounded-[14px] p-1 mb-3 border border-black/5 shadow-inner">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            リスト
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            マップ
          </button>
        </div>

        {/* 3. 検索結果件数表示 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-black text-gray-500">
            {viewMode === 'list'
              ? `📍 ${storeGroups.length} 店舗表示中`
              : `📍 ${displayedPosts.filter((p: Post) => p.latitude && p.longitude).length} 件のピン表示中`}
            {localKeyword && (
              <span className="text-gray-400 font-normal"> (「{localKeyword}」で絞り込み)</span>
            )}
          </span>
        </div>

        {/* 4. メイン表示エリア（リストまたはマップ） */}
        {viewMode === 'list' ? (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : storeGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                  <UtensilsCrossed size={32} />
                </div>
                <p className="text-gray-400 text-xs font-bold">条件に合う店舗が見つかりませんでした</p>
                {(localKeyword || activeFilterCount > 0) && (
                  <button
                    onClick={() => {
                      handleClearKeyword();
                      updateFilter({
                        activeMapTag: null,
                        advancedFilters: undefined,
                      });
                    }}
                    className="text-xs text-orange-500 font-bold underline"
                  >
                    フィルターをクリア
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {storeGroups.map((store) => (
                  <SearchStoreCard key={store.storeKey} store={store} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[calc(100dvh-285px)] min-h-[360px] rounded-2xl overflow-hidden border border-gray-100 relative shadow-sm">
            {loading ? (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                <MapPin className="text-gray-200 animate-bounce" size={48} />
              </div>
            ) : (
              <MapView
                posts={displayedPosts}
                center={center}
                zoom={zoom}
                tempMarker={tempMarker}
                setTempMarker={setTempMarker}
                initialSelectedPostId={queryPostId}
              />
            )}
          </div>
        )}
      </main>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => {
          const { activeGroups: newGroups, ...rest } = f as any;
          const cleanedRest = Object.fromEntries(
            Object.entries(rest).filter(([k, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
          );
          
          updateFilter({
            filterMode: (f as any).filterMode || 'group',
            activeGroups: newGroups || ['all'],
            advancedFilters: Object.keys(cleanedRest).length > 0 ? cleanedRest : undefined
          });
        }}
        initialFilters={{
          ...(advancedFilters || {}),
          filterMode: filterState.filterMode || 'group',
          activeGroups: activeGroups,
        } as any}
        showHotSpringFilter={appType === 'tabireco'}
      />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full bg-gray-50 flex items-center justify-center min-h-screen">
        <MapPin className="text-orange-500 animate-bounce" size={48} />
      </div>
    }>
      <SearchPageInner />
    </Suspense>
  );
}
