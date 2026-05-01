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
  Star,
  Filter
} from 'lucide-react';
import { FloatingActionButton } from '@/components/FloatingActionButton';

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
      <Header title="ホーム">
        <Link
          href="/posts"
          className="w-9 h-9 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-all"
        >
          <Filter size={18} />
        </Link>
      </Header>
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 min-h-screen overflow-x-hidden">
        
        {/* プレミアム・統計サマリー (クリーン版) */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide snap-x" style={{ minHeight: 86 }}>
          {loading ? (
            <>
              <div className="flex-shrink-0 w-[110px] h-[86px] bg-gray-50 animate-pulse rounded-[1.5rem] border border-gray-100" />
              <div className="flex-shrink-0 w-[110px] h-[86px] bg-gray-50 animate-pulse rounded-[1.5rem] border border-gray-100" />
              <div className="flex-shrink-0 w-[110px] h-[86px] bg-gray-50 animate-pulse rounded-[1.5rem] border border-gray-100" />
            </>
          ) : (
            <>
              <div className="flex-shrink-0 w-[110px] bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md snap-start">
                <span className="text-[10px] font-black text-gray-400 mb-1">合計記録</span>
                <span className="text-2xl font-black text-gray-800">{stats.total}</span>
              </div>
              <div className="flex-shrink-0 w-[110px] bg-orange-50 border border-orange-100 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md snap-start">
                <span className="text-[10px] font-black text-orange-400 mb-1">お気に入り</span>
                <span className="text-2xl font-black text-orange-500">{stats.favorites}</span>
              </div>
              <div className="flex-shrink-0 w-[110px] bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md snap-start">
                <span className="text-[10px] font-black text-gray-400 mb-1">今月の新規</span>
                <span className="text-2xl font-black text-blue-500">{stats.thisMonth}</span>
              </div>
            </>
          )}
        </div>

        {/* ヒーローセクション/クイックリンク */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link 
            href="/map"
            className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-orange-500 to-orange-400 rounded-[2rem] text-white shadow-lg shadow-orange-500/10 hover:-translate-y-1 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform">
              <MapIcon size={20} />
            </div>
            <span className="font-bold text-sm">マップで探す</span>
          </Link>
          <Link 
            href="/posts/new"
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-100 rounded-[2rem] text-gray-800 shadow-md shadow-gray-200/30 hover:-translate-y-1 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-2 text-orange-500 group-hover:rotate-12 transition-transform">
              <Plus size={22} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm">食事を記録</span>
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
            <div className="flex gap-4 overflow-x-hidden" style={{ minHeight: 192 }}>
              {[1, 2].map(i => (
                <div key={i} className="min-w-[240px] h-48 bg-gray-50 animate-pulse rounded-[2rem] flex-shrink-0" />
              ))}
            </div>
          ) : wantToGoPosts.length === 0 ? (
            <div className="bg-blue-50/50 border border-blue-100/50 rounded-[2.5rem] p-10 text-center">
              <p className="text-blue-400 text-sm font-bold">次はどこに行きますか？</p>
              <p className="text-gray-300 text-[10px] mt-1 italic">気になるお店を保存してみましょう</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide items-stretch">
              {wantToGoPosts.slice(0, 5).map(post => (
                <div key={post.id} className="w-[180px] sm:w-[200px] flex-shrink-0">
                  <PostCard post={post} layout="compact" />
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
            <div className="space-y-4" style={{ minHeight: 240 }}>
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
      <FloatingActionButton />
    </>
  );
}
