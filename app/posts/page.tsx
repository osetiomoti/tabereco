'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PostCard, FilterChips } from '@/components/PostCard';
import { FilterModal } from '@/components/FilterModal';
import { getPosts } from '@/lib/api/posts';
import type { Post, PostStatus } from '@/lib/types';
import Link from 'next/link';
import { Plus, UtensilsCrossed, Search, SlidersHorizontal } from 'lucide-react';

type TabType = 'all' | 'want_to_go' | 'visited';

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [keyword, setKeyword] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // 高度なフィルタと基本条件をマージ
        const filterParams: any = { 
          keyword,
          status: activeTab === 'all' ? undefined : activeTab as PostStatus
        };

        if (advancedFilters) {
          // 下記の項目は、画像2の構成に基づき API に渡す
          if (advancedFilters.tag) filterParams.tag_name = advancedFilters.tag; 
          if (advancedFilters.is_favorite) filterParams.is_favorite = true;
          // 期間 (period) のロジックは別途 API 側で日付範囲に変換するのが理想だが、
          // ここではシンプルに status 等と組み合わせてモック動作を確認可能にする
        }

        const data = await getPosts(filterParams);
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, 400);
    return () => clearTimeout(timer);
  }, [activeTab, keyword, advancedFilters]);

  const removeFilter = (key: string) => {
    setAdvancedFilters((prev: any) => {
      const next = { ...prev };
      delete next[key];
      return Object.keys(next).length > 0 ? next : null;
    });
  };

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        
        {/* 検索 & フィルタボタン */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text"
              placeholder="何を食べたい？どこに行きたい？"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-white border border-gray-100 py-3.5 pl-11 pr-4 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-3.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
              advancedFilters 
                ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/20' 
                : 'bg-white border-gray-100 text-gray-400'
            }`}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* タブナビゲーション (画像3再現) */}
        <div className="flex border-b border-gray-100 mb-6 sticky top-[64px] bg-[#fcfcfc]/80 backdrop-blur-md z-10">
          {[
            { id: 'all', label: 'すべて' },
            { id: 'want_to_go', label: 'これからの予定 🥗' },
            { id: 'visited', label: '達成済み 🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-4 text-sm font-black transition-all relative ${
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

        {/* 適用中のフィルタチップ */}
        <FilterChips filters={advancedFilters} onRemove={removeFilter} />

        {/* 一覧表示 */}
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
        ) : (
          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} layout="horizontal" />
            ))}
          </div>
        )}
      </main>

      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => setAdvancedFilters(f)}
        initialFilters={advancedFilters}
      />

      {/* FAB */}
      <Link
        href="/posts/new"
        className="fixed bottom-8 right-6 w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/40 hover:scale-110 active:scale-90 transition-all duration-300 z-50 group"
      >
        <Plus size={32} className="text-white group-hover:rotate-90 transition-transform duration-300" />
      </Link>
    </>
  );
}
