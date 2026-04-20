'use client';

import { useState, useEffect } from 'react';
import { Settings, Search, Hash, ArrowDownUp, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getPosts, getUserTags } from '@/lib/api/posts';
import type { Post, Tag } from '@/lib/types';
import { TagSelector } from '@/components/TagSelector';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'visited' | 'want'>('visited');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [keyword, setKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  useEffect(() => {
    fetch('/api/profiles/me')
      .then(r => r.json())
      .then(j => {
        if (j.success) setUser(j.data);
      });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getPosts({ is_mine: true });
      if (data) setPosts(data);
      setLoading(false);
    }
    load();
  }, []);

  const visitedCount = posts.filter(p => p.status === 'visited').length;
  // Previously we used 'want' or is_favorite, let's just count is_favorite as "want to go" for now
  const wantCount = posts.filter(p => p.is_favorite).length;

  let filteredPosts = posts.filter(p => {
    if (activeTab === 'visited') return p.status === 'visited';
    if (activeTab === 'want') return p.is_favorite;
    return true;
  });

  if (keyword) {
    const k = keyword.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title?.toLowerCase().includes(k) || 
      p.store_name?.toLowerCase().includes(k) ||
      p.comment?.toLowerCase().includes(k)
    );
  }

  if (selectedTags.length > 0) {
    filteredPosts = filteredPosts.filter(p => 
      selectedTags.every(tag => p.tags?.some(t => t.name === tag))
    );
  }

  filteredPosts.sort((a, b) => {
    const tA = new Date(a.visited_at || a.created_at).getTime();
    const tB = new Date(b.visited_at || b.created_at).getTime();
    return sortOrder === 'desc' ? tB - tA : tA - tB;
  });

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      {/* Header */}
      <header className="relative flex items-center justify-center h-14 bg-white px-4 border-b border-gray-100">
        <h1 className="font-black text-lg tracking-wide">{user ? user.name : 'OO'}</h1>
        <Link href="/settings" className="absolute right-4 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Settings size={22} className="text-gray-700" />
        </Link>
      </header>

      {/* Profile Info */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="relative">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt="User" fill className="object-cover" />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-transform" onClick={() => router.push('/settings')}>
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
        
        <div className="flex-1 flex justify-around ml-4 mt-2">
          <StatBox count={visitedCount} label="行った" />
          <StatBox count={wantCount} label="行きたい" />
          <StatBox count={user?.groups_joined || 0} label="ともだち" />
        </div>
      </div>

      {/* New record button */}
      <div className="px-4 mb-8">
        <Link 
          href="/posts/new"
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 hover:scale-[1.01] active:scale-98 transition-all"
        >
          <div className="p-1.5 bg-white/20 rounded-[10px]">
             <Plus size={22} strokeWidth={3} />
          </div>
          <span>新しく記録する</span>
        </Link>
      </div>

      {/* Filter Row */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <div className="flex-1 relative group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" strokeWidth={2.5} />
          <input 
            className="w-full bg-white border border-gray-200 py-3 pl-10 pr-3 rounded-xl text-[14px] font-bold placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all outline-none"
            placeholder="記録したお店を検索"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsTagSelectorOpen(true)}
          className={`w-[46px] h-[46px] shrink-0 border rounded-xl flex items-center justify-center transition-all ${
            selectedTags.length > 0 ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Hash size={20} strokeWidth={2.5} />
        </button>
        <button 
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="w-[46px] h-[46px] shrink-0 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowDownUp size={20} strokeWidth={2.5} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {/* Tags Chips in MyPage */}
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

      {/* Tabs */}
      <div className="px-4 mb-6">
        <div className="flex bg-gray-100/80 rounded-full p-1 border border-black/5 shadow-inner">
          <TabBtn active={activeTab === 'visited'} onClick={() => setActiveTab('visited')} label="行った" />
          <TabBtn active={activeTab === 'want'} onClick={() => setActiveTab('want')} label="行きたい" />
        </div>
      </div>

      {/* Tab Content (Grid) */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 font-bold text-[14px]">
          記録が見つかりません
        </div>
      ) : (
        <div className="px-1 grid grid-cols-2 gap-1 animate-in fade-in duration-500">
          {filteredPosts.map(post => (
            <Link href={`/posts/${post.id}/edit`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
              {post.image_url ? (
                <Image 
                  src={post.image_url} 
                  alt={post.title} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-50 transition-transform duration-500 group-hover:scale-105">
                  <span className="text-4xl opacity-50">🍽️</span>
                </div>
              )}
              {/* Dark gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 pointer-events-none" />
              
              {/* Rating Badge */}
              {post.rating ? (
                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-orange-500 pl-1.5 pr-2 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-0.5 shadow-sm">
                  <span>★</span>{post.rating.toFixed(1)}
                </div>
              ) : null}
              
              {/* Store Name / Date */}
              <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                <span className="text-white font-black text-[14px] leading-tight drop-shadow-md truncate tracking-wide">
                  {post.title}
                </span>
                <span className="text-gray-300 font-medium text-[10px] drop-shadow-md truncate mt-0.5">
                  {post.store_name} • {formatDate(post.visited_at).replace(/-/g, '/')}
                </span>
              </div>
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
      <span className="text-[18px] font-black text-gray-900 leading-none">{count}</span>
      <span className="text-[11px] text-gray-500 font-bold mt-1.5">{label}</span>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-2 text-[13px] font-black rounded-[14px] transition-all duration-300 ${active ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
    </button>
  );
}
