'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PostCard, FilterChips } from '@/components/PostCard';
import { FilterModal } from '@/components/FilterModal';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post, PostStatus } from '@/lib/types';
import Link from 'next/link';
import { UtensilsCrossed, Search, Filter, Lock, MapPin } from 'lucide-react';
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

type TabType = 'all' | 'want_to_go' | 'visited';

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

    // Advanced filters (Tag)
    if (advancedFilters?.tag) {
      result = result.filter(p => p.tags?.some(t => t.name === advancedFilters.tag));
    }
    if (advancedFilters?.is_favorite) {
      result = result.filter(p => p.is_favorite);
    }

    setPosts(result.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [activeGroups, activeTab, keyword, advancedFilters, ownPostsCache, groupPostsCache]);

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

  const removeFilter = (key: string) => {
    const next = { ...advancedFilters };
    delete next[key];
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
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
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        
        {/* 1. リスト・マップ切り替えトグル (最上部) */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-100/80 rounded-full p-1 w-full max-w-[240px]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-full transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              リスト
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-full transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              マップ
            </button>
          </div>
        </div>

        {/* 2. 検索バー */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text"
              placeholder="何を食べたい？どこに行きたい？"
              value={keyword}
              onChange={(e) => updateFilter({ keyword: e.target.value })}
              className="w-full bg-white border border-gray-100 py-3.5 pl-11 pr-4 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* 3. グループフィルターチップス */}
        {(joinedGroups.length > 0 || ownPostsCache.length > 0) && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
            <button
              onClick={() => toggleGroup('all')}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-black whitespace-nowrap transition-all shadow-sm ${activeGroups.includes('all') ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              🌍 すべて
            </button>
            <button
              onClick={() => toggleGroup('mine')}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-1 ${activeGroups.includes('mine') ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              👤 自分の記録
            </button>
            {joinedGroups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-1 ${activeGroups.includes(g.id) ? 'bg-indigo-500 text-white border border-indigo-600' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
              >
                👥 {g.name}
              </button>
            ))}
          </div>
        )}

        {/* 適用中のフィルタチップ */}
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
        onApply={(f) => updateFilter({ advancedFilters: f })}
        initialFilters={advancedFilters}
      />

    </>
  );
}
