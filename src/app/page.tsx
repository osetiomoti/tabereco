'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import {
  Map as MapIcon,
  Trophy,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  AlertCircle,
  Calendar,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useMyProfile, useMyPosts, useGroupActivities, useTopRankings } from '@/hooks/useAppData';
import { useAppType } from '@/contexts/AppTypeContext';

export default function HomePage() {
  const { appType } = useAppType();
  const router = useRouter();

  // ── SWRキャッシュを利用したデータ取得 ──
  const { profile, isLoading: profileLoading } = useMyProfile();
  const myUserId = profile?.id ?? null;
  const userName = profile?.name ?? 'ゲスト';

  const { visitedPosts, wantToGoPosts, isLoading: postsLoading } = useMyPosts();
  const { groupActivities, allGroupWantToGo, initialLikes, initialCounts, isLoading: activitiesLoading } = useGroupActivities(myUserId);
  const { rankingItems } = useTopRankings();

  const loading = profileLoading || postsLoading;
  const loadingActivities = activitiesLoading;

  // ランキングカルーセル用
  const [rankingIndex, setRankingIndex] = useState(0);

  // いいね管理用ステート（SWRの初期値から初期化）
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  useEffect(() => {
    if (Object.keys(initialLikes).length > 0) {
      setLikedPosts(initialLikes);
      setLikesCount(initialCounts);
    }
  }, [initialLikes, initialCounts]);

  // ランキングカルーセル自動更新
  useEffect(() => {
    if (rankingItems.length === 0) return;
    const timer = setInterval(() => {
      setRankingIndex(prev => (prev + 1) % rankingItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [rankingItems]);

  const error = null; // SWR handles errors internally

  const combinedWantToGo = useMemo(() => {
    const list = [...wantToGoPosts, ...allGroupWantToGo];
    const map = new Map();
    list.forEach(p => map.set(p.id, p));
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [wantToGoPosts, allGroupWantToGo]);

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

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
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
    try {
      await fetch(`/api/posts/${postId}/want-to-go`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const getLikes = (postId: string) => likesCount[postId] ?? 0;

  const [greeting, setGreeting] = useState('こんにちは☀️');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 5) setGreeting('こんばんは🌙');
    else if (hour < 11) setGreeting('おはようございます☀️');
    else if (hour < 17) setGreeting('こんにちは☀️');
    else setGreeting('こんばんは🌙');
  }, []);

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
            {greeting}
            <br />
            <span className="text-orange-500">{userName}</span>さん！
          </h2>
        </div>

        {/* 2. マイダッシュボード */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white shadow-sm text-left relative overflow-hidden">
          {/* subtle glow behind dashboard */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                マイダッシュボード <TrendingUp size={18} className="text-orange-500" style={{ color: 'var(--color-primary)' }} />
              </h2>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">あなたの毎日の{appType === 'tabereco' ? '食体験' : '旅の思い出'}の記録</p>
            </div>
            <div className="flex items-baseline gap-1 bg-white px-3 py-1.5 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--color-primary-50)' }}>
              <span className="text-xl font-black" style={{ color: 'var(--color-primary)' }}>{stats.total}</span>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>件</span>
            </div>
          </div>

          {(() => {
            const progress = stats.total > 0 ? (stats.visited / stats.total) * 100 : 0;
            return (
              <div className="relative w-full bg-gray-100/80 h-3.5 rounded-full mb-6 flex shadow-inner pr-3 overflow-visible">
                <div
                  style={{ width: `${progress}%`, background: 'var(--color-primary)' }}
                  className="h-full rounded-l-full transition-all duration-1000"
                />
                <div
                  style={{ left: `calc(${progress}% - 14px)` }}
                  className="absolute top-1/2 -translate-y-1/2 text-lg z-10 transition-all duration-1000 ease-out select-none"
                >
                  {appType === 'tabereco' ? '😋' : '🎒'}
                </div>
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-7 h-7 bg-white border rounded-full flex items-center justify-center shadow-none z-10 text-[13px] select-none" style={{ borderColor: 'var(--color-primary-50)' }}>
                  {appType === 'tabereco' ? '🍴' : '🚩'}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-around items-center text-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1 justify-center" style={{ color: 'var(--color-primary)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-primary)' }} /> 行った
              </div>
              <div className="text-base font-black text-gray-800">{stats.visited} <span className="text-[10px] text-gray-400">{appType === 'tabereco' ? '店' : '件'}</span></div>
            </div>
            <div className="w-px h-6 bg-gray-100" />
            <div>
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> 行きたい
              </div>
              <div className="text-base font-black text-gray-800">{stats.wantToGo} <span className="text-[10px] text-gray-400">{appType === 'tabereco' ? '店' : '件'}</span></div>
            </div>
          </div>
        </div>

        {/* 3. クイックメニュー */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* タイムライン */}
          <Link
            href="/posts"
            className="flex flex-col items-center p-3 bg-white/70 backdrop-blur-md border border-white rounded-[1.5rem] font-black shadow-sm active:scale-[0.97] transition-all hover:bg-white text-gray-800"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-[12px] flex items-center justify-center mb-2 shadow-sm">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] tracking-wide">タイムライン</span>
          </Link>

          {/* マップから探す */}
          <Link
            href="/map"
            className="flex flex-col items-center p-3 bg-white/70 backdrop-blur-md border border-white rounded-[1.5rem] font-black shadow-sm active:scale-[0.97] transition-all hover:bg-white text-gray-800"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-[12px] flex items-center justify-center mb-2 shadow-sm">
              <MapIcon size={16} />
            </div>
            <span className="text-[10px] tracking-wide">マップ</span>
          </Link>

          {/* カレンダーで見る */}
          <Link
            href="/calendar"
            className="flex flex-col items-center p-3 bg-white/70 backdrop-blur-md border border-white rounded-[1.5rem] font-black shadow-sm active:scale-[0.97] transition-all hover:bg-white text-gray-800"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-[12px] flex items-center justify-center mb-2 shadow-sm">
              <Calendar size={16} />
            </div>
            <span className="text-[10px] tracking-wide">カレンダー</span>
          </Link>

          {/* 統計 */}
          <Link
            href="/stats"
            className="flex flex-col items-center p-3 bg-white/70 backdrop-blur-md border border-white rounded-[1.5rem] font-black shadow-sm active:scale-[0.97] transition-all hover:bg-white text-gray-800"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[12px] flex items-center justify-center mb-2 shadow-sm">
              <BarChart2 size={16} />
            </div>
            <span className="text-[10px] tracking-wide">統計</span>
          </Link>
        </div>

        {/* 4. ランキング (大きく表示 + カルーセル) */}
        <Link href="/rankings" className="block">
          <div className="relative rounded-[2rem] overflow-hidden bg-gray-900 active:scale-[0.98] transition-transform shadow-md h-[220px]">
            {rankingItems.length > 0 && (rankingItems[rankingIndex]?.post?.image_url || rankingItems[rankingIndex]?.post?.image_urls?.[0]) ? (
              <img
                src={rankingItems[rankingIndex].post.image_url || rankingItems[rankingIndex].post.image_urls[0]}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-60 animate-in fade-in duration-700"
                key={`bg-${rankingIndex}`}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-pink-500 to-red-500" />
            )}

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />

            <div className="absolute inset-0 p-5 flex flex-col z-10">
              <div className="flex items-center gap-2 mb-auto">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Trophy size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-white tracking-widest drop-shadow-md">RANKING</h3>
                </div>
                <ChevronRight size={18} className="text-white/80 ml-auto drop-shadow-md" />
              </div>

              {rankingItems.length > 0 ? (
                <div key={rankingIndex} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                  <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black rounded-lg mb-2 border border-white/20 shadow-sm">
                    🥇 #{rankingItems[rankingIndex].tagName} 1位
                  </span>
                  <h4 className="text-[20px] font-black text-white leading-tight mb-1 drop-shadow-md line-clamp-2">
                    {rankingItems[rankingIndex].post.store_name || rankingItems[rankingIndex].post.title}
                  </h4>
                  <p className="text-[11px] text-white/80 font-bold drop-shadow-md">
                    {rankingItems[rankingIndex].post.user?.name || 'ゲスト'} さんのランキング
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-[18px] font-black text-white leading-tight mb-1 drop-shadow-md">
                    タグをつけて<br/>ランキングを作ろう！
                  </h4>
                  <p className="text-[11px] text-white/80 font-bold drop-shadow-md">
                    投稿にタグを追加するとランキングが表示されます
                  </p>
                </div>
              )}

              {rankingItems.length > 1 && (
                <div className="absolute bottom-5 right-5 flex gap-1.5">
                  {rankingItems.map((_: any, i: number) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === rankingIndex ? 'bg-white scale-110' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* 5. 「次にどこ行く？」グループ全員の行きたいリストから */}
        <div className="text-left">
          <div className="flex items-center gap-2 mb-3 pl-2">
            <span className="text-lg">🗺️</span>
            <h3 className="text-[15px] font-black text-gray-800">次にどこ行く？</h3>
            <span className="text-[10px] bg-pink-50 text-pink-600 font-bold px-2 py-0.5 rounded-full ml-auto border border-pink-100/50">
              {combinedWantToGo.length}件の行きたい
            </span>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 -mx-4 px-4 gap-4">
            {combinedWantToGo.length > 0 ? (
              combinedWantToGo.map((post) => (
                <Link
                  key={post.id}
                  href={post.latitude && post.longitude ? `/map?lat=${post.latitude}&lng=${post.longitude}&postId=${post.id}` : '/map'}
                  className="snap-center shrink-0 w-[85%] bg-white/70 backdrop-blur-md border border-white rounded-3xl p-4 shadow-sm active:scale-[0.98] transition-all flex flex-col"
                >
                  <div className="flex gap-3 items-center">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      {(post.image_url || post.image_urls?.[0]) ? (
                        <img
                          src={post.image_url || post.image_urls[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50">
                          <MapIcon size={24} className="text-emerald-400 mb-1" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/50">
                        📌 {post.user?.name || post.__group_name ? `${post.user?.name || 'みんな'}の行きたい` : '行きたい'}
                      </span>
                      <h4 className="text-[14px] font-black text-gray-800 truncate mt-1.5">
                        『{post.store_name || post.title}』
                      </h4>
                      <p className="text-[11px] text-gray-400 font-bold mt-1 line-clamp-2 leading-relaxed">
                        {post.comment || `次の${appType === 'tabereco' ? 'グルメ旅' : '旅'}の目的地に登録されました！`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="w-full bg-white/60 backdrop-blur-md border border-white rounded-3xl p-6 shadow-sm text-center">
                <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/50 inline-block mb-2">
                  📌 行きたいリストに追加しよう
                </span>
                <h4 className="text-[13px] font-black text-gray-800 mt-1">まだ行きたいお店がありません</h4>
                <p className="text-[11px] text-gray-400 font-bold mt-1">投稿で「行きたい」を記録すると表示されます</p>
              </div>
            )}
          </div>
        </div>

        {/* 6. みんなのごちそうフィード */}
        <div className="text-left">
          <div className="flex items-center gap-2 mb-3 pl-2">
            <span className="text-lg">📷</span>
            <h3 className="text-[15px] font-black text-gray-800">みんなの{appType === 'tabereco' ? 'ごちそう' : '旅'}フィード</h3>
          </div>

          {loadingActivities ? (
            <div className="w-full h-52 bg-gray-50 animate-pulse rounded-[2rem] border border-gray-100" />
          ) : groupActivities.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white border-dashed rounded-[2rem] p-6 text-center shadow-sm">
              <p className="text-gray-400 font-medium text-xs">グループメンバーの最近の投稿はありません</p>
              <p className="text-[10px] text-gray-300 font-bold mt-1">他のメンバーが投稿を記録するとここに表示されます</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 -mx-4 px-4 gap-4">
              {groupActivities.map((post) => (
                <div
                  key={post.id}
                  className="snap-center shrink-0 w-[85%] bg-white/70 backdrop-blur-md border border-white rounded-[2rem] p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      onClick={() => router.push(`/mypage?userId=${post.user_id}`)}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black flex items-center justify-center text-[13px] shrink-0 shadow-sm cursor-pointer"
                    >
                      {post.user?.name ? post.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4
                        onClick={() => router.push(`/mypage?userId=${post.user_id}`)}
                        className="text-[13px] font-black text-gray-800 cursor-pointer hover:underline"
                      >
                        {post.user?.name || 'メンバー'}
                      </h4>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                        {post.__group_name || '共有グループ'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold ml-auto">
                      {post.created_at ? formatTime(post.created_at) : ''}
                    </span>
                  </div>

                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 mb-3 border border-gray-100">
                    {post.image_url || (post.image_urls && post.image_urls.length > 0) ? (
                      <img
                        src={post.image_url || post.image_urls[0]}
                        alt={post.store_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-orange-50/50">
                        <span className="text-4xl opacity-30">🍽️</span>
                      </div>
                    )}
                  </div>

                  <div className="px-1">
                    <p className="text-[12px] text-gray-600 font-bold leading-relaxed line-clamp-2">
                      <span className="font-black text-gray-800 mr-1.5">{post.user?.name || 'メンバー'}:</span>
                      {post.comment || '美味しいお店を見つけました！'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100/60 pt-3 mt-3 px-1">
                    <button
                      onClick={(e) => toggleLike(post.id, e)}
                      className={`flex items-center gap-1.5 text-[11px] font-black transition-all ${
                        likedPosts[post.id] ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-orange-500'
                      }`}
                    >
                      {likedPosts[post.id] ? (
                        <BookmarkCheck size={16} className="transition-transform duration-300 scale-110" />
                      ) : (
                        <Bookmark size={16} className="transition-transform duration-300" />
                      )}
                      <span>行きたい！ ({getLikes(post.id)})</span>
                    </button>
                    <Link href={`/posts/${post.id}`} className="text-[10px] font-black text-orange-500 hover:underline">
                      詳細を見る →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
