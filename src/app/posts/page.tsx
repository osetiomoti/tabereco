'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { PostCard, FilterChips } from '@/components/PostCard';
import { PostCardSkeleton } from '@/components/Skeleton';
import { FilterModal } from '@/components/FilterModal';
import { useTimeline } from '@/hooks/useTimeline';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import useSWR from 'swr';
import { Filter, Search, UtensilsCrossed, List, Calendar as CalendarIcon, RefreshCw, Loader2 } from 'lucide-react';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, getDay, addDays, startOfWeek, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

function CalendarView({ posts }: { posts: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const daysInMonth = Array.from({ length: 42 }).map((_, i) => addDays(calendarStart, i));
  const selectedPosts = posts.filter(p => p.visited_at && isSameDay(new Date(p.visited_at), selectedDate));

  return (
    <div className="animate-in fade-in duration-500">
      {/* Month switcher */}
      <div className="flex items-center justify-center py-4 gap-6">
        <button
          onClick={() => setCurrentDate(d => subMonths(d, 1))}
          className="w-9 h-9 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          {'<'}
        </button>
        <span className="text-[16px] font-black text-gray-900">
          {format(currentDate, 'yyyy年 M月', { locale: ja })}
        </span>
        <button
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          className="w-9 h-9 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          {'>'}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-3xl border border-gray-100 p-3 mb-4">
        <div className="grid grid-cols-7 mb-2">
          {['日','月','火','水','木','金','土'].map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-black py-2 ${i===0?'text-red-400':i===6?'text-blue-400':'text-gray-300'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {daysInMonth.map(date => {
            const dayPosts = posts.filter(p => p.visited_at && isSameDay(new Date(p.visited_at), date));
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const hasImage = isCurrentMonth && dayPosts.length > 0 && !!(dayPosts[0].image_url || dayPosts[0].image_urls?.[0]);
            const imgSrc = dayPosts[0]?.image_url || dayPosts[0]?.image_urls?.[0];
            const dIndex = getDay(date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => { setSelectedDate(date); if (!isCurrentMonth) setCurrentDate(startOfMonth(date)); }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all overflow-hidden ${
                  isSelected ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 z-10' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-[13px] font-black z-10 ${
                  isSelected ? 'text-white'
                  : !isCurrentMonth ? 'text-gray-200'
                  : dIndex===0 ? 'text-red-400'
                  : dIndex===6 ? 'text-blue-500'
                  : 'text-gray-800'
                }`} style={hasImage && !isSelected ? { textShadow: '0 1px 4px rgba(255,255,255,0.9)' } : {}}>
                  {format(date, 'd')}
                </span>
                <div className="mt-0.5 flex gap-0.5 h-1 z-10">
                  {dayPosts.length > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`} />
                  )}
                </div>
                {hasImage && imgSrc && (
                  <div className="absolute inset-0 -z-10">
                    <Image src={imgSrc} alt="" fill className="object-cover" />
                    <div className={`absolute inset-0 ${isSelected ? 'bg-orange-500/40' : 'bg-white/25'}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date posts */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-[12px] font-black text-gray-600">{format(selectedDate, 'M月d日（EEEE）', { locale: ja })}</p>
        </div>
        {selectedPosts.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <UtensilsCrossed size={28} className="text-gray-200" />
            <p className="text-[12px] text-gray-300 font-bold">この日は記録がありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {selectedPosts.map(post => (
              <Link key={post.id} href={`/posts/${post.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {(post.image_url || post.image_urls?.[0]) ? (
                    <Image src={post.image_url || post.image_urls[0]} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200"><UtensilsCrossed size={18} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[13px] text-gray-900 truncate">{post.store_name || post.title}</p>
                  <p className="text-[11px] text-gray-400 font-bold truncate">{post.comment}</p>
                  {post.user?.name && <p className="text-[10px] text-orange-400 font-black mt-0.5">{post.user.name}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostsPage() {
  useScrollRestore('posts_list');
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, searchMode, activeGroups, advancedFilters } = filterState;
  
  const {
    posts,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    isRefreshing,
    loadMore,
    mutate
  } = useTimeline({ timelineMode: 'home' });

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Group members and joined groups for filter chips
  const { data: groupsData } = useSWR<{ data: any[] }>('/api/groups', (url: string) => fetch(url).then(r => r.json()));
  const joinedGroups = groupsData?.data || [];
  const memberUsers = [] as any[]; 

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [isLoadingMore, isReachingEnd, loadMore]);

  // いいね管理（オプティミスティックUI）
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  const toggleLike = async (postId: string) => {
    setLikedPosts(prev => {
      const isLiked = !prev[postId];
      setLikesCount(cPrev => {
        const base = cPrev[postId] ?? (posts.find(p => p.id === postId) as any)?._like_count ?? 0;
        return { ...cPrev, [postId]: isLiked ? base + 1 : Math.max(0, base - 1) };
      });
      return { ...prev, [postId]: isLiked };
    });
    return fetch(`/api/posts/${postId}/like`, { method: 'POST' }).catch(console.error);
  };

  const handleRefresh = async () => {
    await mutate();
  };

  const removeFilter = (key: string | string[] | Record<string, any>) => {
    if (typeof key === 'object' && !Array.isArray(key) && 'registrantUserIds' in key) {
      updateFilter({ advancedFilters: { ...(advancedFilters || {}), registrantUserIds: (key as any).registrantUserIds } });
      return;
    }
    let next = { ...(advancedFilters || {}) } as any;
    if (Array.isArray(key)) {
      if (key.length === 0) {
        updateFilter({ activeTab: 'all', advancedFilters: null });
        return;
      } else {
        next.tags = key;
      }
    } else if (key === 'status') {
      updateFilter({ activeTab: 'all' });
      return;
    } else {
      delete next[key as string];
    }
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

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
          {/* View Toggle Tabs */}
          <div className="flex bg-gray-100/80 rounded-[14px] p-1 mb-4 border border-black/5 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              リスト
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              カレンダー
            </button>
          </div>

          {/* Search bar (list view only) */}
          {viewMode === 'list' && (
            <>
              {/* Search mode toggle */}
              <div className="flex gap-2 mb-2.5">
                <button
                  onClick={() => updateFilter({ searchMode: 'store_name', keyword: '' })}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
                    searchMode !== 'address'
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  🏪 店名
                </button>
                <button
                  onClick={() => updateFilter({ searchMode: 'address', keyword: '' })}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
                    searchMode === 'address'
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  📍 住所
                </button>
              </div>
              {/* Search input and Refresh */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text"
                    placeholder={searchMode === 'address' ? '住所・エリアで検索（例：渋谷区、銀座...）' : '店名で検索...'}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-800 placeholder:text-gray-300"
                    value={keyword}
                    onChange={(e) => updateFilter({ keyword: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleRefresh}
                  className={`w-[52px] shrink-0 rounded-2xl flex items-center justify-center transition-all ${
                    isRefreshing ? 'bg-orange-100 text-orange-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>
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
            </>
          )}
        </div>

        {/* Content */}
        {viewMode === 'calendar' ? (
          isLoading ? (
            <div className="space-y-1">
              <div className="h-64 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            </div>
          ) : (
            <CalendarView posts={posts} />
          )
        ) : (
          <div>
            {isLoading ? (
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
                {posts.map((post) => {
                  const isOthersPosts = (post as any).__is_mine === false;
                  const postLikesCount = likesCount[post.id] ?? (post as any)._like_count ?? 0;
                  const postCommentCount = (post as any)._comment_count ?? (post as any).comments?.length;
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={isOthersPosts ? toggleLike : undefined}
                      likedByMe={isOthersPosts ? (likedPosts[post.id] ?? (post as any)._isLikedByMe ?? false) : undefined}
                      likesCount={postLikesCount}
                      commentCount={postCommentCount}
                    />
                  );
                })}
                
                {/* Infinite Scroll trigger */}
                <div ref={loadMoreRef} className="py-8 flex justify-center h-20">
                  {isLoadingMore && !isReachingEnd && (
                    <Loader2 size={24} className="text-orange-400 animate-spin" />
                  )}
                  {isReachingEnd && posts.length > 0 && (
                    <p className="text-xs font-bold text-gray-300 tracking-wider">すべての投稿を読み込みました</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        hideGroupAndRegistrant={true}
        hideStatus={true}
        onApply={(f) => {
          const { activeGroups: newGroups, status: newStatus, filterMode, ...rest } = f as any;
          updateFilter({
            activeGroups: newGroups || ['all'],
            activeTab: newStatus || 'all',
            filterMode: filterMode || 'group',
            advancedFilters: rest,
          });
        }}
        initialFilters={{
          ...(advancedFilters || {}),
          activeGroups: activeGroups,
          status: activeTab,
          filterMode: filterState.filterMode || 'group',
        } as any}
      />
      <FloatingActionButton />
    </>
  );
}
