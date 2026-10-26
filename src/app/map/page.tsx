'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import type { Post } from '@/lib/types';
import { MapPin, Search, Filter, X } from 'lucide-react';
import { useFilteredPosts } from '@/hooks/useFilteredPosts';
import { FilterModal } from '@/components/FilterModal';
import { FilterChips } from '@/components/PostCard';
import { useAppType } from '@/contexts/AppTypeContext';

// Leaflet は `window` を使うため、SSR をオフにして動的インポートする
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});

const JAPAN_CENTER = { lat: 37.0, lng: 137.5 };
const JAPAN_ZOOM = 5;

function MapPageInner() {
  const { appType } = useAppType();
  const { posts, loading, filterState, updateFilter, activeFilterCount, removeFilter, memberUsers, joinedGroups } = useFilteredPosts();
  const { activeTab, keyword, searchMode, activeGroups, advancedFilters, activeMapTag } = filterState;

  const searchParams = useSearchParams();
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');
  const queryPostId = searchParams.get('postId');

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

  // shared filter の keyword が外部から変わった場合（タイムライン→マップ遷移など）に同期
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

  // Unique Tags
  const uniqueTags = Array.from(new Set(posts.flatMap((p: Post) => p.tags?.map((t: any) => t.name) || []))).sort();
  
  // Filtered Posts for Map (apply activeMapTag on top of standard filters)
  const displayedPosts = activeMapTag 
    ? posts.filter((p: Post) => p.tags?.some((t: any) => t.name === activeMapTag))
    : posts;

  return (
    <>
      <Header title="マップ">
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
      <main className="w-full h-[calc(100dvh-64px-64px)] pb-safe relative animate-fade-in group">
        {/* Floating Search Bar & Filter Chips */}
        <div className="absolute top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-[100] flex flex-col gap-2 pointer-events-none">
          {/* 投稿絞り込み検索（店名/住所） */}
          <div className="pointer-events-auto flex flex-col gap-1.5">
            {/* 検索モード切り替えトグル */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  updateFilter({ searchMode: 'store_name', keyword: '' });
                  setLocalKeyword('');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm ${
                  searchMode !== 'address'
                    ? 'bg-orange-500 text-white shadow-orange-200/60'
                    : 'bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white'
                }`}
              >
                🏪 店名で絞り込み
              </button>
              <button
                onClick={() => {
                  updateFilter({ searchMode: 'address', keyword: '' });
                  setLocalKeyword('');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm ${
                  searchMode === 'address'
                    ? 'bg-orange-500 text-white shadow-orange-200/60'
                    : 'bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white'
                }`}
              >
                📍 住所で絞り込み
              </button>
            </div>

            {/* キーワード入力 */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
              <input
                type="text"
                placeholder={
                  searchMode === 'address'
                    ? '住所・エリアで絞り込み（例：渋谷区、銀座...）'
                    : '店名で絞り込み...'
                }
                className="w-full pl-9 pr-9 py-2.5 bg-white/95 backdrop-blur-md border-none rounded-2xl text-[12px] font-medium text-gray-800 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-100 shadow-md transition-all"
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

            {/* ピン数表示バッジ */}
            {!loading && (
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-black text-gray-500 shadow-sm">
                  📍 {displayedPosts.filter((p: Post) => p.latitude && p.longitude).length} 件表示中
                  {localKeyword && ` (「${localKeyword}」で絞り込み)`}
                </span>
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
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
            className="pointer-events-auto"
          />
        </div>

        {/* Map Area */}
        <div className="w-full h-full">
          {loading ? (
             <div className="w-full h-full bg-gray-50 flex items-center justify-center">
               <MapPin className="text-gray-200 animate-bounce" size={48} />
             </div>
          ) : (
            <MapView posts={displayedPosts} center={center} zoom={zoom} tempMarker={tempMarker} setTempMarker={setTempMarker} initialSelectedPostId={queryPostId} />
          )}
        </div>
      </main>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => {
          const { activeGroups: newGroups, ...rest } = f as any;
          // Clean up advancedFilters so empty values are excluded
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

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full bg-gray-50 flex items-center justify-center min-h-screen">
        <MapPin className="text-orange-500 animate-bounce" size={48} />
      </div>
    }>
      <MapPageInner />
    </Suspense>
  );
}
