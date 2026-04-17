'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post } from '@/lib/types';
import { MapPin, Search, Navigation, Filter } from 'lucide-react';
import { useSharedFilter } from '@/hooks/useSharedFilter';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number, lng: number }>({ lat: 35.681236, lng: 139.767125 });
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, activeGroups, advancedFilters, activeMapTag } = filterState;

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number, lng: number, placeId?: string, name?: string, address?: string } | null>(null);

  // Group filter states
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [ownPostsCache, setOwnPostsCache] = useState<Post[]>([]);
  const [groupPostsCache, setGroupPostsCache] = useState<{groupId: string, posts: Post[]}[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const ownPosts = await getPosts({});
        
        // 所属グループの投稿も取得してマージ
        const groups = await getJoinedGroups();
        setJoinedGroups(groups);

        const groupPostsArrays = await Promise.all(
          groups.map(async (g: any) => {
            const p = await getGroupPosts(g.id);
            return { groupId: g.id, posts: p };
          })
        );
        
        setOwnPostsCache(ownPosts);
        setGroupPostsCache(groupPostsArrays);

        // 重複排除 (初期表示はALL)
        const allPostsMap = new Map();
        ownPosts.forEach((p: Post) => allPostsMap.set(p.id, p));
        groupPostsArrays.forEach(g => g.posts.forEach((p: Post) => allPostsMap.set(p.id, p)));
        setPosts(Array.from(allPostsMap.values()));

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log('Location error:', err)
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Update posts when activeGroups changes
  useEffect(() => {
    if (!ownPostsCache.length && !groupPostsCache.length) return;

    let combinedMap = new Map();

    if (activeGroups.includes('all')) {
      ownPostsCache.forEach((p: Post) => combinedMap.set(p.id, p));
      groupPostsCache.forEach(g => g.posts.forEach((p: Post) => combinedMap.set(p.id, p)));
    } else {
      if (activeGroups.includes('mine')) {
        ownPostsCache.forEach((p: Post) => combinedMap.set(p.id, p));
      }
      groupPostsCache.forEach(g => {
        if (activeGroups.includes(g.groupId)) {
          g.posts.forEach((p: Post) => combinedMap.set(p.id, p));
        }
      });
    }

    let result = Array.from(combinedMap.values()) as Post[];

    if (activeTab !== 'all') {
      result = result.filter(p => p.status === activeTab);
    }
    
    if (keyword) {
      const lowerReq = keyword.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(lowerReq) ||
        p.store_name?.toLowerCase().includes(lowerReq) ||
        p.comment?.toLowerCase().includes(lowerReq)
      );
    }

    if (advancedFilters?.tag) {
      result = result.filter(p => p.tags?.some(t => t.name === advancedFilters.tag));
    }
    if (advancedFilters?.is_favorite) {
      result = result.filter(p => p.is_favorite);
    }

    setPosts(result.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [activeGroups, activeTab, keyword, advancedFilters, ownPostsCache, groupPostsCache]);

  const removeFilter = (key: string) => {
    const next = { ...advancedFilters };
    delete next[key];
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  // Unique Tags (now based on all unfiltered posts or cached posts, up to preference. Let's use visible posts' tags for quick filtering)
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
      <Header>
        <button 
          onClick={() => setIsFilterModalOpen(true)}
          className={`p-2 rounded-xl transition-all ${
            advancedFilters 
              ? 'bg-orange-50 text-orange-500' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-orange-500'
          }`}
        >
          <Filter size={22} className={advancedFilters ? 'fill-orange-500/20' : ''} />
        </button>
      </Header>
      <main className="w-full h-[calc(100dvh-64px-64px)] pb-safe relative animate-fade-in group">
        {/* Floating Search Bar & Filter Chips */}
        <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-[100] flex flex-col gap-2">
          
          <div className="shadow-2xl rounded-2xl overflow-visible relative">
            <PlaceAutocomplete onPlaceSelected={handleSearchSelect} />
          </div>

          <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl p-2 shadow-lg flex flex-col gap-2 pointer-events-auto">
            {/* 適用中のフィルタチップ */}
            {advancedFilters && <FilterChips filters={advancedFilters} onRemove={removeFilter} />}
            
            {/* Tabs */}
            <div className="flex border-b border-gray-100/50">
              {[
                { id: 'all', label: 'すべて' },
                { id: 'want_to_go', label: 'これから 🥗' },
                { id: 'visited', label: '達成済み 🏆' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateFilter({ activeTab: tab.id as 'all'|'want_to_go'|'visited' })}
                  className={`flex-1 py-1.5 text-[11px] font-black transition-all relative ${
                    activeTab === tab.id ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-full animate-in slide-in-from-left duration-300" />
                  )}
                </button>
              ))}
            </div>

          {/* Groups Filter Chips */}
          {(joinedGroups.length > 0 || ownPostsCache.length > 0) && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
              <button
                onClick={() => toggleGroup('all')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all shadow-sm ${activeGroups.includes('all') ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white/95 text-gray-500 hover:bg-gray-50'}`}
              >
                🌍 すべて
              </button>
              <button
                onClick={() => toggleGroup('mine')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-1 ${activeGroups.includes('mine') ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white/95 text-gray-500 hover:bg-gray-50'}`}
              >
                👤 自分の記録
              </button>
              {joinedGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-1 ${activeGroups.includes(g.id) ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white/95 text-gray-500 hover:bg-gray-50'}`}
                >
                  👥 {g.name}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Floating Fast Tags */}
        {uniqueTags.length > 0 && (
          <div className="absolute top-[170px] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-[100] flex gap-2 overflow-x-auto no-scrollbar pb-2 pointer-events-auto">
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
        onApply={(f) => updateFilter({ advancedFilters: f })}
        initialFilters={advancedFilters}
      />
    </>
  );
}
