'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { PostCard, FilterChips } from '@/components/PostCard';
import { PostCardSkeleton } from '@/components/Skeleton';
import { FilterModal } from '@/components/FilterModal';
import { useFilteredPosts } from '@/hooks/useFilteredPosts';
import { Filter, Search, UtensilsCrossed, List, Map as MapIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FloatingActionButton } from '@/components/FloatingActionButton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PostsPage() {
  const { posts, loading, filterState, updateFilter, activeFilterCount, removeFilter } = useFilteredPosts();
  const { activeTab, keyword, activeGroups, advancedFilters } = filterState;
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  return (
    <>
      <Header title="タイムライン">
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

      <main className="max-w-2xl mx-auto w-full px-4 py-6 pb-32 animate-in fade-in duration-700">
        <div className="mb-6">
          {/* Tabs for Timeline: All, Visited, Want */}
          <div className="flex bg-gray-100/80 rounded-[14px] p-1 mb-6 border border-black/5 shadow-inner">
            <button
              onClick={() => updateFilter({ activeTab: 'all' })}
              className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              すべて
            </button>
            <button
              onClick={() => updateFilter({ activeTab: 'visited' })}
              className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${activeTab === 'visited' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              行った
            </button>
            <button
              onClick={() => updateFilter({ activeTab: 'want_to_go' })}
              className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${activeTab === 'want_to_go' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              行きたい
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text"
              placeholder="お店、料理、場所を検索..."
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-800 placeholder:text-gray-300"
              value={keyword}
              onChange={(e) => updateFilter({ keyword: e.target.value })}
            />
          </div>

          {/* 適用中のフィルタチップ */}
          <FilterChips 
            filters={{ ...(advancedFilters || {}), status: activeTab }} 
            onRemove={removeFilter} 
          />
        </div>

        {/* List View */}
        <div>
          {loading ? (
            <div className="space-y-1">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200">
                <UtensilsCrossed size={40} />
              </div>
              <p className="text-gray-400 font-bold">条件に合う記録が見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>

      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => {
          const { activeGroups: newGroups, status: newStatus, ...rest } = f as any;
          updateFilter({ 
            activeGroups: newGroups || ['all'],
            activeTab: newStatus || 'all',
            advancedFilters: Object.keys(rest).some(k => rest[k] && rest[k] !== 'all' && rest[k] !== '' && rest[k] !== false) ? rest : null
          });
        }}
        initialFilters={{
          ...(advancedFilters || {}),
          activeGroups: activeGroups,
          status: activeTab,
        } as any}
      />
      <FloatingActionButton />
    </>
  );
}
