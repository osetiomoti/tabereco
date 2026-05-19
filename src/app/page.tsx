'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Filter,
  Calendar,
  Sparkles,
  RotateCw,
  Users,
  Star,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function HomePage() {
  const [visitedPosts, setVisitedPosts] = useState<Post[]>([]);
  const [wantToGoPosts, setWantToGoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Group state
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [groupActivities, setGroupActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Gacha state
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningPost, setSpinningPost] = useState<Post | null>(null);
  const [gachaResult, setGachaResult] = useState<Post | null>(null);

  // All own posts combined
  const allOwnPosts = useMemo(() => {
    return [...visitedPosts, ...wantToGoPosts];
  }, [visitedPosts, wantToGoPosts]);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        setLoading(true);
        setLoadingActivities(true);

        // 1. Fetch own posts
        const [visited, wantToGo] = await Promise.all([
          getPosts({ status: 'visited' }),
          getPosts({ status: 'want_to_go' })
        ]);
        setVisitedPosts(Array.isArray(visited) ? visited : []);
        setWantToGoPosts(Array.isArray(wantToGo) ? wantToGo : []);

        // 2. Fetch current user profile to get own ID
        const profileRes = await fetch('/api/profile');
        const profileJson = await profileRes.json();
        const myId = profileJson.data?.id || null;
        setMyUserId(myId);

        // 3. Fetch groups and group posts
        const groupsRes = await fetch('/api/groups');
        const groupsJson = await groupsRes.json();
        const joinedGroups = groupsJson.data || [];

        if (joinedGroups.length > 0 && myId) {
          const activitiesMap = new Map<string, any>();
          
          await Promise.all(
            joinedGroups.map(async (g: any) => {
              try {
                const r = await fetch(`/api/groups/${g.id}/posts`);
                const j = await r.json();
                const posts = j.data || [];
                posts.forEach((p: any) => {
                  // Only show other members' posts as "activities"
                  if (p.user_id !== myId) {
                    activitiesMap.set(p.id, {
                      ...p,
                      __group_name: g.name,
                    });
                  }
                });
              } catch (e) {
                console.error(`Failed to load posts for group ${g.id}:`, e);
              }
            })
          );

          const sortedActivities = Array.from(activitiesMap.values()).sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setGroupActivities(sortedActivities);
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
        setLoadingActivities(false);
      }
    }
    loadData();
  }, []);

  // Spin Gacha
  const spinGacha = () => {
    if (allOwnPosts.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setGachaResult(null);
    
    let counter = 0;
    const intervalTime = 85; // 0.085 sec
    const totalDuration = 1200; // 1.2 sec
    const steps = totalDuration / intervalTime;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * allOwnPosts.length);
      setSpinningPost(allOwnPosts[randomIndex]);
      counter++;

      if (counter >= steps) {
        clearInterval(interval);
        
        // Final selection
        const finalIndex = Math.floor(Math.random() * allOwnPosts.length);
        const finalPost = allOwnPosts[finalIndex];
        setGachaResult(finalPost);
        setSpinningPost(null);
        setIsSpinning(false);
      }
    }, intervalTime);
  };

  const stats = {
    total: visitedPosts.length + wantToGoPosts.length,
    visited: visitedPosts.length,
    wantToGo: wantToGoPosts.length
  };

  // Helper to get time distance safely
  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ja });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32 relative overflow-hidden">
      {/* Premium Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-gradient-to-tr from-orange-400/10 to-pink-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[6s]" />
      <div className="absolute top-[400px] right-[-100px] w-[300px] h-[300px] bg-gradient-to-br from-blue-400/5 to-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

      <Header title="MoguReco">
        <Link
          href="/posts"
          className="w-10 h-10 bg-white shadow-sm text-gray-600 rounded-full flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-all active:scale-95 border border-black/5"
        >
          <Filter size={18} />
        </Link>
      </Header>
      
      <main className="max-w-2xl mx-auto px-5 pt-6 relative z-10">
        
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Premium Dashboard Summary */}
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-gray-100/80 mb-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                マイダッシュボード <TrendingUp size={18} className="text-orange-500" />
              </h2>
              <p className="text-[12px] text-gray-400 font-bold mt-0.5">あなたの毎日の食体験の記録</p>
            </div>
            <div className="flex items-baseline gap-1 bg-orange-50 px-3 py-1.5 rounded-2xl border border-orange-100/50 shadow-inner">
              <span className="text-2xl font-black text-orange-500">{stats.total}</span>
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">件</span>
            </div>
          </div>

          {/* Simple Ratio Progress Bar */}
          <div className="w-full bg-gray-100/80 h-3.5 rounded-full mb-6 overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${stats.total > 0 ? (stats.visited / stats.total) * 100 : 50}%` }}
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-l-full transition-all duration-1000"
            />
            <div 
              style={{ width: `${stats.total > 0 ? (stats.wantToGo / stats.total) * 100 : 50}%` }}
              className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-r-full transition-all duration-1000"
            />
          </div>

          <div className="flex justify-around items-center text-center">
            <div>
              <div className="text-[11px] font-black text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1 justify-center">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> 行った
              </div>
              <div className="text-lg font-black text-gray-800">{stats.visited} <span className="text-[11px] text-gray-400">店</span></div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <div className="text-[11px] font-black text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1 justify-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 行きたい
              </div>
              <div className="text-lg font-black text-gray-800">{stats.wantToGo} <span className="text-[11px] text-gray-400">店</span></div>
            </div>
          </div>
        </div>

        {/* Quick Grid Navigation */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link 
            href="/posts/new"
            className="flex flex-col items-start p-4 bg-gradient-to-br from-orange-500 to-pink-500 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 active:scale-[0.97] transition-all hover:brightness-105"
          >
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Plus size={20} strokeWidth={3} />
            </div>
            <span className="text-sm">記録を追加する</span>
            <span className="text-[10px] text-white/80 font-medium mt-1">写真や評価を登録</span>
          </Link>

          <Link 
            href="/map"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-sm active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-3">
              <MapIcon size={18} />
            </div>
            <span className="text-sm">マップから探す</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">ピンやタグで検索</span>
          </Link>

          <Link 
            href="/calendar"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-sm active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-3">
              <Calendar size={18} />
            </div>
            <span className="text-sm">カレンダーで見る</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">日付ごとの思い出</span>
          </Link>

          <Link 
            href="/rankings"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-sm active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center mb-3">
              <Trophy size={18} />
            </div>
            <span className="text-sm">マイランキング</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">お気に入りを順位付け</span>
          </Link>
        </div>

        {/* 🎲 今日の一皿ガチャ (Gacha Section) */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4 pl-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <h3 className="text-[15px] font-black text-gray-800">今日のご飯ガチャ</h3>
            <span className="text-[10px] bg-orange-500 text-white font-black px-2 py-0.5 rounded-full ml-1">FUN</span>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            {/* Spinning/Idle UI */}
            {!gachaResult ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                {isSpinning ? (
                  <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 animate-spin border-4 border-dashed border-orange-500 mx-auto" />
                    <div className="text-lg font-black text-orange-500 tracking-wide animate-pulse">
                      {spinningPost ? (spinningPost.store_name || spinningPost.title) : 'シャッフル中...'}
                    </div>
                    <p className="text-[11px] text-gray-400 font-bold">何が選ばれるかお楽しみに！</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-3xl">🎲🍜</div>
                    <div>
                      <p className="text-sm font-black text-gray-800">今日のご飯に迷っていませんか？</p>
                      <p className="text-[11px] text-gray-400 font-bold mt-1">登録済みの「行った・行きたい」お店から1件をランダム提案！</p>
                    </div>
                    <button
                      onClick={spinGacha}
                      disabled={allOwnPosts.length === 0}
                      className={`px-6 py-2.5 rounded-full font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 mx-auto ${
                        allOwnPosts.length === 0 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                          : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:brightness-105 shadow-orange-500/10'
                      }`}
                    >
                      <RotateCw size={14} className={isSpinning ? 'animate-spin' : ''} />
                      <span>ガチャを回す ({allOwnPosts.length}店舗が対象)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Success / Result UI */
              <div className="animate-in zoom-in duration-300 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    <div>
                      <h4 className="text-[14px] font-black text-gray-800">今日のオススメはここ！</h4>
                      <p className="text-[9px] text-orange-400 font-black tracking-widest uppercase mt-0.5">MATCHED RESULT</p>
                    </div>
                  </div>
                  <button
                    onClick={spinGacha}
                    className="text-[11px] font-black text-orange-500 hover:text-orange-600 flex items-center gap-1 hover:bg-orange-50 px-2.5 py-1 rounded-xl transition-all"
                  >
                    <RotateCw size={11} />
                    もう一度引く
                  </button>
                </div>

                <div className="flex gap-4 items-start bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  {/* Thumbnail */}
                  <div className="w-18 h-18 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-gray-200/50">
                    {gachaResult.image_url || (gachaResult.image_urls && gachaResult.image_urls.length > 0) ? (
                      <img 
                        src={gachaResult.image_url || gachaResult.image_urls[0]} 
                        alt={gachaResult.store_name || gachaResult.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={20} className="text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        gachaResult.status === 'visited' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {gachaResult.status === 'visited' ? '行った' : '行きたい'}
                      </span>
                      {gachaResult.rating > 0 && (
                        <div className="flex items-center gap-0.5 text-xs text-amber-500 font-black">
                          <Star size={12} fill="currentColor" />
                          <span>{gachaResult.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <h5 className="text-[13px] font-black text-gray-800 truncate">{gachaResult.store_name || gachaResult.title}</h5>
                    <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{gachaResult.comment || 'コメントはありません'}</p>
                    
                    {/* Tags */}
                    {gachaResult.tags && gachaResult.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {gachaResult.tags.slice(0, 2).map((t: any) => (
                          <span key={t.id || t.name} className="text-[9px] font-bold text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/posts/${gachaResult.id}`}
                  className="w-full flex items-center justify-center gap-1 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
                >
                  <span>店舗詳細を見る</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 👥 みんなのメシ (Group Activity Section) */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4 pl-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <Users size={16} />
            </div>
            <h3 className="text-[15px] font-black text-gray-800">みんなの最近のメシ</h3>
            <span className="text-[10px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full ml-1">GROUP</span>
          </div>

          {loadingActivities ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="w-full h-20 bg-white animate-pulse rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : groupActivities.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-3xl p-6 text-center">
              <p className="text-gray-400 font-medium text-xs">グループメンバーの最近の投稿はありません</p>
              <p className="text-[10px] text-gray-300 font-bold mt-1">共有グループを作成・参加するとここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupActivities.slice(0, 3).map((act) => (
                <Link
                  key={act.id}
                  href={`/posts/${act.id}`}
                  className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99]"
                >
                  <div className="flex gap-3 items-start">
                    {/* Member Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-inner shrink-0">
                      {act.user?.name ? act.user.name[0].toUpperCase() : 'U'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-gray-800">{act.user?.name || 'ゲスト'}</span>
                          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            {act.__group_name}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold">{formatTime(act.created_at)}</span>
                      </div>

                      <div className="text-[11px] text-gray-400 font-bold mb-1">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black mr-1 ${
                          act.status === 'visited' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                        }`}>
                          {act.status === 'visited' ? '行った' : '行きたい'}
                        </span>
                        {act.store_name || act.title}
                      </div>

                      {act.comment && (
                        <p className="text-[12px] text-gray-600 font-medium line-clamp-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          {act.comment}
                        </p>
                      )}
                    </div>

                    {/* Miniature thumbnail if image exists */}
                    {(act.image_url || (act.image_urls && act.image_urls.length > 0)) && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200/50 bg-gray-100">
                        <img 
                          src={act.image_url || act.image_urls[0]} 
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Want to go Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4 pl-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <Compass size={16} />
            </div>
            <h3 className="text-[15px] font-black text-gray-800">マイ行きたいお店</h3>
            <span className="ml-auto text-xs font-bold text-gray-400">{stats.wantToGo}件</span>
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2].map(i => (
                <div key={i} className="min-w-[220px] h-[180px] bg-white animate-pulse rounded-3xl border border-gray-100 shrink-0" />
              ))}
            </div>
          ) : wantToGoPosts.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-3xl p-8 text-center shadow-sm">
              <p className="text-gray-400 font-medium text-xs">まだ登録されていません</p>
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
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-4 pl-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 shadow-sm">
              <Trophy size={16} />
            </div>
            <h3 className="text-[15px] font-black text-gray-800">マイ最近行ったお店</h3>
            <span className="ml-auto text-xs font-bold text-gray-400">{stats.visited}件</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-24 bg-white animate-pulse rounded-3xl border border-gray-100" />
              ))}
            </div>
          ) : visitedPosts.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-3xl p-8 text-center shadow-sm">
              <p className="text-gray-400 font-medium text-xs">記録を追加してみましょう</p>
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

