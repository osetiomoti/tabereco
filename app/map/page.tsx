'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post } from '@/lib/types';
import { MapPin, Search, Navigation, Filter } from 'lucide-react';

// Leaflet は `window` を使うため、SSR をオフにして動的インポートする
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});

export default function MapPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number, lng: number }>({ lat: 35.681236, lng: 139.767125 });
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const ownPosts = await getPosts({});
        
        // 所属グループの投稿も取得してマージ
        const groups = await getJoinedGroups();
        const groupPostsArrays = await Promise.all(groups.map(g => getGroupPosts(g.id)));
        const allGroupPosts = groupPostsArrays.flat();
        
        // 重複排除 (自分の投稿を含め1つのMapにまとめる)
        const allPostsMap = new Map();
        ownPosts.forEach(p => allPostsMap.set(p.id, p));
        allGroupPosts.forEach(p => allPostsMap.set(p.id, p));
        
        setPosts(Array.from(allPostsMap.values()));

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log('Location error:', err)
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Unique Tags
  const uniqueTags = Array.from(new Set(posts.flatMap(p => p.tags?.map(t => t.name) || []))).sort();
  
  // Filtered Posts
  const displayedPosts = activeTag 
    ? posts.filter(p => p.tags?.some(t => t.name === activeTag))
    : posts;

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-140px)] flex flex-col gap-6 animate-fade-in">
        {/* 見出しと説明 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 shadow-sm">
                <Navigation size={28} />
              </div>
              タグぐるめ
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium max-w-lg leading-relaxed">
              自分の記録や、グループで共有されているスポットを地図上でチェック。
            </p>
          </div>

          <div className="flex gap-2 max-w-[50%] overflow-x-auto no-scrollbar pb-2">
            <button
               onClick={() => setActiveTag(null)}
               className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest whitespace-nowrap transition-all ${!activeTag ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
               ALL
            </button>
            {uniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${activeTag === tag ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* マップエリア */}
        <div className="flex-1 min-h-[400px] mb-4 relative group">
          {loading ? (
             <div className="w-full h-full bg-gray-50 animate-pulse rounded-3xl flex items-center justify-center border border-gray-100">
               <MapPin className="text-gray-100 animate-bounce" size={48} />
             </div>
          ) : (
            <MapView posts={displayedPosts} center={center} />
          )}
          
          {/* 凡例 (Light Theme) */}
          <div className="absolute bottom-6 left-6 z-[40] bg-white/90 backdrop-blur-xl border border-gray-100 p-5 rounded-[2rem] shadow-2xl flex flex-col gap-3 min-w-[200px] pointer-events-none">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">ピンのステータス</p>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/20" />
              <span className="text-[12px] text-gray-900 font-black">行ったお店 (🏆 達成)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-600 shadow-lg shadow-blue-500/20" />
              <span className="text-[12px] text-gray-900 font-black">これからのお店 (🥗 行きたい)</span>
            </div>
            <div className="h-px bg-gray-100 w-full my-1" />
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold italic">
              ※ 地図上で自分の全記録を<br/>直感的に確認できます。
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
