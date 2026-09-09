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
  Calendar,
  BarChart2,
  Heart,
  Star,
  Utensils,
  Camera,
  Flame,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useMyProfile, useMyPosts, useGroupActivities, useTopRankings } from '@/hooks/useAppData';
import { useAppType } from '@/contexts/AppTypeContext';
import { getImageUrl } from '@/lib/image';
import { FoodRouletteModal } from '@/components/home/FoodRouletteModal';
import { MemoriesCard } from '@/components/home/MemoriesCard';
import { NearbyWantToGo } from '@/components/home/NearbyWantToGo';
import { PrefectureMapWidget } from '@/components/home/PrefectureMapWidget';

// ─── サブコンポーネント ───────────────────────────────────

function StatPill({ href, value, label, icon, color }: { href: string; value: number; label: string; icon: React.ReactNode; color: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 active:scale-95 transition-all hover:bg-white/20 shrink-0"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[17px] font-black text-white leading-none">{value}</div>
        <div className="text-[10px] font-bold text-white/80 mt-0.5">{label}</div>
      </div>
    </Link>
  );
}

function QuickActionBtn({ href, icon, label, from, to }: { href: string; icon: React.ReactNode; label: string; from: string; to: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 active:scale-95 transition-all duration-200"
    >
      <div className={`w-14 h-14 rounded-[20px] bg-gradient-to-br ${from} ${to} flex items-center justify-center shadow-lg text-white`}
        style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}>
        {icon}
      </div>
      <span className="text-[11px] font-black text-gray-600 tracking-wide">{label}</span>
    </Link>
  );
}

function StoryBubble({ post, onClick }: { post: any; onClick: () => void }) {
  const name = post.user?.name || 'U';
  const hasImage = !!(post.image_url || post.image_urls?.[0]);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
    >
      <div className="relative w-16 h-16 rounded-full p-[2.5px]"
        style={{ background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)' }}>
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-white">
          {hasImage ? (
            <img
              src={getImageUrl(post.image_url || post.image_urls![0])}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500">
              <span className="text-white font-black text-[18px]">{name[0].toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
          <Utensils size={10} className="text-orange-500" />
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-600 w-16 text-center truncate">{post.user?.name || 'みんな'}</span>
    </button>
  );
}

// ─── メインページ ────────────────────────────────────────

export default function HomePage() {
  const { appType } = useAppType();
  const router = useRouter();

  const { profile, isLoading: profileLoading } = useMyProfile();
  const myUserId = profile?.id ?? null;
  const userName = profile?.name ?? 'ゲスト';

  const { visitedPosts, wantToGoPosts, isLoading: postsLoading } = useMyPosts();
  const { groupActivities, allGroupWantToGo, initialLikes, initialCounts, isLoading: activitiesLoading } = useGroupActivities(myUserId);
  const { rankingItems } = useTopRankings();

  const loading = profileLoading || postsLoading;

  const [rankingIndex, setRankingIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [greeting, setGreeting] = useState('');
  const [greetingEmoji, setGreetingEmoji] = useState('');
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 5) { setGreeting('おやすみ前に'); setGreetingEmoji('🌙'); }
    else if (hour < 11) { setGreeting('おはようございます'); setGreetingEmoji('☀️'); }
    else if (hour < 17) { setGreeting('こんにちは'); setGreetingEmoji('😊'); }
    else { setGreeting('お疲れさまです'); setGreetingEmoji('🌇'); }
  }, []);

  useEffect(() => {
    if (Object.keys(initialLikes).length > 0) {
      setLikedPosts(initialLikes);
      setLikesCount(initialCounts);
    }
  }, [initialLikes, initialCounts]);

  useEffect(() => {
    if (rankingItems.length === 0) return;
    const timer = setInterval(() => {
      setRankingIndex(prev => (prev + 1) % rankingItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [rankingItems]);

  const combinedWantToGo = useMemo(() => {
    const list = [...wantToGoPosts, ...allGroupWantToGo];
    const map = new Map();
    list.forEach(p => map.set(p.id, p));
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [wantToGoPosts, allGroupWantToGo]);

  // ルーレット用の全候補（自分の投稿＋グループの全投稿）
  const allCandidatePosts = useMemo(() => {
    const map = new Map<string, Post>();
    [...visitedPosts, ...wantToGoPosts, ...groupActivities, ...allGroupWantToGo].forEach(p => {
      map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [visitedPosts, wantToGoPosts, groupActivities, allGroupWantToGo]);

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

  const totalVisited = visitedPosts.length;
  const totalWant = wantToGoPosts.length;

  // 最近の自分の投稿（ハイライト用）
  const recentVisited = visitedPosts.slice(0, 6);

  // ストーリー表示用：グループの最新投稿（重複ユーザーは省く）
  const storyPosts = useMemo(() => {
    const seenUsers = new Set<string>();
    return groupActivities.filter(p => {
      if (seenUsers.has(p.user_id)) return false;
      seenUsers.add(p.user_id);
      return true;
    }).slice(0, 8);
  }, [groupActivities]);

  // 人気投稿（いいね順）
  const hotPosts = useMemo(() => {
    return [...groupActivities]
      .sort((a, b) => {
        const countA = likesCount[a.id] ?? a.want_to_gos?.length ?? 0;
        const countB = likesCount[b.id] ?? b.want_to_gos?.length ?? 0;
        return countB - countA;
      })
      .filter(p => (likesCount[p.id] ?? p.want_to_gos?.length ?? 0) > 0 || p.image_url || p.image_urls?.[0])
      .slice(0, 4);
  }, [groupActivities, likesCount]);

  return (
    <div className="bg-gray-50 min-h-screen pb-32 overflow-x-hidden">

      {/* ── ヒーローヘッダー ── */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: appType === 'tabereco'
              ? 'linear-gradient(135deg, #f43f5e 0%, #f97316 50%, #fbbf24 100%)'
              : 'linear-gradient(135deg, #22c55e 0%, #84cc16 50%, #fbbf24 100%)',
          }}
        />
        {/* Decorative blobs */}
        <div className="absolute top-[-40px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/10 blur-2xl z-0 animate-pulse" />
        <div className="absolute bottom-[-20px] left-[-30px] w-[160px] h-[160px] rounded-full bg-white/10 blur-2xl z-0" />

        <Header transparent />

        {/* Greeting block */}
        <div className="relative z-10 px-5 pb-6 pt-1">
          <div className="flex items-center gap-3 mb-5">
            {/* Avatar placeholder or profile pic */}
            <div
              className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lg shrink-0 cursor-pointer active:scale-95 transition-transform"
              onClick={() => router.push('/mypage')}
            >
              {profile?.avatar_url ? (
                <img src={getImageUrl(profile.avatar_url)} alt={userName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-white font-black text-2xl">{userName[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div>
              <p className="text-white/80 text-[12px] font-bold mb-0.5">{greetingEmoji} {greeting}</p>
              <h1 className="text-white font-black text-[22px] leading-tight">
                {userName}<span className="text-white/80 font-bold text-[16px]">さん！</span>
              </h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
            <StatPill
              href="/mypage"
              value={totalVisited}
              label={appType === 'tabereco' ? '訪問した店' : '行った場所'}
              icon={<Utensils size={16} className="text-white" />}
              color="bg-white/20"
            />
            <StatPill
              href="/mypage?tab=want_to_go"
              value={totalWant}
              label="行きたい"
              icon={<Bookmark size={16} className="text-white" />}
              color="bg-white/20"
            />
            <StatPill
              href="/posts"
              value={groupActivities.length}
              label="みんなの投稿"
              icon={<Camera size={16} className="text-white" />}
              color="bg-white/20"
            />
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 375 40" className="w-full block" style={{ marginBottom: -1 }}>
          <path d="M0,40 C75,10 150,30 220,15 C290,0 340,25 375,10 L375,40 Z" fill="#f9fafb" />
        </svg>
      </div>

      <main className="max-w-md md:max-w-xl mx-auto relative z-10">

        {/* ── クイックアクション ── */}
        <section className="px-5 pt-4 pb-5">
          <div className="flex justify-around">
            <QuickActionBtn href="/posts" icon={<TrendingUp size={24} />} label="タイムライン" from="from-violet-500" to="to-purple-600" />
            <QuickActionBtn href="/map" icon={<MapIcon size={24} />} label="マップ" from="from-orange-400" to="to-rose-500" />
            <QuickActionBtn href="/calendar" icon={<Calendar size={24} />} label="カレンダー" from="from-blue-400" to="to-indigo-500" />
            <QuickActionBtn href="/stats" icon={<BarChart2 size={24} />} label="統計" from="from-emerald-400" to="to-teal-500" />
            <QuickActionBtn href="/rankings" icon={<Trophy size={24} />} label="ランキング" from="from-amber-400" to="to-orange-500" />
          </div>
        </section>

        {/* ── 🎲 ルーレットバナー ── */}
        <section className="px-4 mb-6">
          <div
            onClick={() => setIsRouletteOpen(true)}
            className={`relative overflow-hidden rounded-[24px] p-4 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-all group ${
              appType === 'tabireco'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600'
                : 'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500'
            }`}
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            <div className="absolute top-[-25px] right-[-25px] w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  🎲
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-black tracking-wide">
                      迷ったときのガチャ！
                    </span>
                    <Sparkles size={13} className="text-amber-200" />
                  </div>
                  <h3 className="text-[17px] font-black leading-tight mt-1">
                    {appType === 'tabireco' ? '次どこ行く？旅ガチャ' : '今日何食べる？ルーレット'}
                  </h3>
                  <p className="text-[11px] text-white/80 font-bold mt-0.5">
                    {appType === 'tabireco'
                      ? '条件に合うスポットから運命の1軒をランダム決定'
                      : '条件に合うお店から今日のご飯をランダム決定'}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                <ChevronRight size={18} className="text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 📸 Memories 振り返りカード ── */}
        <MemoriesCard posts={visitedPosts} />

        {/* ── 📍 現在地近くの行きたい店 ── */}
        <NearbyWantToGo posts={combinedWantToGo} />

        {/* ── 🗺️ 都道府県制覇ミニマップ ── */}
        <PrefectureMapWidget posts={visitedPosts} />

        {/* ── ランキング ── */}
        {rankingItems.length > 0 && (() => {
          const currentRanking = rankingItems[rankingIndex] ?? rankingItems[0];
          if (!currentRanking?.post) return null;
          const bgImg = currentRanking.post.image_url || currentRanking.post.image_urls?.[0];

          return (
            <section className="px-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center">
                  <Trophy size={13} className="text-white" />
                </div>
                <h2 className="text-[15px] font-black text-gray-800">ランキング</h2>
                <Link href="/rankings" className="ml-auto text-[11px] font-bold text-orange-500 flex items-center gap-0.5">
                  すべて見る <ChevronRight size={13} />
                </Link>
              </div>
              <Link href="/rankings" className="block">
                <div className="relative rounded-[24px] overflow-hidden h-[200px] shadow-lg"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
                  {/* BG image */}
                  {bgImg ? (
                    <img
                      key={`bg-${rankingIndex}`}
                      src={getImageUrl(bgImg)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-900/30 to-transparent" />

                  <div className="absolute inset-0 p-5 flex flex-col z-10">
                    <div className="flex items-center gap-2 mb-auto">
                      <span className="px-2.5 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full shadow-sm">
                        🏆 #{currentRanking.tagName} 1位
                      </span>
                      <ChevronRight size={16} className="text-white/70 ml-auto" />
                    </div>
                    <div key={rankingIndex} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                      <h3 className="text-[22px] font-black text-white leading-tight mb-1 drop-shadow-lg line-clamp-2">
                        {currentRanking.post.store_name || currentRanking.post.title}
                      </h3>
                      <p className="text-[11px] text-white/70 font-bold">
                        by {currentRanking.post.user?.name || 'ゲスト'}
                      </p>
                    </div>
                  </div>

                  {/* Carousel dots */}
                  {rankingItems.length > 1 && (
                    <div className="absolute bottom-4 right-5 flex gap-1.5">
                      {rankingItems.map((_: any, i: number) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === rankingIndex ? 'bg-white w-4' : 'bg-white/30 w-1.5'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </section>
          );
        })()}

        {/* ── みんなのストーリー ── */}
        {!activitiesLoading && storyPosts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-4">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <Flame size={13} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800">最新アクティビティ</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 pb-1">
              {storyPosts.map(post => (
                <StoryBubble
                  key={post.id}
                  post={post}
                  onClick={() => router.push(`/posts/${post.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── ホット投稿 2×2グリッド ── */}
        {!activitiesLoading && hotPosts.length >= 2 && (
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Zap size={13} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800">みんなのピックアップ</h2>
              <Link href="/posts" className="ml-auto text-[11px] font-bold text-orange-500 flex items-center gap-0.5">
                もっと見る <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {hotPosts.slice(0, 4).map((post, idx) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className={`relative overflow-hidden rounded-2xl bg-gray-100 active:scale-98 transition-transform shadow-sm ${idx === 0 ? 'row-span-2 aspect-[4/5]' : 'aspect-square'}`}
                  style={{ minHeight: idx === 0 ? 0 : undefined }}
                >
                  {(post.image_url || post.image_urls?.[0]) ? (
                    <img
                      src={getImageUrl(post.image_url || post.image_urls![0])}
                      alt={post.store_name || post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-pink-100 flex items-center justify-center">
                      <Utensils size={28} className="text-orange-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white font-black text-[11px] leading-tight line-clamp-2">
                      {post.store_name || post.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-black text-[8px]">
                          {(post.user?.name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white/70 text-[9px] font-bold truncate">{post.user?.name}</span>
                    </div>
                  </div>
                  {(likesCount[post.id] ?? post.want_to_gos?.length ?? 0) > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white rounded-full px-2 py-1">
                      <Heart size={9} className="fill-rose-400 text-rose-400" />
                      <span className="text-[9px] font-black">{likesCount[post.id] ?? post.want_to_gos?.length ?? 0}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 最近の自分の記録 ── */}
        {!loading && recentVisited.length > 0 && (
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <Clock size={13} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800">最近の自分の記録</h2>
              <Link href="/mypage" className="ml-auto text-[11px] font-bold text-orange-500 flex items-center gap-0.5">
                すべて <ChevronRight size={13} />
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
              {recentVisited.map(post => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="shrink-0 w-28 active:scale-95 transition-transform"
                >
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 mb-1.5 shadow-sm">
                    {post.image_url ? (
                      <img
                        src={getImageUrl(post.image_url)}
                        alt={post.store_name || post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-50 to-pink-100 flex flex-col items-center justify-center">
                        <Utensils size={22} className="text-rose-300 mb-1" />
                      </div>
                    )}
                    {post.rating && (
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white rounded-full px-1.5 py-0.5">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        <span className="text-[9px] font-black">{post.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-gray-700 leading-tight line-clamp-2">
                    {post.store_name || post.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 次にどこ行く？ ── */}
        {combinedWantToGo.length > 0 && (
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <MapIcon size={13} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800">次にどこ行く？</h2>
              <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                {combinedWantToGo.length}件
              </span>
            </div>
            <div className="space-y-2.5">
              {combinedWantToGo.slice(0, 3).map(post => (
                <Link
                  key={post.id}
                  href={post.latitude && post.longitude ? `/map?lat=${post.latitude}&lng=${post.longitude}&postId=${post.id}` : '/map'}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {(post.image_url || post.image_urls?.[0]) ? (
                      <img
                        src={getImageUrl(post.image_url || post.image_urls![0])}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                        <MapIcon size={20} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black text-gray-800 truncate">{post.store_name || post.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5 truncate">
                      {post.user?.name ? `📌 ${post.user.name}の行きたい` : '📌 行きたい'}
                    </p>
                    {post.comment && (
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{post.comment}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </Link>
              ))}
              {combinedWantToGo.length > 3 && (
                <Link
                  href="/mypage"
                  className="block text-center text-[12px] font-black text-orange-500 py-2 bg-orange-50 rounded-xl border border-orange-100 active:bg-orange-100 transition-colors"
                >
                  さらに {combinedWantToGo.length - 3} 件を見る →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ── グループフィード（カード形式） ── */}
        {!activitiesLoading && groupActivities.length > 0 && (
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <Camera size={13} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-gray-800">
                みんなの{appType === 'tabereco' ? 'ごちそう' : '旅'}フィード
              </h2>
              <Link href="/posts" className="ml-auto text-[11px] font-bold text-orange-500 flex items-center gap-0.5">
                もっと見る <ChevronRight size={13} />
              </Link>
            </div>
            <div className="space-y-3">
              {groupActivities.slice(0, 5).map(post => (
                <div key={post.id} className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100">
                  {/* Post header */}
                  <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                    <div
                      onClick={() => router.push(`/mypage?userId=${post.user_id}`)}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-black flex items-center justify-center text-[14px] shrink-0 cursor-pointer shadow-sm"
                    >
                      {(post.user?.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        onClick={() => router.push(`/mypage?userId=${post.user_id}`)}
                        className="text-[13px] font-black text-gray-800 cursor-pointer leading-none"
                      >
                        {post.user?.name || 'メンバー'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          {post.__group_name || 'グループ'}
                        </span>
                        <span className="text-[9px] text-gray-300 font-bold">
                          {post.created_at ? formatTime(post.created_at) : ''}
                        </span>
                      </div>
                    </div>
                    {post._avgRating && (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2 py-1">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-black text-amber-600">{Number(post._avgRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Post image */}
                  {(post.image_url || (post.image_urls && post.image_urls.length > 0)) && (
                    <Link href={`/posts/${post.id}`} className="block">
                      <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                        <img
                          src={getImageUrl(post.image_url || post.image_urls![0])}
                          alt={post.store_name || post.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </Link>
                  )}

                  {/* Post info */}
                  <div className="px-4 py-3">
                    <Link href={`/posts/${post.id}`}>
                      <p className="text-[14px] font-black text-gray-800 mb-1">
                        {post.store_name || post.title}
                      </p>
                      {post.comment && (
                        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{post.comment}</p>
                      )}
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between px-4 pb-4 border-t border-gray-50 pt-3">
                    <button
                      onClick={(e) => toggleLike(post.id, e)}
                      className={`flex items-center gap-1.5 text-[12px] font-black transition-all ${likedPosts[post.id] ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                    >
                      {likedPosts[post.id] ? (
                        <BookmarkCheck size={17} className="transition-transform duration-300 scale-110" />
                      ) : (
                        <Bookmark size={17} />
                      )}
                      <span>行きたい！ {(likesCount[post.id] ?? 0) > 0 ? `(${likesCount[post.id]})` : ''}</span>
                    </button>
                    <Link
                      href={`/posts/${post.id}`}
                      className="text-[11px] font-black text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 active:bg-orange-100 transition-colors"
                    >
                      詳細 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 空状態 ── */}
        {!loading && !activitiesLoading && groupActivities.length === 0 && visitedPosts.length === 0 && (
          <section className="px-4">
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className="text-[16px] font-black text-gray-700 mb-2">まだ記録がありません</h3>
              <p className="text-[12px] text-gray-400 font-bold mb-4">
                グルメや旅の記録を始めてみましょう！
              </p>
              <Link
                href="/posts/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-400 to-rose-500 text-white font-black text-[13px] rounded-2xl shadow-md active:scale-95 transition-transform"
              >
                <Utensils size={15} />
                最初の記録をする
              </Link>
            </div>
          </section>
        )}

        {/* ── Loading skeleton ── */}
        {(loading || activitiesLoading) && groupActivities.length === 0 && (
          <section className="px-4">
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-[20px] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 rounded-full bg-gray-100 animate-pulse" />
                      <div className="h-2 w-14 rounded-full bg-gray-50 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-48 bg-gray-50 animate-pulse" />
                  <div className="px-4 py-3 space-y-1.5">
                    <div className="h-3.5 w-36 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-2.5 w-full rounded-full bg-gray-50 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── 🎲 ルーレットモーダル ── */}
      <FoodRouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        posts={allCandidatePosts}
      />
    </div>
  );
}
