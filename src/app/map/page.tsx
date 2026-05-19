'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete';
import type { Post } from '@/lib/types';
import { MapPin, Search, Navigation, Filter } from 'lucide-react';
import { useFilteredPosts } from '@/hooks/useFilteredPosts';
import { FilterModal } from '@/components/FilterModal';
import { FilterChips } from '@/components/PostCard';

// Leaflet は `window` を使うため、SSR をオフにして動的インポートする
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});

export default function MapPage() {
  const { posts, loading, filterState, updateFilter, activeFilterCount, joinedGroups, removeFilter, memberUsers } = useFilteredPosts();
  const { activeTab, keyword, activeGroups, advancedFilters, activeMapTag } = filterState;

  const [center, setCenter] = useState<{ lat: number, lng: number }>({ lat: 35.681236, lng: 139.767125 });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number, lng: number, placeId?: string, name?: string, address?: string } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Location error:', err)
      );
    }
  }, []);

  // Unique Tags
  const uniqueTags = Array.from(new Set(posts.flatMap((p: Post) => p.tags?.map((t: any) => t.name) || []))).sort();
  
  // Filtered Posts for Map (apply activeMapTag on top of standard filters)
  const displayedPosts = activeMapTag 
    ? posts.filter((p: Post) => p.tags?.some((t: any) => t.name === activeMapTag))
    : posts;

  const handleSearchSelect = (place: { name: string, address: string, lat: number, lng: number, placeId: string }) => {
    setCenter({ lat: place.lat, lng: place.lng });
    setTempMarker({
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
      name: place.name,
      address: place.address
    });
  };

  const toggleGroup = (id: string) => {
    let next = [...activeGroups];
    if (id === 'all') {
      next = ['all'];
    } else {
      next = next.filter(x => x !== 'all');
      if (next.includes(id)) next = next.filter(x => x !== id);
      else next.push(id);
      if (next.length === 0) next = ['all'];
    }
    updateFilter({ activeGroups: next });
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
        <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-[100] flex flex-col gap-2">
          
          <div className="shadow-2xl rounded-2xl overflow-visible relative pointer-events-auto">
            <PlaceAutocomplete onPlaceSelected={handleSearchSelect} />
          </div>

          {/* Active Filter Chips */}
          <FilterChips
            filters={{ ...(advancedFilters || {}), status: activeTab }}
            onRemove={removeFilter}
            className="pointer-events-auto"
            users={memberUsers}
          />

          {/* Floating Fast Tags */}
          {uniqueTags.length > 0 && (
            (activeTab && activeTab !== 'all') ||
            (keyword && keyword.trim() !== '') ||
            (advancedFilters && (
              (advancedFilters.tags && advancedFilters.tags.length > 0) ||
              (advancedFilters.period && advancedFilters.period !== 'all') ||
              advancedFilters.is_favorite ||
              (advancedFilters.registrantUserIds && advancedFilters.registrantUserIds.length > 0) ||
              advancedFilters.is_mine_only
            )) ||
            activeMapTag !== null
          ) && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pointer-events-auto">
              <button
                 onClick={() => updateFilter({ activeMapTag: null })}
                 className={`px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all shadow-md ${!activeMapTag ? 'bg-orange-500 text-white' : 'bg-white/95 backdrop-blur-xl text-gray-500 hover:bg-white'}`}
              >
                 ALL
              </button>
              {uniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => updateFilter({ activeMapTag: tag })}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all shadow-md ${activeMapTag === tag ? 'bg-orange-500 text-white' : 'bg-white/95 backdrop-blur-xl text-gray-500 hover:bg-white'}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Area */}
        <div className="w-full h-full">
          {loading ? (
             <div className="w-full h-full bg-gray-50 flex items-center justify-center">
               <MapPin className="text-gray-100 animate-bounce" size={48} />
             </div>
          ) : (
            <MapView posts={displayedPosts} center={center} tempMarker={tempMarker} setTempMarker={setTempMarker} />
          )}
        </div>
      </main>

      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => {
          const { activeGroups: newGroups, ...rest } = f as any;
          updateFilter({ 
            activeGroups: newGroups || ['all'],
            advancedFilters: Object.keys(rest).some(k => rest[k] && rest[k] !== 'all' && rest[k] !== '' && rest[k] !== false) ? rest : null
          });
        }}
        initialFilters={{
          ...(advancedFilters || {}),
          activeGroups: activeGroups,
        } as any}
      />
    </>
  );
}
