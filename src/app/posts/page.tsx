'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PostCard, FilterChips } from '@/components/PostCard';
import { FilterModal } from '@/components/FilterModal';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post } from '@/lib/types';
import { UtensilsCrossed, Search, Filter, MapPin } from 'lucide-react';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] bg-gray-50 animate-pulse rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});


export default function PostsPage() {
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, activeGroups, advancedFilters } = filterState;

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [center, setCenter] = useState<{ lat: number, lng: number }>({ lat: 35.681236, lng: 139.767125 });
  const [tempMarker, setTempMarker] = useState<any>(null);

  // Group filter states
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [ownPostsCache, setOwnPostsCache] = useState<Post[]>([]);
  const [groupPostsCache, setGroupPostsCache] = useState<{groupId: string, posts: Post[]}[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ownData, groups] = await Promise.all([
          getPosts({}), 
          getJoinedGroups()
        ]);
        
        setJoinedGroups(groups);

        const groupDataArrays = await Promise.all(
          groups.map(async (g: any) => {
            const p = await getGroupPosts(g.id);
            const postsWithGroup = p.map((post: any) => ({ ...post, __group_name: g.name, __is_mine: false }));
            return { groupId: g.id, posts: postsWithGroup };
          })
        );

        setOwnPostsCache(ownData.map((post: any) => ({ ...post, __is_mine: true })));
        setGroupPostsCache(groupDataArrays);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, 100);
    return () => clearTimeout(timer);
  }, []);

  // Map location init when switched
  useEffect(() => {
    if (viewMode === 'map' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Location error:', err)
      );
    }
  }, [viewMode]);

  // Compute displayed posts locally
  useEffect(() => {
    let combinedMap = new Map();

    if (activeGroups.includes('all')) {
      ownPostsCache.forEach(p => combinedMap.set(p.id, p));
      groupPostsCache.forEach(g => g.posts.forEach(p => combinedMap.set(p.id, p)));
    } else {
      if (activeGroups.includes('mine')) {
        ownPostsCache.forEach(p => combinedMap.set(p.id, p));
      }
      groupPostsCache.forEach(g => {
        if (activeGroups.includes(g.groupId)) {
          g.posts.forEach(p => combinedMap.set(p.id, p));
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

    // Advanced filters
    if (advancedFilters?.tag) {
      result = result.filter(p => p.tags?.some((t: any) => t.name === advancedFilters.tag));
    }
    if (advancedFilters?.is_favorite) {
      result = result.filter(p => p.is_favorite);
    }
    if (advancedFilters?.status && advancedFilters.status !== 'all') {
      result = result.filter(p => p.status === advancedFilters.status);
    }
    if (advancedFilters?.registrantUserId) {
      result = result.filter(p => (p as any).user_id === advancedFilters.registrantUserId);
    }

    setPosts(result.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [activeGroups, activeTab, keyword, advancedFilters, ownPostsCache, groupPostsCache]);

  const removeFilter = (key: string) => {
    const next = { ...advancedFilters };
    delete next[key];
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  // Count active filters for badge
  const activeFilterCount = advancedFilters
    ? Object.entries(advancedFilters).filter(([k, v]) =>
        v && v !== 'all' && v !== '' && v !== false && k !== 'activeGroups'
      ).length + (activeGroups.filter(x => x !== 'all').length > 0 ? 1 : 0)
    : activeGroups.filter(x => x !== 'all').length;

  return (
    <>
      <Header>
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
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 animate-in fade-in duration-700">
        
        {/* 1. プレミアム・リスト/マップ切り替えトグル */}
        <div className="flex justify-center mb-8 mt-2">
          <div className="flex bg-gray-200/50 backdrop-blur-md rounded-2xl p-1 w-full max-w-[280px] shadow-inner border border-gray-100">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2.5 text-[13px] font-black rounded-[14px] transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-lg shadow-black/5 ring-1 ring-black/5 scale-[1.02]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              リスト
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 py-2.5 text-[13px] font-black rounded-[14px] transition-all duration-300 ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-lg shadow-black/5 ring-1 ring-black/5 scale-[1.02]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              マップ
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input
            type="text"
            placeholder="お店や料理を検索..."
            value={keyword}
            onChange={e => updateFilter({ keyword: e.target.value })}
            className="w-full bg-white border border-gray-100 py-3.5 pl-11 pr-4 rounded-2xl text-[14px] font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
          />
        </div>

        {/* 3. 適用中のフィルタチップ */}
        <FilterChips filters={advancedFilters} onRemove={removeFilter} />

        {/* 一覧機能 / マップ表示切り替え */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200">
              <UtensilsCrossed size={40} />
            </div>
            <p className="text-gray-400 font-bold">条件に合う記録が見つかりませんでした</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="w-full h-[60vh] rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 relative animate-in fade-in duration-500">
            <MapView posts={posts} center={center} tempMarker={tempMarker} setTempMarker={setTempMarker} />
          </div>
        ) : (
          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
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
