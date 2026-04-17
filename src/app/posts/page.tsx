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
      <Header />
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

        {/* 2. プレミアム検索バー & フィルターボタン */}
        <div className="mb-8 flex gap-3">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="何を食べたい？どこに行きたい？"
              value={keyword}
              onChange={(e) => updateFilter({ keyword: e.target.value })}
              className="w-full bg-white border border-gray-100/80 py-4 pl-14 pr-6 rounded-[2rem] text-[15px] font-bold placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500/20 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className={`aspect-square w-[58px] rounded-[1.5rem] flex items-center justify-center transition-all ${
              advancedFilters 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'bg-white border border-gray-100/80 text-gray-500 shadow-sm hover:border-orange-200 hover:bg-orange-50/30'
            }`}
          >
            <Filter size={22} className={advancedFilters ? 'fill-white/20' : ''} />
          </button>
        </div>

        {/* 3. グループフィルターチップス (プレミアム版) */}
        {(joinedGroups.length > 0 || ownPostsCache.length > 0) && (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-6 mb-2">
            <button
              onClick={() => toggleGroup('all')}
              className={`px-5 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all shadow-sm ${activeGroups.includes('all') ? 'bg-orange-500 text-white border border-orange-600 shadow-orange-500/20' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-orange-200'}`}
            >
              🌍 すべて
            </button>
            <button
              onClick={() => toggleGroup('mine')}
              className={`px-5 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeGroups.includes('mine') ? 'bg-indigo-500 text-white border border-indigo-600 shadow-indigo-500/20' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-indigo-200'}`}
            >
              👤 自分
            </button>
            {joinedGroups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeGroups.includes(g.id) ? 'bg-indigo-500 text-white border border-indigo-600 shadow-indigo-500/20' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-indigo-200'}`}
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
