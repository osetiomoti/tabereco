'use client';

import { useState } from 'react';
import { PostCard, FilterChips } from '@/components/PostCard';
import { UtensilsCrossed } from 'lucide-react';
import type { Post } from '@/lib/types';

// 画像3に基づいたモック投稿データ
const MOCK_POSTS: Post[] = [
  {
    id: 'p1', user_id: 'dev', title: 'ディズニー', store_name: 'ディズニーランド', comment: '',
    rating: 5, image_url: 'https://images.unsplash.com/photo-1544085311-11a028465b0c?q=80&w=300&h=300&auto=format&fit=crop',
    visited_at: '2026-03-28', created_at: '', status: 'visited', is_public: true, is_favorite: true,
    google_place_id: null, address: null, latitude: null, longitude: null,
    tags: [{ id: 't1', user_id: 'dev', name: '旅行', sort_order: 0, created_at: '' }]
  },
  {
    id: 'p2', user_id: 'dev', title: 'カフェ巡りをする', store_name: '', comment: '',
    rating: 4, image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=300&h=300&auto=format&fit=crop',
    visited_at: '2026-04-01', created_at: '', status: 'visited', is_public: true, is_favorite: false,
    google_place_id: null, address: null, latitude: null, longitude: null,
    tags: [{ id: 't1', user_id: 'dev', name: '旅行', sort_order: 0, created_at: '' }]
  },
  {
    id: 'p3', user_id: 'dev', title: '釣りに挑戦', store_name: '海釣り公園', comment: '',
    rating: 3, image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=300&h=300&auto=format&fit=crop',
    visited_at: '2026-03-15', created_at: '', status: 'visited', is_public: true, is_favorite: false,
    google_place_id: null, address: null, latitude: null, longitude: null,
    tags: [{ id: 't2', user_id: 'dev', name: '海', sort_order: 0, created_at: '' }]
  },
  {
    id: 'p4', user_id: 'dev', title: '遊園地でジェットコースターに乗る', store_name: '富士急ハイランド', 
    comment: 'パートナーが大好きなやつ。サプライズで連れて行きたい。',
    rating: 5, image_url: 'https://images.unsplash.com/photo-1513889959010-6534575f29e5?q=80&w=300&h=300&auto=format&fit=crop',
    visited_at: '2026-06-13', created_at: '', status: 'want_to_go', is_public: true, is_favorite: false,
    google_place_id: null, address: null, latitude: null, longitude: null,
    tags: [{ id: 't1', user_id: 'dev', name: '旅行', sort_order: 0, created_at: '' }]
  }
];

export default function DevPostListPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<any>({
    tag: '海',
    period: '今年'
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col items-center">
           <span className="px-4 py-1 bg-blue-50 text-blue-500 rounded-full text-xs font-black tracking-widest uppercase mb-4 shadow-sm border border-blue-100">
            List UI Verification
          </span>
          <h1 className="text-2xl font-black text-gray-900">画像3 のリスト表示</h1>
        </header>

        {/* フィルタチップ (画像3再現) */}
        <FilterChips 
          filters={filters} 
          onRemove={(key) => {
            const next = { ...filters };
            delete next[key];
            setFilters(next);
          }} 
        />

        {/* タブナビゲーション (画像3再現) */}
        <div className="flex border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'すべて', icon: '✨' },
            { id: 'upcoming', label: 'これから 📝', icon: '📝' },
            { id: 'achieved', label: '達成済み 🏆', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-2 text-sm font-black whitespace-nowrap relative transition-all ${
                activeTab === tab.id ? 'text-pink-500' : 'text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* リスト表示 */}
        <div className="space-y-4">
          {MOCK_POSTS.map(post => (
            <PostCard key={post.id} post={post} layout="horizontal" />
          ))}
        </div>

        <div className="mt-16 p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 text-center">
           <UtensilsCrossed className="mx-auto text-gray-200 mb-3" size={32} />
           <p className="text-gray-400 text-xs font-bold leading-relaxed">
             お気に入り（ピンマーク）や達成済み（チェックボタン）など、<br/>
             画像3のディテールが再現されているかご確認ください。
           </p>
        </div>
      </div>
    </div>
  );
}
