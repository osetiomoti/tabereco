'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/Header';
import { Loader2, AlertCircle, Filter, X } from 'lucide-react';
import { FilterModal } from '@/components/FilterModal';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { useSearchParams } from 'next/navigation';
import { useMyProfile } from '@/hooks/useAppData';
import Image from 'next/image';
import Link from 'next/link';
import { useTimeline } from '@/hooks/useTimeline';
import type { Post } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StatsData {
  totalPosts: number;
  genreData: { name: string; count: number }[];
  monthlyData: { month: string; count: number }[];
  noDateCount: number;
  ratingData: { label: string; count: number }[];
  prefData: { name: string; count: number }[];
}

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = [
  '#f97316', '#fb923c', '#fdba74', '#fcd34d', '#86efac',
  '#6ee7f7', '#a5b4fc', '#f9a8d4', '#c4b5fd', '#94a3b8', '#d1d5db',
];

// ─── Mini Map (for Want to Go) ───────────────────────────────────────────────
function MiniNoImageMap({ post }: { post: Post }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasCoords = post.latitude != null && post.longitude != null;
  const staticMapUrl = hasCoords && apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${post.latitude},${post.longitude}&zoom=15&size=300x300&markers=color:0xf43f5e%7C${post.latitude},${post.longitude}&key=${apiKey}`
    : null;

  return (
    <div className="w-full h-full relative bg-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
      {staticMapUrl ? (
        <>
          <Image src={staticMapUrl} alt="Map" fill className="object-cover opacity-80" unoptimized />
          <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center pointer-events-none p-1">
            <span className="text-gray-600 font-bold text-[8px] bg-white/80 px-2 py-1 rounded shadow-sm backdrop-blur-sm text-center leading-tight">
              画像が登録されて<br />いません
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-2 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 w-full h-full">
          <span className="text-xl mb-1">📍</span>
          <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
          <span className="text-[8px] font-bold text-gray-500 mt-0.5 text-center leading-tight">画像がありません</span>
        </div>
      )}
    </div>
  );
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────
function PieChart({ data, onTagClick }: { data: { name: string; count: number }[], onTagClick: (tag: string) => void }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-gray-300 text-sm text-center py-8">データがありません</p>;

  // Build conic-gradient stops
  let cumulative = 0;
  const stops = data.map((d, i) => {
    const pct = (d.count / total) * 100;
    const from = cumulative;
    cumulative += pct;
    return { ...d, from, to: cumulative, color: COLORS[i % COLORS.length], pct };
  });

  const gradient = stops
    .map(s => `${s.color} ${s.from.toFixed(1)}% ${s.to.toFixed(1)}%`)
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      {/* Pie */}
      <div className="flex items-center justify-center">
        <div
          className="w-40 h-40 rounded-full shadow-inner"
          style={{ background: `conic-gradient(${gradient})` }}
        />
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <button onClick={() => onTagClick(s.name)} className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] font-bold text-gray-700 truncate">{s.name}</span>
            </button>
            <div className="flex items-center gap-2 flex-shrink-0 pointer-events-none">
              <span className="text-[11px] text-gray-400">{s.count}件</span>
              <span className="text-[11px] font-black text-gray-600 w-10 text-right">{s.pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Line Chart ──────────────────────────────────────────────────────────────
function LineChart({ data }: { data: { month: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-gray-300 text-sm text-center py-8">データがありません</p>;

  const WIDTH = 320;
  const HEIGHT = 140;
  const PADDING = { top: 12, right: 16, bottom: 32, left: 32 };
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  const points = data.map((d, i) => ({
    x: PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: PADDING.top + chartH - (d.count / maxCount) * chartH,
    ...d,
  }));

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Y-axis ticks
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];

  // X-axis: show first, middle, last if > 6 months
  const xLabels = data.length <= 6
    ? data.map((d, i) => ({ i, label: d.month.slice(5) })) // show MM
    : [
        { i: 0, label: data[0].month.slice(0, 7) },
        { i: Math.floor((data.length - 1) / 2), label: data[Math.floor((data.length - 1) / 2)].month.slice(0, 7) },
        { i: data.length - 1, label: data[data.length - 1].month.slice(0, 7) },
      ];

  return (
    <div className="overflow-x-auto -mx-1">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="overflow-visible">
        {/* Y grid lines */}
        {yTicks.map((tick, i) => {
          const y = PADDING.top + chartH - (tick / maxCount) * chartH;
          return (
            <g key={i}>
              <line x1={PADDING.left} y1={y} x2={PADDING.left + chartW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PADDING.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{tick}</text>
            </g>
          );
        })}

        {/* Area fill */}
        {points.length > 1 && (
          <polygon
            points={`${PADDING.left},${PADDING.top + chartH} ${polylinePoints} ${PADDING.left + chartW},${PADDING.top + chartH}`}
            fill="url(#lineGrad)"
            opacity="0.3"
          />
        )}
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#f97316" strokeWidth="2" />
        ))}

        {/* X labels */}
        {xLabels.map(({ i, label }) => {
          const p = points[i];
          return (
            <text key={i} x={p.x} y={HEIGHT - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Vertical Bar Chart (rating distribution) ─────────────────────────────
function RatingBarChart({ data }: { data: { label: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const ratingColors: Record<string, string> = {
    '★5': '#f97316',
    '★4': '#fb923c',
    '★3': '#fdba74',
    '★2': '#fcd34d',
    '★1': '#e5e7eb',
    '未評価': '#d1d5db',
  };

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-black text-gray-600 w-12 flex-shrink-0">{d.label}</span>
            <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                style={{
                  width: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                  background: ratingColors[d.label] || '#e5e7eb',
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-gray-400 w-8 text-right flex-shrink-0">{d.count}件</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Horizontal Bar Chart (prefecture ranking) ────────────────────────────
function PrefBarChart({ data }: { data: { name: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const displayData = data.slice(0, 15);

  return (
    <div className="space-y-2">
      {displayData.map((d, i) => {
        const pct = (d.count / maxCount) * 100;
        const opacity = 1 - (i / displayData.length) * 0.5;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
            <span className="text-[12px] font-bold text-gray-700 w-14 flex-shrink-0">{d.name}</span>
            <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-1.5"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  background: `rgba(249, 115, 22, ${opacity})`,
                }}
              >
                <span className="text-white text-[9px] font-black drop-shadow-sm">{d.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Card Wrapper ────────────────────────────────────────────────────────────
function StatCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-black text-gray-800">{title}</h2>
        {subtitle}
      </div>
      {children}
    </div>
  );
}

// ─── Filtered Posts List ──────────────────────────────────────────────────────
function FilteredPostsList({ isMyPageMode, profileId }: { isMyPageMode: boolean, profileId?: string }) {
  const [activeTab, setActiveTab] = useState<'visited' | 'want_to_go'>('visited');

  const {
    posts,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore
  } = useTimeline({
    timelineMode: isMyPageMode ? 'user' : 'home',
    targetUserId: isMyPageMode ? profileId : undefined,
    filters: { status: activeTab }
  });

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-black text-gray-800">絞り込み結果の投稿</h3>
      </div>
      {/* Tabs */}
      <div className="flex bg-gray-100/80 rounded-[14px] p-1 border border-black/5 shadow-inner mb-4">
        <button
          onClick={() => setActiveTab('visited')}
          className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${activeTab === 'visited' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          行った
        </button>
        <button
          onClick={() => setActiveTab('want_to_go')}
          className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${activeTab === 'want_to_go' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          行きたい
        </button>
      </div>

      {/* Grid */}
      <div className="mb-2">
        {isLoading && posts.length === 0 ? (
          <div className="px-0.5 grid grid-cols-3 gap-0.5">
            {[1,2,3,4,5,6].map(i => <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-gray-300 text-[12px] font-bold">該当する投稿がありません</div>
        ) : (
          <div className="px-0.5 grid grid-cols-3 gap-0.5 pb-4">
            {posts.map(post => (
              <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
                {post.image_url ? (
                  <Image src={post.image_url} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                ) : activeTab === 'want_to_go' ? (
                  <MiniNoImageMap post={post} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 group-hover:scale-105 transition-transform duration-500">
                    <span className="text-2xl mb-1">🍽️</span>
                    <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                  <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                  {post.store_name && (
                    <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate mt-0.5 opacity-80">
                      {post.store_name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {!isLoading && !isReachingEnd && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full text-[11px] font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
            もっと見る
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function StatsPageInner() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const { filterState, updateFilter } = useSharedFilter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const { profile } = useMyProfile();

  const [showPosts, setShowPosts] = useState(false);
  const [lastQueryString, setLastQueryString] = useState('');

  // フィルタ状態からクエリ文字列を構築
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    // SharedFilterからのパラメータ
    const advanced = filterState.advancedFilters || {};
    const tags = advanced.tags || [];
    
    if (tags.length > 0) {
      params.append('selected_tags', tags.join(','));
      params.append('tag_match_mode', advanced.tagMatchMode || filterState.tagMatchMode || 'AND');
    }
    if (filterState.activeTab && filterState.activeTab !== 'all') params.append('status', filterState.activeTab);
    
    const filterMode = advanced.filterMode || 'registrant';
    if (filterMode === 'group') {
      if (filterState.activeGroups.length > 0 && !filterState.activeGroups.includes('all')) {
        params.append('group_ids', filterState.activeGroups.join(','));
      }
    } else {
      if (advanced.registrantUserIds && advanced.registrantUserIds.length > 0) {
        params.append('registrant_ids', advanced.registrantUserIds.join(','));
      }
    }

    if (mode === 'mypage' && profile) {
      params.set('timeline_mode', 'user');
      params.set('target_user_id', profile.id);
    } else {
      params.set('timeline_mode', 'home');
    }

    return params.toString();
  }, [filterState, mode, profile]);

  useEffect(() => {
    if (queryString !== lastQueryString) {
      setShowPosts(false);
      setLastQueryString(queryString);
    }
  }, [queryString, lastQueryString]);

  const { data, isLoading, error } = useSWR<{ success: boolean; data: StatsData }>(
    profile ? `/api/stats?${queryString}` : null,
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );

  const stats = data?.data;
  
  // マイページモードのときは、グループや他の人のフィルターを隠す
  const isMyPageMode = mode === 'mypage';
  const hasActiveFilters = (filterState.advancedFilters?.tags?.length > 0) || 
                           (filterState.activeTab !== 'all' && filterState.activeTab !== 'visited'); // Default is usually visited or all depending on user logic

  const handleTagClick = (tag: string) => {
    if (tag === 'その他') return;
    const currentTags = filterState.advancedFilters?.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilter({
        advancedFilters: {
          ...filterState.advancedFilters,
          tags: [...currentTags, tag]
        }
      });
    }
  };

  const removeTagFilter = (tag: string) => {
    const currentTags = filterState.advancedFilters?.tags || [];
    updateFilter({
      advancedFilters: {
        ...filterState.advancedFilters,
        tags: currentTags.filter((t: string) => t !== tag)
      }
    });
  };

  const clearFilters = () => {
    updateFilter({
      activeTab: 'all',
      advancedFilters: {
        ...filterState.advancedFilters,
        tags: [],
        tagMatchMode: 'AND'
      }
    });
  };

  const activeTags = filterState.advancedFilters?.tags || [];

  return (
    <div className="bg-[#fcfcfc] min-h-[100dvh] pb-24">
      <Header title={isMyPageMode ? "マイデータ" : "統計データ"} showBackButton>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            hasActiveFilters
              ? 'bg-orange-50 text-orange-500'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Filter size={18} />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              !
            </span>
          )}
        </button>
      </Header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span className="text-[10px] font-black text-gray-400 mr-1">絞り込み中:</span>
            {activeTags.map((tag: string) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold border border-orange-100">
                #{tag}
                <button onClick={() => removeTagFilter(tag)} className="hover:bg-orange-200 rounded-full p-0.5 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
            {filterState.activeTab && filterState.activeTab !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
                状態: {filterState.activeTab === 'visited' ? '行った' : '行きたい'}
              </span>
            )}
            <button onClick={clearFilters} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline ml-auto">
              クリア
            </button>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-orange-400" size={32} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-2 text-red-500 text-sm font-bold">
            <AlertCircle size={18} />
            <span>データの取得に失敗しました</span>
          </div>
        )}

        {stats && (
          <>
            {/* Summary */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-5 border border-orange-100">
              <p className="text-[11px] font-black text-orange-400 tracking-widest uppercase mb-1">TOTAL</p>
              <p className="text-3xl font-black text-orange-500">{stats.totalPosts}<span className="text-base font-bold text-orange-300 ml-1">件</span></p>
              <p className="text-[12px] font-bold text-orange-300 mt-0.5">{isMyPageMode ? 'これまでの投稿数' : '絞り込み条件に一致する投稿数'}</p>
            </div>

            {/* ① ジャンル割合 */}
            <StatCard title="① ジャンル割合">
              {stats.genreData.length === 0
                ? <p className="text-gray-300 text-sm text-center py-8">タグがついた投稿がありません</p>
                : <PieChart data={stats.genreData} onTagClick={handleTagClick} />
              }
            </StatCard>

            {/* ② 月ごとの投稿数 */}
            <StatCard
              title="② 月ごとの投稿数"
              subtitle={
                stats.noDateCount > 0
                  ? <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">日付未設定 {stats.noDateCount}件</span>
                  : undefined
              }
            >
              {stats.monthlyData.length === 0
                ? <p className="text-gray-300 text-sm text-center py-8">日付が設定された投稿がありません</p>
                : <LineChart data={stats.monthlyData} />
              }
            </StatCard>

            {/* ③ 評価分布 */}
            <StatCard title="③ 評価分布">
              <RatingBarChart data={stats.ratingData} />
            </StatCard>

            {/* ④ 都道府県ランキング */}
            <StatCard title="④ 都道府県ランキング">
              {stats.prefData.filter(d => d.name !== 'その他').length === 0
                ? <p className="text-gray-300 text-sm text-center py-8">住所が設定された投稿がありません</p>
                : <PrefBarChart data={stats.prefData} />
              }
            </StatCard>
          </>
        )}

        {/* Load Posts Button or Posts List */}
        {stats && (
          <div className="pt-4 pb-8">
            {!showPosts ? (
              <button
                onClick={() => setShowPosts(true)}
                className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-[0_4px_12px_rgba(249,115,22,0.2)] hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                この条件の投稿を見る
              </button>
            ) : (
              <FilteredPostsList isMyPageMode={isMyPageMode} profileId={profile?.id} />
            )}
          </div>
        )}
      </main>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        initialFilters={{
          tags: filterState.advancedFilters?.tags || [],
          activeGroups: filterState.activeGroups || [],
          registrantUserIds: filterState.advancedFilters?.registrantUserIds || [],
          filterMode: filterState.advancedFilters?.filterMode || 'group',
          tagMatchMode: filterState.advancedFilters?.tagMatchMode || filterState.tagMatchMode || 'AND',
        }}
        onApply={(newFilters) => {
          updateFilter({
            activeGroups: newFilters.activeGroups,
            advancedFilters: {
              ...filterState.advancedFilters,
              tags: newFilters.tags,
              registrantUserIds: newFilters.registrantUserIds,
              filterMode: newFilters.filterMode,
              tagMatchMode: newFilters.tagMatchMode,
            },
            tagMatchMode: newFilters.tagMatchMode,
          });
          setIsFilterModalOpen(false);
        }}
        hideGroupAndRegistrant={isMyPageMode}
      />
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#fcfcfc] min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-400" size={32} />
      </div>
    }>
      <StatsPageInner />
    </Suspense>
  );
}
