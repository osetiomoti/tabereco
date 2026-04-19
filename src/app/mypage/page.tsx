'use client';

import { useState, useEffect } from 'react';
import { Settings, Search, Hash, ArrowDownUp, MapPin, Calendar, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<'visited' | 'want' | 'collection'>('visited');
  
  // ダミーデータ（本来はAPIから取得）
  const stats = {
    visited: 2,
    want: 0,
    collections: 0,
    friends: 1
  };
  
  const dummyPosts = [
    {
      id: '1',
      store_name: 'いしやま屋',
      rating: 3.5,
      image_url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '2',
      store_name: '一蘭 岡崎店',
      rating: 2.5,
      image_url: 'https://images.unsplash.com/photo-1558985250-27a406d64cb3?auto=format&fit=crop&q=80&w=600',
    }
  ];

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      {/* Header */}
      <header className="relative flex items-center justify-center h-14 bg-white px-4">
        <h1 className="font-black text-lg">OO</h1>
        <Link href="/settings" className="absolute right-4 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Settings size={22} className="text-gray-700" />
        </Link>
      </header>

      {/* Profile Info */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="relative">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
            <UserPlaceholder />
          </div>
          <button className="absolute bottom-0 right-0 w-6 h-6 bg-[#634e45] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
        
        <div className="flex-1 flex justify-around ml-4 mt-2">
          <StatBox count={stats.visited} label="行った" />
          <StatBox count={stats.want} label="行きたい" />
          <StatBox count={stats.collections} label="まとめ" />
          <StatBox count={stats.friends} label="ともだち" />
        </div>
      </div>

      {/* New record button (A. Request) */}
      <div className="px-4 mb-8">
        <Link 
          href="/posts/new"
          className="w-full py-4.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-98 transition-all"
        >
          <div className="p-1 bg-white/20 rounded-lg">
             <Plus size={24} strokeWidth={3} />
          </div>
          <span>新しく記録する</span>
        </Link>
      </div>

      {/* Filter Row */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800" strokeWidth={2.5} />
          <input 
            className="w-full bg-white border border-gray-200 py-2.5 pl-10 pr-3 rounded-xl text-[13px] font-bold placeholder:text-gray-500 shadow-sm focus:outline-none"
            placeholder="記録したお店を検索"
          />
        </div>
        <FilterBtn icon={<Hash size={18} />} />
        <FilterBtn icon={<ArrowDownUp size={18} />} />
        <FilterBtn icon={<MapPin size={18} />} />
        <FilterBtn icon={<Calendar size={18} />} />
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100/80 rounded-full p-1">
          <TabBtn active={activeTab === 'visited'} onClick={() => setActiveTab('visited')} label="行った" />
          <TabBtn active={activeTab === 'want'} onClick={() => setActiveTab('want')} label="行きたい" />
          <TabBtn active={activeTab === 'collection'} onClick={() => setActiveTab('collection')} label="まとめ" />
        </div>
      </div>

      {/* Tab Content (Grid) */}
      <div className="px-1 grid grid-cols-2 gap-[2px]">
        {activeTab === 'visited' && dummyPosts.map(post => (
          <div key={post.id} className="relative aspect-square bg-gray-100 group overflow-hidden cursor-pointer">
            <Image 
              src={post.image_url} 
              alt={post.store_name} 
              fill 
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Dark gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
            
            {/* Rating Badge */}
            <div className="absolute top-1 left-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-br-lg text-[10px] font-black flex items-center gap-0.5 shadow-sm">
              <span>★</span>{post.rating.toFixed(1)}
            </div>
            
            {/* Store Name */}
            <div className="absolute bottom-2 left-2 right-2 flex">
              <span className="text-white font-bold text-[13px] leading-tight drop-shadow-md truncate">
                {post.store_name}
              </span>
            </div>
          </div>
        ))}
      </div>
      

    </div>
  );
}

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-gray-400" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function StatBox({ count, label }: { count: number, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center relative -top-1">
      <span className="text-[17px] font-black text-gray-900">{count}</span>
      <span className="text-[10px] text-gray-500 font-bold mt-1">{label}</span>
    </div>
  );
}

function FilterBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="w-10 h-10 shrink-0 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-sm">
      {icon}
    </button>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );
}
