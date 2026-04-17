'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import { PieChart, TrendingUp, MapPin, Star, CalendarDays, Hash } from 'lucide-react';

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPosts({});
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 計算ロジック
  const visitedPosts = posts.filter(p => p.status === 'visited');
  const wantToGoPosts = posts.filter(p => p.status === 'want_to_go');
  
  const avgRating = visitedPosts.length > 0
    ? (visitedPosts.reduce((acc, p) => acc + p.rating, 0) / visitedPosts.length).toFixed(1)
    : '0.0';

  // 月別投稿数 (過去6ヶ月)
  const monthlyData = () => {
    const data: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getMonth() + 1}月`;
      data[monthStr] = 0;
    }
    
    posts.forEach(p => {
      const d = new Date(p.created_at);
      const monthStr = `${d.getMonth() + 1}月`;
      if (data[monthStr] !== undefined) {
        data[monthStr]++;
      }
    });

    const maxVal = Math.max(...Object.values(data), 1);
    return Object.entries(data).map(([label, count]) => ({
      label,
      count,
      height: Math.max((count / maxVal) * 100, 5) // 最低5%の高さ
    }));
  };

  // タグランキング
  const topTags = () => {
    const tagsMap: Record<string, number> = {};
    posts.forEach(p => {
      p.tags?.forEach(t => {
        tagsMap[t.name] = (tagsMap[t.name] || 0) + 1;
      });
    });
    return Object.entries(tagsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const chartData = monthlyData();
  const tagsRank = topTags();

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-in fade-in duration-700">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <PieChart className="text-orange-500" strokeWidth={3} />
            分析
          </h1>
          <p className="text-gray-400 font-bold mt-1">あなたの食事記録から傾向をチェック</p>
        </header>

        {loading ? (
          <div className="space-y-6">
             <div className="h-32 bg-gray-100 rounded-[2rem] animate-pulse"></div>
             <div className="h-64 bg-gray-100 rounded-[2rem] animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* サマリーカード */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-5 rounded-[2rem] shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-white/20 group-hover:scale-110 transition-transform">
                  <MapPin size={80} strokeWidth={3} />
                </div>
                <p className="text-white/80 font-bold text-sm mb-1 relative z-10">総記録スポット</p>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-4xl font-black tracking-tighter">{posts.length}</span>
                  <span className="font-bold text-sm">件</span>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-gray-50 group-hover:scale-110 transition-transform">
                  <Star size={80} strokeWidth={3} />
                </div>
                <p className="text-gray-400 font-bold text-sm mb-1 relative z-10">平均評価</p>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-4xl font-black text-gray-900 tracking-tighter">{avgRating}</span>
                  <span className="text-yellow-400">★</span>
                </div>
              </div>
            </div>

            {/* 月別投稿グラフ */}
            <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h2 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-8">
                <TrendingUp size={18} className="text-blue-500" strokeWidth={3} />
                月別 レポート
              </h2>
              
              <div className="h-40 flex items-end justify-between gap-2 px-2 relative">
                {/* 補助線 */}
                <div className="absolute inset-0 flex flex-col justify-between pt-4 pb-6 pointer-events-none">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full border-t border-dashed border-gray-100"></div>
                  ))}
                </div>

                {chartData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 z-10 group">
                    <div className="w-full bg-gray-50 rounded-t-xl group-hover:bg-blue-50 relative transition-colors h-full flex items-end">
                      <div 
                        className="w-full bg-blue-500 rounded-t-xl transition-all duration-1000 ease-out origin-bottom shadow-sm group-hover:bg-blue-400"
                        style={{ height: `${data.height}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 mt-3">{data.label}</span>
                    <span className="text-[10px] font-black text-gray-800 -translate-y-full opacity-0 group-hover:opacity-100 group-hover:-translate-y-[calc(100%+30px)] absolute transition-all bg-white shadow-sm border border-gray-100 px-2 py-1 rounded-md">
                      {data.count}件
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 人気タグ */}
            <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h2 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-6">
                <Hash size={18} className="text-pink-500" strokeWidth={3} />
                よく使うタグ
              </h2>
              <div className="space-y-4">
                {tagsRank.length > 0 ? tagsRank.map(([tag, count], index) => {
                  const maxCount = tagsRank[0][1];
                  const width = `${Math.max((count / maxCount) * 100, 10)}%`;
                  
                  return (
                    <div key={tag} className="flex flex-col gap-1.5 group">
                      <div className="flex justify-between text-[11px] font-black px-1">
                        <span className="text-gray-700">#{tag}</span>
                        <span className="text-gray-400">{count}回</span>
                      </div>
                      <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-pink-400 to-orange-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width }}
                        ></div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-gray-400 font-bold py-4 text-sm">タグ付けされた記録がまだありません</p>
                )}
              </div>
            </section>

          </div>
        )}
      </main>
    </>
  );
}
