'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete';
import type { Post } from '@/lib/types';
import { MapPin, Search, Navigation, Filter } from 'lucide-react';
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
  const { activeTab, keyword, activeGroups, advancedFilters, activeMapTag } = filterState;

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

  const handleSearchSelect = (place: { name: string, address: string, lat: number, lng: number, placeId: string }) => {
    setCenter({ lat: place.lat, lng: place.lng });
    setZoom(15);
    setTempMarker({
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
      name: place.name,
      address: place.address
    });
  };

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
          
          <div className="shadow-lg rounded-2xl overflow-visible relative pointer-events-auto bg-white/95 backdrop-blur-md">
            <PlaceAutocomplete onPlaceSelected={handleSearchSelect} />
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
