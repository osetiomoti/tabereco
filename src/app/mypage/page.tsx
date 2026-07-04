'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Settings, Hash, ArrowDownUp, Plus, MapPin, Calendar, User, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import Image from 'next/image';
import Link from 'next/link';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import { TagSelector } from '@/components/TagSelector';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { useGroups } from '@/hooks/useAppData';

export default function MyPage() {
  const router = useRouter();
  const { updateFilter } = useSharedFilter();
  const [activeTab, setActiveTab] = useState<'all' | 'visited' | 'want_to_go'>('all');

  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTargetUserId(params.get('userId'));
    }
  }, []);

  const { data: myUserData } = useSWR<{ success: boolean, data: any }>(
    !targetUserId ? '/api/profiles/me' : null,
    (url: string) => fetch(url).then(r => r.json())
  );
  const { data: targetUserData } = useSWR<{ success: boolean, data: any }>(
    targetUserId ? `/api/profiles/${targetUserId}` : null,
    (url: string) => fetch(url).then(r => r.json())
  );

  const { data: ownPostsData, isLoading: ownPostsLoading } = useSWR<Post[]>(
    !targetUserId ? '/api/posts?is_mine=true' : null,
    () => getPosts({ is_mine: true })
  );

  const { data: friendsData } = useSWR<any[]>(
    !targetUserId ? '/api/friends' : null,
    () => import('@/lib/api/friends').then(m => m.getFriends())
  );

  const { groups: myGroups } = useGroups();

  const user = targetUserId ? targetUserData?.data?.user : myUserData?.data;
  const posts: Post[] = targetUserId ? (targetUserData?.data?.posts || []) : (ownPostsData || []);
  const loading = targetUserId ? !targetUserData : ownPostsLoading;
  const friendsCount = targetUserId ? (targetUserData?.data?.friendsCount || 0) : (friendsData?.length || 0);
  const groupsCount = targetUserId ? (targetUserData?.data?.groupsCount || 0) : myGroups.length;

  const [sortField, setSortField] = useState<'date' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const visitedCount = posts.filter(p => p.status === 'visited').length;
  const wantCount = posts.filter(p => p.is_favorite || p.status === 'want_to_go').length;

  let filteredPosts = posts.filter(p => {
    if (activeTab === 'visited') return p.status === 'visited';
    if (activeTab === 'want_to_go') return p.status === 'want_to_go' || p.is_favorite;
    return true;
  });

  if (keyword) {
    const lower = keyword.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title?.toLowerCase().includes(lower) || 
      p.store_name?.toLowerCase().includes(lower) ||
      p.comment?.toLowerCase().includes(lower)
    );
  }

  if (selectedTags.length > 0) {
    filteredPosts = filteredPosts.filter(p =>
      selectedTags.every(tag => p.tags?.some(t => t.name === tag))
    );
  }

  filteredPosts.sort((a, b) => {
    if (sortField === 'date') {
      const tA = new Date(a.visited_at || a.created_at).getTime();
      const tB = new Date(b.visited_at || b.created_at).getTime();
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    } else {
      const rA = a.rating || 0;
      const rB = b.rating || 0;
      return sortOrder === 'desc' ? rB - rA : rA - rB;
    }
  });

  const goToMap = () => {
    if (targetUserId) {
      // 友達ページからマップ: その人だけフィルター
      updateFilter({ 
        activeGroups: [],
        advancedFilters: { registrantUserIds: [targetUserId], include_mine: false }
      });
    } else {
      // 自分のマイページからマップ: 自分だけ
      const myId = myUserData?.data?.id;
      updateFilter({ 
        activeGroups: [],
        advancedFilters: myId ? { registrantUserIds: [myId], include_mine: true } : { include_mine: true }
      });
    }
    router.push('/map');
  };

  const goToCalendar = () => {
    if (targetUserId) {
      // 友達ページからカレンダー: その人だけフィルター
      updateFilter({ 
        activeGroups: [],
        advancedFilters: { registrantUserIds: [targetUserId], include_mine: false }
      });
    } else {
      // 自分のマイページからカレンダー: 自分だけ
      const myId = myUserData?.data?.id;
      updateFilter({ 
        activeGroups: [],
        advancedFilters: myId ? { registrantUserIds: [myId], include_mine: true } : { include_mine: true }
      });
    }
    router.push('/calendar');
  };

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      <Header 
        title={targetUserId ? `${user?.name || 'ともだち'}のページ` : (user?.name || 'マイページ')} 
        hideSettings={!!targetUserId}
        showBackButton={!!targetUserId}
      />

      {/* Profile Info */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="relative shrink-0">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt="User" fill className="object-cover" />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          {!targetUserId && (
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-transform" onClick={() => router.push('/settings')}>
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        <div className="flex-1 flex justify-around ml-6">
          <StatBox count={visitedCount} label="行った" />
          <StatBox count={wantCount} label="行きたい" />
          {!targetUserId ? (
            <Link href="/groups" className="hover:scale-105 transition-transform">
              <StatBox count={friendsCount} label="ともだち" />
            </Link>
          ) : (
            <div className="text-center">
              <StatBox count={friendsCount} label="ともだち" />
            </div>
          )}
          {!targetUserId ? (
            <Link href="/groups?tab=groups" className="hover:scale-105 transition-transform">
              <StatBox count={groupsCount} label="グループ" />
            </Link>
          ) : (
            <div className="text-center">
              <StatBox count={groupsCount} label="グループ" />
            </div>
          )}
        </div>
      </div>

      {/* New record button */}
      {!targetUserId && (
        <div className="px-4 mb-6">
          <Link
            href="/posts/new"
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 hover:scale-[1.01] active:scale-98 transition-all"
          >
            <div className="p-1.5 bg-white/20 rounded-[10px]"><Plus size={22} strokeWidth={3} /></div>
            <span>新しく記録する</span>
          </Link>
        </div>
      )}

      {/* Action Row */}
      <div className={`px-4 mb-5 grid ${targetUserId ? 'grid-cols-4' : 'grid-cols-4'} gap-2`}>
        <button onClick={() => setIsTagSelectorOpen(true)} className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <Hash size={20} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">タグ</span>
        </button>
        <div className="relative col-span-1">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="w-full h-[56px] flex flex-col bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <ArrowDownUp size={20} className="mb-0.5" strokeWidth={2.5} />
            <span className="text-[9px] font-black tracking-wider">並び替え</span>
          </button>
          
          {showSortMenu && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[160px] bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
              <div className="py-2">
                <SortOption label="日付 (新しい順)" active={sortField === 'date' && sortOrder === 'desc'} onClick={() => { setSortField('date'); setSortOrder('desc'); setShowSortMenu(false); }} />
                <SortOption label="日付 (古い順)" active={sortField === 'date' && sortOrder === 'asc'} onClick={() => { setSortField('date'); setSortOrder('asc'); setShowSortMenu(false); }} />
                <SortOption label="評価 (高い順)" active={sortField === 'rating' && sortOrder === 'desc'} onClick={() => { setSortField('rating'); setSortOrder('desc'); setShowSortMenu(false); }} />
                <SortOption label="評価 (低い順)" active={sortField === 'rating' && sortOrder === 'asc'} onClick={() => { setSortField('rating'); setSortOrder('asc'); setShowSortMenu(false); }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={goToMap} className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <MapPin size={20} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">マップ</span>
        </button>
        <button onClick={goToCalendar} className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <Calendar size={20} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">カレンダー</span>
        </button>
      </div>

      {/* Tags Chips */}
      {selectedTags.length > 0 && (
        <div className="px-4 mb-4 flex gap-2 flex-wrap">
          {selectedTags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[12px] font-bold">
              #{t}
              <button className="opacity-60 hover:opacity-100" onClick={() => setSelectedTags(prev => prev.filter(x => x !== t))}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input
            type="text"
            placeholder="記録を検索..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-800 placeholder:text-gray-300"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-6">
        <div className="flex bg-gray-100/80 rounded-[14px] p-1 border border-black/5 shadow-inner">
          <TabBtn active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="すべて" />
          <TabBtn active={activeTab === 'visited'} onClick={() => setActiveTab('visited')} label="行った" />
          <TabBtn active={activeTab === 'want_to_go'} onClick={() => setActiveTab('want_to_go')} label="行きたい" />
        </div>
      </div>

      {/* Tab Content (Grid) */}
      {loading ? (
        <div className="px-0.5 grid grid-cols-3 gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 font-bold text-[14px]">記録が見つかりません</div>
      ) : (
        <div className="px-0.5 grid grid-cols-3 gap-0.5 animate-in fade-in duration-500">
          {filteredPosts.map(post => (
            <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
              {post.image_url ? (
                <Image src={post.image_url} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-50 transition-transform duration-500 group-hover:scale-110">
                  <span className="text-2xl opacity-50">🍽️</span>
                </div>
              )}
              
              {/* Text Overlays for 3-column grid */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
              
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate mt-0.5 opacity-80">
                  {post.store_name} • {formatDate(post.visited_at).split('-').slice(1).join('/')}
                </span>
              </div>

              {post.rating && (
                <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-orange-500 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm scale-75 origin-top-left">
                   <span className="text-[10px] font-black">★</span>
                   <span className="text-[10px] font-black">{post.rating.toFixed(1)}</span>
                </div>
              )}

              {post.is_favorite && (
                <div className="absolute top-1.5 right-1.5 bg-pink-500/90 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm scale-75 origin-top-right">
                   <span className="text-[10px] font-black">♥</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Tag Selector Modal */}
      <TagSelector
        isOpen={isTagSelectorOpen}
        onClose={() => setIsTagSelectorOpen(false)}
        selectedTags={selectedTags}
        onSelect={tags => setSelectedTags(tags)}
      />
    </div>
  );
}

function SortOption({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-[12px] font-bold hover:bg-gray-50 transition-colors ${active ? 'text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
    >
      {label}
    </button>
  );
}

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-[42px] h-[42px] text-gray-300" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function StatBox({ count, label }: { count: number, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center relative -top-1">
      <span className="text-[17px] font-black text-gray-900 leading-none">{count}</span>
      <span className="text-[10px] text-gray-400 font-black mt-1.5">{label}</span>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
    </button>
  );
}
