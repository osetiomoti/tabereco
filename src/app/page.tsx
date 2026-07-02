'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import {
  Map as MapIcon,
  Trophy,
  TrendingUp,
  Heart,
  ChevronRight,
  AlertCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [visitedPosts, setVisitedPosts] = useState<Post[]>([]);
  const [wantToGoPosts, setWantToGoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth & Group state
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('ゲスト');
  const [groupActivities, setGroupActivities] = useState<any[]>([]);
  const [allGroupPosts, setAllGroupPosts] = useState<any[]>([]);
  const [allGroupWantToGo, setAllGroupWantToGo] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // フィードカルーセルのためのステート
  const [feedIndex, setFeedIndex] = useState(0);

  // 「次にどこ行く？」用店舗
  const [nextDestination, setNextDestination] = useState<any | null>(null);

  // ランキングカルーセル用
  const [rankingItems, setRankingItems] = useState<{ tagName: string; post: any }[]>([]);
  const [rankingIndex, setRankingIndex] = useState(0);

  // いいね管理用ステート
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  // 「次にどこ行く？」グループ全員の行きたいリストからランダム
  useEffect(() => {
    const allWantToGo = [...wantToGoPosts, ...allGroupWantToGo];
    if (allWantToGo.length > 0) {
      const randomPost = allWantToGo[Math.floor(Math.random() * allWantToGo.length)];
      setNextDestination(randomPost);
    } else {
      setNextDestination(null);
    }
  }, [wantToGoPosts, allGroupWantToGo]);

  // ランキングカルーセル自動更新
  useEffect(() => {
    if (rankingItems.length === 0) return;
    const timer = setInterval(() => {
      setRankingIndex(prev => (prev + 1) % rankingItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [rankingItems]);

  // フィードカルーセル自動更新
  useEffect(() => {
    if (groupActivities.length <= 1) return;
    const timer = setInterval(() => {
      setFeedIndex(prev => (prev + 1) % groupActivities.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [groupActivities]);

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

        // 2. Fetch current user profile
        const profileRes = await fetch('/api/profiles/me');
        const profileJson = await profileRes.json();
        const myId = profileJson.data?.id || null;
        setMyUserId(myId);
        setUserName(profileJson.data?.name || 'ゲスト');

        // 3. Fetch groups and group posts
        const groupsRes = await fetch('/api/groups');
        const groupsJson = await groupsRes.json();
        const joinedGroups = groupsJson.data || [];

        if (joinedGroups.length > 0 && myId) {
          const activitiesMap = new Map<string, any>();
          const allPostsMap = new Map<string, any>();
          const wantToGoMap = new Map<string, any>();

          await Promise.all(
            joinedGroups.map(async (g: any) => {
              try {
                const r = await fetch(`/api/groups/${g.id}/posts`);
                const j = await r.json();
                const posts = j.data || [];
                posts.forEach((p: any) => {
                  allPostsMap.set(p.id, { ...p, __group_name: g.name });
                  if (p.status === 'want_to_go') {
                    wantToGoMap.set(p.id, { ...p, __group_name: g.name });
                  }
                  // Only show other members' posts as "activities"
                  if (p.user_id !== myId) {
                    activitiesMap.set(p.id, { ...p, __group_name: g.name });
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

          const sortedAllPosts = Array.from(allPostsMap.values()).sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAllGroupPosts(sortedAllPosts);

          const wantToGoList = Array.from(wantToGoMap.values());
          setAllGroupWantToGo(wantToGoList);

          // ランキングデータを取得
          try {
            const rankRes = await fetch('/api/rankings/top');
            if (rankRes.ok) {
              const rankJson = await rankRes.json();
              setRankingItems(rankJson.data || []);
            }
          } catch {}
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

  const stats = {
    total: visitedPosts.length + wantToGoPosts.length,
    visited: visitedPosts.length,
    wantToGo: wantToGoPosts.length
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ja });
    } catch {
      return '';
    }
  };

  const toggleLike = (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedPosts(prev => {
      const isLiked = !prev[postId];
      setLikesCount(cPrev => {
        const current = cPrev[postId] ?? 0;
        return { ...cPrev, [postId]: isLiked ? current + 1 : Math.max(0, current - 1) };
      });
      return { ...prev, [postId]: isLiked };
    });
  };

  const getLikes = (postId: string) => likesCount[postId] ?? 0;

  const currentFeedPost = groupActivities[feedIndex];

  return (
    <div className="bg-gray-50 min-h-screen pb-32 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-gradient-to-tr from-orange-400/10 to-pink-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[6s]" />
      <div className="absolute top-[400px] right-[-100px] w-[300px] h-[300px] bg-gradient-to-br from-blue-400/5 to-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

      <Header title="食べレコ">
        <Link
          href="/posts"
          className="w-10 h-10 bg-white shadow-none text-gray-600 rounded-full flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-all active:scale-95 border border-black/5"
        >
          <TrendingUp size={18} />
        </Link>
      </Header>

      <main className="max-w-md md:max-w-xl mx-auto px-4 pt-6 relative z-10 space-y-6">

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* 1. 挨拶 */}
        <div className="pl-1 animate-in fade-in duration-500">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            こんにちは、{userName}さん！☀️
          </h2>
        </div>

        {/* 2. マイダッシュボード */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 text-left">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                マイダッシュボード <TrendingUp size={18} className="text-orange-500" />
              </h2>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">あなたの毎日の食体験の記録</p>
            </div>
            <div className="flex items-baseline gap-1 bg-orange-50/50 px-3 py-1.5 rounded-2xl border border-orange-100/30">
              <span className="text-xl font-black text-orange-500">{stats.total}</span>
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">件</span>
            </div>
          </div>

          {(() => {
            const progress = stats.total > 0 ? (stats.visited / stats.total) * 100 : 0;
            return (
              <div className="relative w-full bg-gray-100/80 h-3.5 rounded-full mb-6 flex shadow-inner pr-3 overflow-visible">
                <div
                  style={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-l-full transition-all duration-1000"
                />
                <div
                  style={{ left: `calc(${progress}% - 14px)` }}
                  className="absolute top-1/2 -translate-y-1/2 text-lg z-10 transition-all duration-1000 ease-out select-none"
                >
                  😋
                </div>
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-orange-100 rounded-full flex items-center justify-center shadow-none z-10 text-[13px] select-none">
                  🍴
                </div>
              </div>
            );
          })()}

          <div className="flex justify-around items-center text-center">
            <div>
              <div className="text-[10px] font-black text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" /> 行った
              </div>
              <div className="text-base font-black text-gray-800">{stats.visited} <span className="text-[10px] text-gray-400">店</span></div>
            </div>
            <div className="w-px h-6 bg-gray-100" />
            <div>
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> 行きたい
              </div>
              <div className="text-base font-black text-gray-800">{stats.wantToGo} <span className="text-[10px] text-gray-400">店</span></div>
            </div>
          </div>
        </div>

        {/* 3. クイックメニュー (記録を追加するを削除) */}
        <div className="grid grid-cols-3 gap-3">
          {/* マップから探す */}
          <Link
            href="/map"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-2">
              <MapIcon size={16} />
            </div>
            <span className="text-xs">マップ</span>
          </Link>

          {/* カレンダーで見る */}
          <Link
            href="/calendar"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mb-2">
              <Calendar size={16} />
            </div>
            <span className="text-xs">カレンダー</span>
          </Link>

          {/* タイムライン */}
          <Link
            href="/posts"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center mb-2">
              <TrendingUp size={16} />
            </div>
            <span className="text-xs">タイムライン</span>
          </Link>
        </div>

        {/* 4. ランキング (大きく表示 + カルーセル) */}
        <Link href="/rankings" className="block">
          <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-red-500 rounded-3xl p-5 text-white relative overflow-hidden active:scale-[0.99] transition-all">
            {/* Background decoration */}
            <div className="absolute top-[-30px] right-[-30px] w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute bottom-[-20px] right-[40px] w-20 h-20 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trophy size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-white">ランキング</h3>
                  <p className="text-[10px] text-white/70 font-bold">タグ別のお気に入りランキング</p>
                </div>
                <ChevronRight size={18} className="text-white/60 ml-auto" />
              </div>

              {/* Carousel */}
              {rankingItems.length > 0 ? (
                <div key={rankingIndex} className="flex items-center gap-3 bg-white/15 rounded-2xl p-3 animate-in fade-in duration-500">
                  <div className="text-2xl">🥇</div>
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/20">
                    {rankingItems[rankingIndex]?.post?.image_url || rankingItems[rankingIndex]?.post?.image_urls?.[0] ? (
                      <img
                        src={rankingItems[rankingIndex]?.post?.image_url || rankingItems[rankingIndex]?.post?.image_urls?.[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white/70">#{rankingItems[rankingIndex]?.tagName} 1位</p>
                    <p className="text-[13px] font-black text-white truncate">
                      {rankingItems[rankingIndex]?.post?.store_name || rankingItems[rankingIndex]?.post?.title}
                    </p>
                    <p className="text-[9px] text-white/60 font-bold">
                      {rankingItems[rankingIndex]?.post?.user?.name || ''} さんのランキング
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/15 rounded-2xl p-3">
                  <Sparkles size={20} className="text-white/80" />
                  <div>
                    <p className="text-[11px] font-black text-white/80">タグをつけてランキングを作ろう！</p>
                    <p className="text-[10px] text-white/50 font-bold">投稿にタグを追加するとランキングが表示されます</p>
                  </div>
                </div>
              )}

              {rankingItems.length > 1 && (
                <div className="flex justify-center gap-1 mt-3">
                  {rankingItems.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === rankingIndex ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* 5. 「次にどこ行く？」グループ全員の行きたいリストから */}
        <Link
          href={
            nextDestination && nextDestination.latitude !== null && nextDestination.longitude !== null
              ? `/map?lat=${nextDestination.latitude}&lng=${nextDestination.longitude}&postId=${nextDestination.id}`
              : '/map'
          }
          className="bg-white border border-gray-100 rounded-3xl p-5 shadow-none transition-all hover:bg-gray-50/40 block active:scale-[0.99] text-left"
        >
          <div className="flex items-center gap-2 mb-3.5 pl-1">
            <span className="text-lg">🗺️</span>
            <h3 className="text-[14px] font-black text-gray-800">「次にどこ行く？」</h3>
            <span className="text-[9px] bg-pink-50 text-pink-600 font-bold px-2 py-0.5 rounded-full ml-auto border border-pink-100/30">
              マップで確認
            </span>
          </div>

          <div className="flex gap-4 items-center">
            {/* Mini map SVG */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-emerald-50/50 border border-gray-100 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <rect x="8" y="8" width="35" height="35" rx="6" fill="#D1FAE5" />
                <rect x="55" y="55" width="35" height="35" rx="6" fill="#D1FAE5" />
                <path d="M 0,75 Q 35,65 50,85 T 100,75" stroke="#E0F2FE" strokeWidth="8" fill="none" />
                <path d="M 0,75 Q 35,65 50,85 T 100,75" stroke="#BAE6FD" strokeWidth="4" fill="none" strokeLinecap="round" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="#FFFFFF" strokeWidth="5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#FFFFFF" strokeWidth="5" />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-bounce whitespace-nowrap">
                  行きたい
                </div>
                <div className="w-2 h-2 bg-pink-500 rounded-full border border-white -mt-0.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {nextDestination ? (
                <>
                  <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/50">
                    📌 {nextDestination.user?.name || nextDestination.__group_name ? `${nextDestination.user?.name || 'みんな'}の行きたいリストから` : '行きたいリストから'}
                  </span>
                  <h4 className="text-[13px] font-black text-gray-800 truncate mt-1.5">
                    『{nextDestination.store_name || nextDestination.title}』
                  </h4>
                  <p className="text-[11px] text-gray-400 font-bold mt-1 line-clamp-2">
                    {nextDestination.comment || '次のグルメ旅の目的地に登録されました！'}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/50">
                    📌 行きたいリストに追加しよう
                  </span>
                  <h4 className="text-[13px] font-black text-gray-800 truncate mt-1.5">
                    まだ行きたいお店がありません
                  </h4>
                  <p className="text-[11px] text-gray-400 font-bold mt-1">
                    投稿で「行きたい」を記録すると表示されます
                  </p>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* 6. みんなのごちそうフィード (カルーセル) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-none text-left">
          <div className="flex items-center gap-2 mb-4 pl-1">
            <span className="text-lg">📷</span>
            <h3 className="text-[14px] font-black text-gray-800">みんなのごちそうフィード</h3>
            {groupActivities.length > 1 && (
              <div className="flex gap-1 ml-auto">
                {groupActivities.slice(0, Math.min(groupActivities.length, 5)).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFeedIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === feedIndex ? 'bg-orange-400 w-3' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {loadingActivities ? (
            <div className="w-full h-52 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
          ) : groupActivities.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-2xl p-6 text-center">
              <p className="text-gray-400 font-medium text-xs">グループメンバーの最近の投稿はありません</p>
              <p className="text-[10px] text-gray-300 font-bold mt-1">他のメンバーが投稿を記録するとここに表示されます</p>
            </div>
          ) : currentFeedPost ? (
            <div
              key={feedIndex}
              className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/40 p-3 animate-in fade-in duration-500"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  onClick={() => router.push(`/mypage?userId=${currentFeedPost.user_id}`)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-inner cursor-pointer"
                >
                  {currentFeedPost.user?.name ? currentFeedPost.user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4
                    onClick={() => router.push(`/mypage?userId=${currentFeedPost.user_id}`)}
                    className="text-xs font-black text-gray-800 cursor-pointer hover:underline"
                  >
                    {currentFeedPost.user?.name || 'メンバー'}
                  </h4>
                  <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                    {currentFeedPost.__group_name || '共有グループ'}
                  </span>
                </div>
                <span className="text-[8px] text-gray-400 font-bold ml-auto">
                  {currentFeedPost.created_at ? formatTime(currentFeedPost.created_at) : ''}
                </span>
              </div>

              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-100 mb-2 border border-gray-200/40">
                {currentFeedPost.image_url || (currentFeedPost.image_urls && currentFeedPost.image_urls.length > 0) ? (
                  <img
                    src={currentFeedPost.image_url || currentFeedPost.image_urls[0]}
                    alt={currentFeedPost.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50/50">
                    <span className="text-3xl opacity-30">🍽️</span>
                  </div>
                )}
              </div>

              <div className="px-1 py-1">
                <p className="text-[11px] text-gray-600 font-bold leading-normal">
                  <span className="font-black text-gray-800 mr-1.5">{currentFeedPost.user?.name || 'メンバー'}:</span>
                  {currentFeedPost.comment || '美味しいお店を見つけました！'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100/60 pt-2.5 mt-2 px-1">
                <button
                  onClick={(e) => toggleLike(currentFeedPost.id, e)}
                  className={`flex items-center gap-1.5 text-[10px] font-black transition-all ${
                    likedPosts[currentFeedPost.id] ? 'text-pink-500 scale-105' : 'text-gray-400 hover:text-pink-500'
                  }`}
                >
                  <Heart size={14} className={`transition-transform duration-300 ${likedPosts[currentFeedPost.id] ? 'fill-pink-500 scale-110' : ''}`} />
                  <span>食べたそう！ ({getLikes(currentFeedPost.id)})</span>
                </button>
                <Link href={`/posts/${currentFeedPost.id}`} className="text-[9px] font-black text-orange-500 hover:underline">
                  詳細を見る →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

      </main>
    </div>
  );
}
