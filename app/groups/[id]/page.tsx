'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { getGroupPosts, Group, getJoinedGroups } from '@/lib/api/groups';
import { Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { Users, Map as MapIcon, LayoutList, ChevronLeft, Hash, Copy, CheckCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

// 地図コンポーネントを動的にインポート
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-[3rem] flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-100 animate-bounce" size={48} />
    </div>
  ),
});

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [copied, setCopied] = useState(false);
  const [center, setCenter] = useState<{ lat: number, lng: number }>({ lat: 35.681236, lng: 139.767125 });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // グループ情報の特定
        const joined = await getJoinedGroups();
        const current = joined.find(g => g.id === id);
        if (current) setGroup(current);

        // 共有投稿の取得
        const data = await getGroupPosts(id);
        setPosts(data);

        // 現在地取得
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
  }, [id]);

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-pulse">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4" />
            <div className="h-6 w-48 bg-gray-100 rounded-full mx-auto" />
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
            <p className="text-gray-400 font-bold">グループが見つかりませんでした</p>
            <Link href="/groups" className="text-orange-500 font-black mt-4 inline-block underline">一覧へ戻る</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 animate-in fade-in duration-700">
        <Link href="/groups" className="inline-flex items-center gap-1 text-xs font-black text-gray-400 hover:text-orange-500 transition-colors mb-6 group">
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          BACK TO ALL GROUPS
        </Link>
        
        {/* グループヘッダー */}
        <header className="mb-8 p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                <Hash size={28} strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{group.name}</h1>
                <p className="text-xs text-gray-400 font-bold">{group.description || '美味しいスポットをみんなでシェア！'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
            <span className="text-[10px] font-black text-gray-400 uppercase">Invite Friends:</span>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-gray-50 hover:bg-orange-50 text-[10px] font-black px-4 py-1.5 rounded-full border border-gray-100 transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-600 uppercase">COPIED!</span>
                </>
              ) : (
                <>
                  <Hash size={12} className="text-orange-500" />
                  <span className="text-orange-600">{group.invite_code}</span>
                  <Copy size={12} className="text-gray-300" />
                </>
              )}
            </button>
          </div>
        </header>

        {/* 表示切替コントロール */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}
                >
                    <LayoutList size={14} strokeWidth={3} />
                    LIST
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'map' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}
                >
                    <MapIcon size={14} strokeWidth={3} />
                    MAP
                </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-gray-400">
                <Users size={14} />
                <span>SHARED {posts.length} SPOTS</span>
            </div>
        </div>

        {/* コンテンツエリア */}
        {viewMode === 'map' ? (
          <div className="h-[500px] rounded-[3rem] overflow-hidden border border-gray-100 shadow-2xl animate-in zoom-in duration-500">
            <MapView posts={posts} center={center} />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                <MapPin size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">まだ共有された投稿がありません</p>
                <p className="text-[10px] text-gray-300 uppercase mt-1">仲間を招待して投稿をシェアしよう</p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard key={post.id} post={post} layout="horizontal" />
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
}
