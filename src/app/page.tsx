'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PostCard } from '@/components/PostCard';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import { 
  Plus, 
  Map as MapIcon, 
  Trophy, 
  Compass,
  AlertCircle,
  Filter
} from 'lucide-react';

export default function HomePage() {
  const [visitedPosts, setVisitedPosts] = useState<Post[]>([]);
  const [wantToGoPosts, setWantToGoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [visited, wantToGo] = await Promise.all([
          getPosts({ status: 'visited' }),
          getPosts({ status: 'want_to_go' })
        ]);
        setVisitedPosts(Array.isArray(visited) ? visited : []);
        setWantToGoPosts(Array.isArray(wantToGo) ? wantToGo : []);
      } catch (err: any) {
        console.error('Failed to load posts:', err);
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = {
    total: visitedPosts.length + wantToGoPosts.length,
    visited: visitedPosts.length,
    wantToGo: wantToGoPosts.length
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <Header title="Tabereco">
        <Link
          href="/posts"
          className="w-10 h-10 bg-white shadow-sm text-gray-600 rounded-full flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-all active:scale-95"
        >
          <Filter size={18} />
        </Link>
      </Header>
      
      <main className="max-w-2xl mx-auto px-5 pt-8">
        
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-50 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">あなたの食体験</h2>
              <p className="text-sm text-gray-400 font-medium mt-1">すべての記録がここに集まります</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-orange-500">{stats.total}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/posts/new"
              className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>記録する</span>
            </Link>
            <Link 
              href="/map"
              className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-colors"
            >
              <MapIcon size={20} />
              <span>マップを開く</span>
            </Link>
          </div>
        </div>

        {/* Want to go Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5 pl-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
              <Compass size={18} />
            </div>
            <h3 className="text-lg font-black text-gray-800">行きたいお店</h3>
            <span className="ml-auto text-sm font-bold text-gray-400">{stats.wantToGo}件</span>
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2].map(i => (
                <div key={i} className="min-w-[220px] h-[180px] bg-white animate-pulse rounded-3xl border border-gray-100 shrink-0" />
              ))}
            </div>
          ) : wantToGoPosts.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-3xl p-8 text-center">
              <p className="text-gray-400 font-medium text-sm">まだ登録されていません</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 scrollbar-hide snap-x">
              {wantToGoPosts.slice(0, 5).map(post => (
                <div key={post.id} className="w-[220px] shrink-0 snap-start">
                  <PostCard post={post} layout="compact" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Visited Section */}
        <section>
          <div className="flex items-center gap-3 mb-5 pl-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
              <Trophy size={18} />
            </div>
            <h3 className="text-lg font-black text-gray-800">最近行ったお店</h3>
            <span className="ml-auto text-sm font-bold text-gray-400">{stats.visited}件</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-24 bg-white animate-pulse rounded-3xl border border-gray-100" />
              ))}
            </div>
          ) : visitedPosts.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-3xl p-8 text-center">
              <p className="text-gray-400 font-medium text-sm">記録を追加してみましょう</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visitedPosts.slice(0, 5).map(post => (
                <PostCard key={post.id} post={post} layout="horizontal" />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

