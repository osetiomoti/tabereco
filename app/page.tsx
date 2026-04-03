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
  UtensilsCrossed, 
  ChevronRight, 
  Trophy, 
  Compass,
  Star
} from 'lucide-react';

export default function HomePage() {
  const [visitedPosts, setVisitedPosts] = useState<Post[]>([]);
  const [wantToGoPosts, setWantToGoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // 統計データの一時計算
  const stats = {
    total: visitedPosts.length + wantToGoPosts.length,
    favorites: visitedPosts.filter(p => p.is_favorite).length + wantToGoPosts.filter(p => p.is_favorite).length,
    thisMonth: visitedPosts.filter(p => {
      const date = new Date(p.visited_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length
  };

  useEffect(() => {
    async function load() {
      try {
        const [visited, wantToGo] = await Promise.all([
          getPosts({ status: 'visited' }),
          getPosts({ status: 'want_to_go' })
        ]);
        setVisitedPosts(visited);
        setWantToGoPosts(wantToGo);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-in fade-in duration-700">
        
        {/* プレミアム・統計サマリー (NEW!) */}
        <div className="grid grid-cols-3 gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="min-w-[110px] bg-white/70 backdrop-blur-xl border border-white/50 p-4 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Total Salmon</span>
            <span className="text-2xl font-black text-orange-500">{stats.total}</span>
          </div>
          <div className="min-w-[110px] bg-gradient-to-br from-pink-500 to-orange-400 p-0.5 rounded-[2rem] shadow-lg shadow-pink-500/10">
            <div className="bg-white/95 rounded-[1.9rem] p-4 flex flex-col items-center justify-center text-center h-full">
              <span className="text-[10px] font-black text-pink-400 uppercase tracking-tighter mb-1">Favorites</span>
              <span className="text-2xl font-black text-pink-500">{stats.favorites}</span>
            </div>
          </div>
          <div className="min-w-[110px] bg-white/70 backdrop-blur-xl border border-white/50 p-4 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">New Spots</span>
            <span className="text-2xl font-black text-blue-500">{stats.thisMonth}</span>
          </div>
        </div>

        {/* ヒーローセクション/クイックリンク */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link 
            href="/map"
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-400 to-pink-500 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
              <MapIcon size={24} />
            </div>
            <span className="font-black text-sm">マップで探す</span>
          </Link>
          <Link 
            href="/posts/new"
            className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-[2.5rem] text-gray-900 shadow-xl shadow-gray-200/50 hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-3 text-orange-500 group-hover:rotate-12 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-black text-sm">食事を記録</span>
          </Link>
        </div>

        {/* 行きたいお店セクション (水平スクロール) */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Compass className="text-blue-500" size={24} />
              行きたいお店 🥗
            </h2>
            <Link href="/posts" className="text-xs font-bold text-gray-400 flex items-center gap-0.5 hover:text-blue-500 transition-colors">
              すべて見る <ChevronRight size={14} />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2].map(i => (
                <div key={i} className="min-w-[240px] h-48 bg-gray-50 animate-pulse rounded-[2rem]" />
              ))}
            </div>
          ) : wantToGoPosts.length === 0 ? (
            <div className="bg-blue-50/50 border border-blue-100/50 rounded-[2.5rem] p-10 text-center">
              <p className="text-blue-400 text-sm font-bold">次はどこに行きますか？</p>
              <p className="text-gray-300 text-[10px] mt-1 italic">気になるお店を保存してみましょう</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
              {wantToGoPosts.slice(0, 5).map(post => (
                <div key={post.id} className="min-w-[260px]">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 行ったお店セクション (リスト) */}
        <section>
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Trophy className="text-orange-500" size={24} />
              最近行ったお店 🏆
            </h2>
            <Link href="/posts" className="text-xs font-bold text-gray-400 flex items-center gap-0.5 hover:text-orange-500 transition-colors">
              すべての履歴 <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : visitedPosts.length === 0 ? (
            <div className="bg-orange-50/30 border border-orange-100/30 rounded-[2.5rem] p-10 text-center">
              <UtensilsCrossed className="text-orange-200 mx-auto mb-3" size={32} />
              <p className="text-orange-400 text-sm font-bold">まだ記録がありません</p>
              <Link href="/posts/new" className="text-orange-500 text-xs font-black underline underline-offset-4 mt-2 inline-block">
                最初の記録を作成
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {visitedPosts.slice(0, 5).map(post => (
                <PostCard key={post.id} post={post} layout="horizontal" />
              ))}
            </div>
          )}
        </section>

      </main>
    </>
  );
}
