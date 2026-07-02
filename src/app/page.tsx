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
  Image as ImageIcon,
  Heart
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
  const [loadingActivities, setLoadingActivities] = useState(true);

  // トレンドカルーセルのためのステート
  const [trendIndex, setTrendIndex] = useState(0);

  // 「みんなの未開拓リスト」シャッフルカード用
  const [unexploredSpot, setUnexploredSpot] = useState<any | null>(null);

  // 「ちょうど1年前の今日、何食べてた？」タイムトラベルカード用
  const [timeTravelPost, setTimeTravelPost] = useState<any | null>(null);

  // いいね管理用ステート
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  // 「次にどこ行く？」用店舗
  const [nextDestination, setNextDestination] = useState<Post | null>(null);

  // グループのデータから自動集計する最新トレンド（なければモック）
  const trends = useMemo(() => {
    const defaultTrends = [
      { icon: '🍜', text: 'グループみんなのラーメン1位：『麺処 まるよし』' },
      { icon: '☕', text: 'グループみんなのカフェ1位：『カフェ・ド・シュクレ』' },
      { icon: '🍛', text: 'グループみんなのカレー1位：『スパイスキング』' },
    ];

    if (allGroupPosts.length === 0) return defaultTrends;

    const findTopStore = (keywords: string[], tagNames: string[]) => {
      const candidates = allGroupPosts.filter(p => {
        const storeName = (p.store_name || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const hasKeyword = keywords.some(k => storeName.includes(k) || title.includes(k));
        const hasTag = p.tags?.some((t: any) => tagNames.includes(t.name));
        return (hasKeyword || hasTag) && p.status === 'visited';
      });

      if (candidates.length === 0) return null;

      // 評価が高い順にソート
      candidates.sort((a, b) => b.rating - a.rating);
      return candidates[0];
    };

    const topRamen = findTopStore(['ラーメン', 'らーめん', '麺'], ['ラーメン', 'らーめん', '拉麺']);
    const topCafe = findTopStore(['カフェ', '喫茶', 'cafe', 'シュクレ'], ['カフェ', 'スイーツ', '喫茶店']);
    const topCurry = findTopStore(['カレー', 'スパイス', 'curry'], ['カレー', 'スパイスカレー']);

    const list = [];
    if (topRamen) {
      list.push({ icon: '🍜', text: `グループのラーメン1位：『${topRamen.store_name}』(★${topRamen.rating.toFixed(1)})` });
    } else {
      list.push(defaultTrends[0]);
    }

    if (topCafe) {
      list.push({ icon: '☕', text: `グループのカフェ1位：『${topCafe.store_name}』(★${topCafe.rating.toFixed(1)})` });
    } else {
      list.push(defaultTrends[1]);
    }

    if (topCurry) {
      list.push({ icon: '🍛', text: `グループのカレー1位：『${topCurry.store_name}』(★${topCurry.rating.toFixed(1)})` });
    } else {
      list.push(defaultTrends[2]);
    }

    return list;
  }, [allGroupPosts]);

  // トレンドカルーセルの定期更新
  useEffect(() => {
    if (trends.length === 0) return;
    const timer = setInterval(() => {
      setTrendIndex((prev) => (prev + 1) % trends.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [trends]);

  // 「次にどこ行く？」行きたい店のピックアップ
  useEffect(() => {
    if (wantToGoPosts.length > 0) {
      const randomPost = wantToGoPosts[Math.floor(Math.random() * wantToGoPosts.length)];
      setNextDestination(randomPost);
    } else {
      setNextDestination(null);
    }
  }, [wantToGoPosts]);

  // 「みんなの未開拓リスト」自動抽出（want_to_go かつ誰も行っていない）
  useEffect(() => {
    if (allGroupPosts.length > 0) {
      const wantToGo = allGroupPosts.filter(p => p.status === 'want_to_go');
      const visited = allGroupPosts.filter(p => p.status === 'visited');
      
      const unexplored = wantToGo.filter(w => {
        if (!w.store_name) return false;
        const normalizedW = w.store_name.trim();
        return !visited.some(v => v.store_name && v.store_name.trim() === normalizedW);
      });

      if (unexplored.length > 0) {
        const randomSpot = unexplored[Math.floor(Math.random() * unexplored.length)];
        setUnexploredSpot(randomSpot);
      } else {
        setUnexploredSpot(null);
      }
    } else {
      setUnexploredSpot(null);
    }
  }, [allGroupPosts]);

  // 「ちょうど1年前の今日、何食べてた？」タイムトラベルカード自動抽出
  useEffect(() => {
    const allVisited = [
      ...visitedPosts,
      ...groupActivities.filter(a => a.status === 'visited')
    ];

    if (allVisited.length === 0) {
      setTimeTravelPost(null);
      return;
    }

    const today = new Date();
    
    const findClosestPost = (targetMonth: number, targetDay: number, maxDiffDays: number) => {
      let closestPost: any = null;
      let minDiff = Infinity;

      allVisited.forEach(p => {
        const pDate = new Date(p.visited_at || p.created_at);
        if (isNaN(pDate.getTime())) return;

        const pMonth = pDate.getMonth();
        const pDay = pDate.getDate();
        
        const getDayOfYear = (m: number, d: number) => {
          const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          let sum = d;
          for (let i = 0; i < m; i++) sum += months[i];
          return sum;
        };

        const targetSerial = getDayOfYear(targetMonth, targetDay);
        const pSerial = getDayOfYear(pMonth, pDay);
        
        let diff = Math.abs(targetSerial - pSerial);
        if (diff > 182) diff = 365 - diff;

        if (diff <= maxDiffDays && diff < minDiff) {
          minDiff = diff;
          closestPost = p;
        }
      });

      return closestPost;
    };

    // 1. 1年前（2025年5月20日）付近（前後30日）
    let selected = findClosestPost(today.getMonth(), today.getDate(), 30);
    
    // 2. なければ、半年前付近（前後45日）
    if (!selected) {
      const halfYearAgo = new Date();
      halfYearAgo.setMonth(today.getMonth() - 6);
      selected = findClosestPost(halfYearAgo.getMonth(), halfYearAgo.getDate(), 45);
    }
    
    // 3. なければ、最も古い投稿
    if (!selected && allVisited.length > 0) {
      selected = allVisited[allVisited.length - 1];
    }

    setTimeTravelPost(selected || null);
  }, [visitedPosts, groupActivities]);

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

        // 2. Fetch current user profile to get own ID & Name
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
          
          await Promise.all(
            joinedGroups.map(async (g: any) => {
              try {
                const r = await fetch(`/api/groups/${g.id}/posts`);
                const j = await r.json();
                const posts = j.data || [];
                posts.forEach((p: any) => {
                  // Save all posts for data analysis (including mine)
                  allPostsMap.set(p.id, {
                    ...p,
                    __group_name: g.name,
                  });

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

          const sortedAllPosts = Array.from(allPostsMap.values()).sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAllGroupPosts(sortedAllPosts);
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
        return {
          ...cPrev,
          [postId]: isLiked ? current + 1 : Math.max(0, current - 1)
        };
      });
      return { ...prev, [postId]: isLiked };
    });
  };

  const getLikes = (postId: string) => {
    return likesCount[postId] ?? 0;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32 relative overflow-hidden">
      {/* Premium Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-gradient-to-tr from-orange-400/10 to-pink-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[6s]" />
      <div className="absolute top-[400px] right-[-100px] w-[300px] h-[300px] bg-gradient-to-br from-blue-400/5 to-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

      <Header title="食べレコ">
        <Link
          href="/posts"
          className="w-10 h-10 bg-white shadow-none text-gray-600 rounded-full flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-all active:scale-95 border border-black/5"
        >
          <Filter size={18} />
        </Link>
      </Header>
      
      {/* 縦長シングルカラムスクロールレイアウト */}
      <main className="max-w-md md:max-w-xl mx-auto px-4 pt-6 relative z-10 space-y-6">
        
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* 1. ヘッダー・挨拶エリア */}
        <div className="pl-1 animate-in fade-in duration-500">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            こんにちは、{userName}さん！☀️
          </h2>
        </div>

        {/* 2. マイダッシュボード & 「行った / 行きたい」バーのエンタメ化 */}
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

          {/* 進捗バーのエンタメ化 */}
          {(() => {
            const progress = stats.total > 0 ? (stats.visited / stats.total) * 100 : 0;
            return (
              <div className="relative w-full bg-gray-100/80 h-3.5 rounded-full mb-6 flex shadow-inner pr-3 overflow-visible">
                <div 
                  style={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-l-full transition-all duration-1000"
                />
                
                {/* ゲージの先端にちょこんと乗るお腹をすかせた絵文字 */}
                <div 
                  style={{ left: `calc(${progress}% - 14px)` }}
                  className="absolute top-1/2 -translate-y-1/2 text-lg z-10 transition-all duration-1000 ease-out select-none"
                >
                  😋
                </div>
                
                {/* スプーンとフォークの2Dアイコンをゴール位置に配置 */}
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-orange-100 rounded-full flex items-center justify-center shadow-none z-10 text-[13px] hover:scale-110 transition-transform select-none">
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

        {/* 3. クイックメニュー（4大機能ボタン）のコンパクト化とランキング情報の拡張 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 記録を追加する */}
          <Link 
            href="/posts/new"
            className="flex flex-col items-start p-4 bg-gradient-to-br from-orange-500 to-pink-500 text-white rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:brightness-105"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2">
              <Plus size={18} strokeWidth={3} />
            </div>
            <span className="text-xs">記録を追加する</span>
            <span className="text-[9px] text-white/80 font-medium mt-0.5">写真や評価を登録</span>
          </Link>

          {/* マップから探す */}
          <Link 
            href="/map"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-2">
              <MapIcon size={16} />
            </div>
            <span className="text-xs">マップから探す</span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">ピンやタグで検索</span>
          </Link>

          {/* カレンダーで見る */}
          <Link 
            href="/calendar"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800"
          >
            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mb-2">
              <Calendar size={16} />
            </div>
            <span className="text-xs">カレンダーで見る</span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">日付ごとの思い出</span>
          </Link>

          {/* マイランキング (最新トレンドの動的チラ見せ) */}
          <Link 
            href="/rankings"
            className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl font-black shadow-none active:scale-[0.97] transition-all hover:bg-gray-50 text-gray-800 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 w-full">
              <div className="w-8 h-8 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center shrink-0">
                <Trophy size={16} />
              </div>
              <span className="text-xs">マイランキング</span>
              <div className="flex -space-x-1 ml-auto overflow-hidden">
                <span className="text-[11px]">🍜</span>
                <span className="text-[11px]">☕</span>
              </div>
            </div>
            <div className="w-full bg-pink-50/30 rounded-lg px-2 py-1 mt-2 border border-pink-100/20 text-left text-[9px] font-bold text-pink-600 truncate animate-in fade-in duration-500" key={trendIndex}>
              {trends[trendIndex]?.icon} {trends[trendIndex]?.text}
            </div>
          </Link>
        </div>

        {/* 4. 新設：「次にどこ行く？」行きたい店マップカード */}
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
            {/* SVG モックミニマップ */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-emerald-50/50 border border-gray-100 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <rect x="8" y="8" width="35" height="35" rx="6" fill="#D1FAE5" />
                <rect x="55" y="55" width="35" height="35" rx="6" fill="#D1FAE5" />
                <path d="M 0,75 Q 35,65 50,85 T 100,75" stroke="#E0F2FE" strokeWidth="8" fill="none" />
                <path d="M 0,75 Q 35,65 50,85 T 100,75" stroke="#BAE6FD" strokeWidth="4" fill="none" strokeLinecap="round" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="#FFFFFF" strokeWidth="5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#FFFFFF" strokeWidth="5" />
                <line x1="25" y1="0" x2="25" y2="100" stroke="#FFFFFF" strokeWidth="3" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="#FFFFFF" strokeWidth="3" />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-bounce whitespace-nowrap">
                  行きたい
                </div>
                <div className="w-2 h-2 bg-pink-500 rounded-full border border-white -mt-0.5" />
              </div>
            </div>

            {/* 店舗情報 */}
            <div className="flex-1 min-w-0">
              {nextDestination ? (
                <>
                  <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/50">
                    📌 行きたいリストから
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
                    📌 おすすめサンプル
                  </span>
                  <h4 className="text-[13px] font-black text-gray-800 truncate mt-1.5">
                    『カフェ・ド・シュクレ』☕
                  </h4>
                  <p className="text-[11px] text-gray-400 font-bold mt-1 line-clamp-2">
                    「フレンチトーストが有名！来月行く」
                  </p>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* 5. 新設：「みんなの未開拓リスト」シャッフルカード */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-none text-left">
          <div className="flex items-center gap-2 mb-3.5 pl-1">
            <span className="text-lg">🧭</span>
            <h3 className="text-[14px] font-black text-gray-800">グループの未開拓スポット</h3>
            <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full ml-auto">
              未踏のお店！
            </span>
          </div>
          
          {unexploredSpot ? (
            <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold">
                🍽️
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-black text-gray-800 truncate">
                  『{unexploredSpot.store_name}』
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                    {unexploredSpot.user?.name || 'メンバー'} さんの行きたいリストより
                  </span>
                </div>
              </div>
              <Link href={
                unexploredSpot.latitude && unexploredSpot.longitude
                  ? `/map?lat=${unexploredSpot.latitude}&lng=${unexploredSpot.longitude}&postId=${unexploredSpot.id}`
                  : '/map'
              } className="text-[10px] font-black text-indigo-500 hover:underline shrink-0 px-2.5 py-1.5 bg-white border border-indigo-100 rounded-xl">
                地図
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold">
                🍛
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-black text-gray-800 truncate">
                  『スパイスキング』
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                    ハナコ さんの行きたいリストより
                  </span>
                </div>
              </div>
              <Link href="/map" className="text-[10px] font-black text-indigo-500 hover:underline shrink-0 px-2.5 py-1.5 bg-white border border-indigo-100 rounded-xl">
                地図
              </Link>
            </div>
          )}
        </div>

        {/* 6. 新設：「ちょうど1年前の今日、何食べてた？」タイムトラベルカード */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-none text-left">
          <div className="flex items-center gap-2 mb-3.5 pl-1">
            <span className="text-lg">🕒</span>
            <h3 className="text-[14px] font-black text-gray-800">1年前の今日のレコード</h3>
            <span className="text-[9px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full ml-auto">
              タイムトラベル
            </span>
          </div>

          {timeTravelPost ? (
            <div className="bg-gray-50/30 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
              {/* ポラロイド風フラット枠 */}
              <div className="bg-white border border-gray-200/60 p-2.5 pb-4 rounded-lg shadow-sm max-w-[200px] w-full">
                <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gray-50 mb-3 border border-gray-100">
                  {timeTravelPost.image_url || (timeTravelPost.image_urls && timeTravelPost.image_urls.length > 0) ? (
                    <img 
                      src={timeTravelPost.image_url || timeTravelPost.image_urls[0]} 
                      alt={timeTravelPost.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-50/50">
                      <span className="text-3xl opacity-30">🍽️</span>
                    </div>
                  )}
                </div>
                <div className="text-center font-mono text-[9px] text-gray-400 font-bold tracking-wider">
                  {new Date(timeTravelPost.visited_at || timeTravelPost.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </div>
              </div>
              
              <div className="w-full mt-4 text-center">
                <h4 className="text-[13px] font-black text-gray-800">
                  『{timeTravelPost.store_name || timeTravelPost.title}』
                </h4>
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed mt-1.5 italic px-4">
                  「{timeTravelPost.comment || '去年の今頃はここに行っていたんだな'}」
                </p>
                <div className="mt-3 flex justify-center">
                  <Link href={`/posts/${timeTravelPost.id}`} className="text-[10px] font-black text-orange-500 hover:underline px-3 py-1 bg-white border border-orange-100 rounded-full">
                    思い出を振り返る →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/30 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
              {/* モックポラロイド */}
              <div className="bg-white border border-gray-200/60 p-2.5 pb-4 rounded-lg shadow-sm max-w-[200px] w-full">
                <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gray-50 mb-3 border border-gray-100 flex items-center justify-center">
                  <span className="text-5xl">🥞</span>
                </div>
                <div className="text-center font-mono text-[9px] text-gray-400 font-bold tracking-wider">
                  2025.05.20
                </div>
              </div>
              
              <div className="w-full mt-4 text-center">
                <h4 className="text-[13px] font-black text-gray-800">
                  『カフェ・ド・シュクレ』☕
                </h4>
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed mt-1.5 italic px-4">
                  「ちょうど1年前の今日、フレンチトーストを食べて幸せだった思い出！」
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 7. 新設：「グループのごちそうフィード」ダイジェスト */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-none text-left">
          <div className="flex items-center gap-2 mb-4 pl-1">
            <span className="text-lg">📷</span>
            <h3 className="text-[14px] font-black text-gray-800">グループのごちそうフィード</h3>
          </div>

          {loadingActivities ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="w-full h-24 bg-white animate-pulse rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : groupActivities.length === 0 ? (
            <div className="bg-white border border-gray-100 border-dashed rounded-2xl p-6 text-center">
              <p className="text-gray-400 font-medium text-xs">グループメンバーの最近の投稿はありません</p>
              <p className="text-[10px] text-gray-300 font-bold mt-1">他のメンバーが投稿を記録するとここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupActivities.slice(0, 2).map((act) => {
                const isLiked = !!likedPosts[act.id];
                const likes = getLikes(act.id);
                return (
                  <div key={act.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/40 p-3">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div 
                        onClick={() => router.push(`/mypage?userId=${act.user_id}`)}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-inner cursor-pointer"
                      >
                        {act.user?.name ? act.user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 
                          onClick={() => router.push(`/mypage?userId=${act.user_id}`)}
                          className="text-xs font-black text-gray-800 cursor-pointer hover:underline"
                        >
                          {act.user?.name || 'メンバー'}
                        </h4>
                        <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                          {act.__group_name || '共有グループ'}
                        </span>
                      </div>
                      <span className="text-[8px] text-gray-400 font-bold ml-auto">{act.created_at ? formatTime(act.created_at) : ''}</span>
                    </div>

                    {/* Instagram-like Square Photo */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-100 mb-2 border border-gray-200/40">
                      {act.image_url || (act.image_urls && act.image_urls.length > 0) ? (
                        <img 
                          src={act.image_url || act.image_urls[0]} 
                          alt={act.store_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-50/50">
                          <span className="text-3xl opacity-30">🍽️</span>
                        </div>
                      )}
                    </div>

                    {/* Caption & Hashtags */}
                    <div className="px-1 py-1">
                      <p className="text-[11px] text-gray-600 font-bold leading-normal">
                        <span className="font-black text-gray-800 mr-1.5">{act.user?.name || 'メンバー'}:</span>
                        {act.comment || '美味しいお店を見つけました！'}
                      </p>
                    </div>

                    {/* Like Button */}
                    <div className="flex items-center justify-between border-t border-gray-100/60 pt-2.5 mt-2 px-1">
                      <button 
                        onClick={(e) => toggleLike(act.id, e)}
                        className={`flex items-center gap-1.5 text-[10px] font-black transition-all ${
                          isLiked ? 'text-pink-500 scale-105' : 'text-gray-400 hover:text-pink-500'
                        }`}
                      >
                        <Heart size={14} className={`transition-transform duration-300 ${isLiked ? 'fill-pink-500 scale-110' : ''}`} />
                        <span>食べたそう！ ({likes})</span>
                      </button>
                      <Link href={`/posts/${act.id}`} className="text-[9px] font-black text-orange-500 hover:underline">
                        詳細を見る →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
