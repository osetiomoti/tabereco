'use client';

import { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/Header';
import { Loader2, AlertCircle, Filter, X, Search } from 'lucide-react';
import { FilterModal } from '@/components/FilterModal';
import { FilterChips } from '@/components/PostCard';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useSearchParams } from 'next/navigation';
import { useMyProfile } from '@/hooks/useAppData';
import Image from 'next/image';
import Link from 'next/link';
import { useTimeline } from '@/hooks/useTimeline';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';
import { getImageUrl } from '@/lib/image';

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

// ─── Vertical Bar Chart (rating distribution) ───────────────────────────────────
function RatingBarChart({ data, activeLabel, onRatingClick }: { data: { label: string; count: number }[], activeLabel?: string, onRatingClick: (label: string) => void }) {
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
        const isActive = activeLabel === d.label;
        return (
          <button
            key={i}
            onClick={() => onRatingClick(d.label)}
            className={`w-full flex items-center gap-3 rounded-xl transition-all px-1 py-0.5 ${
              isActive ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-[12px] font-black text-gray-600 w-12 flex-shrink-0 text-left">{d.label}</span>
            <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                style={{
                  width: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                  background: isActive ? '#ea580c' : (ratingColors[d.label] || '#e5e7eb'),
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-gray-400 w-8 text-right flex-shrink-0">{d.count}件</span>
          </button>
        );
      })}
      {activeLabel && (
        <p className="text-[11px] text-orange-500 font-bold text-center mt-1">↥ {activeLabel}で絞り込み中（クリアするには再度タップ）</p>
      )}
    </div>
  );
}

// ─── Horizontal Bar Chart (prefecture ranking) ────────────────────────────────────
function PrefBarChart({ data, activePref, onPrefClick }: { data: { name: string; count: number }[], activePref?: string, onPrefClick: (pref: string) => void }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const displayData = data.slice(0, 15);

  return (
    <div className="space-y-2">
      {displayData.map((d, i) => {
        const pct = (d.count / maxCount) * 100;
        const opacity = 1 - (i / displayData.length) * 0.5;
        const isActive = activePref === d.name;
        return (
          <button
            key={i}
            onClick={() => onPrefClick(d.name)}
            className={`w-full flex items-center gap-2 rounded-xl transition-all px-1 py-0.5 ${
              isActive ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-[10px] font-black text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
            <span className={`text-[12px] font-bold w-14 flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-700'}`}>{d.name}</span>
            <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-1.5 transition-all"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  background: isActive ? '#ea580c' : `rgba(249, 115, 22, ${opacity})`,
                }}
              >
                <span className="text-white text-[9px] font-black drop-shadow-sm">{d.count}</span>
              </div>
            </div>
          </button>
        );
      })}
      {activePref && (
        <p className="text-[11px] text-orange-500 font-bold text-center mt-1">↥ {activePref}で絞り込み中（クリアするには再度タップ）</p>
      )}
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

function FilteredPostsList({ keyword, searchMode }: { keyword: string, searchMode: string }) {
  const [activeTab, setActiveTab] = useState<'visited' | 'want_to_go'>('visited');

  const {
    posts,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore
  } = useTimeline({
    timelineMode: 'home',
    filters: { status: activeTab, keyword, searchMode }
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
                  <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
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
  
  const { filterState, updateFilter, isLoaded: isFilterLoaded } = useSharedFilter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const mode = searchParams.get('mode');
  const queryUserId = searchParams.get('userId');
  const isFromMypage = from === 'mypage' || mode === 'mypage';
  const hasInitializedFromMypage = useRef(false);

  const { profile } = useMyProfile();
  const { appType } = useAppType();
  const { memberUsers, joinedGroups, isLoading: isGroupsLoading } = useGroupMembers();

  // マイページから遷移してきた場合、フィルターを「自分のみ（または対象ユーザーのみ）」に設定
  useEffect(() => {
    if (isFromMypage && !hasInitializedFromMypage.current && (profile?.id || queryUserId)) {
      hasInitializedFromMypage.current = true;
      const targetId = queryUserId || profile?.id;
      if (targetId) {
        updateFilter({
          filterMode: 'registrant',
          activeGroups: [],
          advancedFilters: {
            ...filterState.advancedFilters,
            filterMode: 'registrant',
            registrantUserIds: [targetId],
            include_mine: true,
          },
        });
      }
    }
  }, [isFromMypage, profile?.id, queryUserId, updateFilter, filterState.advancedFilters]);

  const [showPosts, setShowPosts] = useState(false);
  const [lastQueryString, setLastQueryString] = useState('');
  const [activePref, setActivePref] = useState<string | undefined>(undefined);
  const [activeRatingLabel, setActiveRatingLabel] = useState<string | undefined>(undefined);

  // 統計画面のキーワード検索は sharedFilter と独立したローカルstateで管理する
  // （検索画面のキーワードを引き継がない）
  const [inputValue, setInputValue] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [localSearchMode, setLocalSearchMode] = useState<'store_name' | 'address'>('store_name');
  const searchMode = localSearchMode;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(inputValue);
      // sharedFilter には書き戻さない（検索画面に影響させない）
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // フィルタ状態からクエリ文字列を構築
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    // SharedFilterからのパラメータ
    const advanced = filterState.advancedFilters || {};
    const tags = advanced.tags || [];
    
    if (debouncedKeyword) {
      params.append('keyword', debouncedKeyword);
      params.append('search_mode', searchMode);
    }

    if (activePref) params.append('pref', activePref);
    if (activeRatingLabel) {
      if (activeRatingLabel === '未評価') {
        params.append('rating_unrated', 'true');
      } else {
        const star = parseInt(activeRatingLabel.replace('★', ''), 10);
        if (!isNaN(star)) {
          params.append('rating_min', String(star - 1));
          params.append('rating_max', String(star));
        }
      }
    }
    
    if (tags.length > 0) {
      params.append('selected_tags', tags.join(','));
      params.append('tag_match_mode', advanced.tagMatchMode || filterState.tagMatchMode || 'AND');
    }
    // 統計画面は検索画面のステータス（visited/want_to_go）を引き継がない（全体統計を表示）
    
    // Hot spring filters
    if (advanced.is_hot_spring_mode) {
      params.append('is_hot_spring_mode', 'true');
      if (advanced.spring_temp_min != null) params.append('spring_temp_min', String(advanced.spring_temp_min));
      if (advanced.spring_temp_max != null) params.append('spring_temp_max', String(advanced.spring_temp_max));
      if (advanced.is_source_fed) params.append('is_source_fed', advanced.is_source_fed);
      if (advanced.bath_type) params.append('bath_type', advanced.bath_type);
      if (advanced.stay_type) params.append('stay_type', advanced.stay_type);
    }

    const currentFilterMode = filterState.filterMode || advanced.filterMode || 'group';
    if (currentFilterMode === 'group') {
      if (filterState.activeGroups && filterState.activeGroups.length > 0 && !filterState.activeGroups.includes('all')) {
        params.append('group_ids', filterState.activeGroups.join(','));
      }
    } else {
      const registrantIds = advanced.registrantUserIds || (filterState as any).registrantUserIds;
      if (registrantIds && registrantIds.length > 0) {
        params.append('registrant_ids', registrantIds.join(','));
      }
    }

    params.set('timeline_mode', 'home');

    return params.toString();
  }, [filterState, debouncedKeyword, searchMode, activePref, activeRatingLabel]);

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
  
  const currentFilterMode = filterState.filterMode || filterState.advancedFilters?.filterMode || 'group';
  const registrantIds: string[] = filterState.advancedFilters?.registrantUserIds || (filterState as any).registrantUserIds || [];
  const isRegistrantFiltered = currentFilterMode === 'registrant' && registrantIds.length > 0;
  const isGroupFiltered = currentFilterMode === 'group' && filterState.activeGroups?.length > 0 && !filterState.activeGroups.includes('all');

  const removeFilter = (key: string | string[] | Record<string, any>) => {
    // 1. 全解除（クリアボタン押下時）
    if (key === 'clear_all' || (Array.isArray(key) && key.length === 0)) {
      setActivePref(undefined);
      setActiveRatingLabel(undefined);
      updateFilter({
        activeTab: 'all',
        activeGroups: ['all'],
        advancedFilters: null,
      });
      return;
    }

    // 2. オブジェクト指定（グループ除外や投稿者除外）
    if (typeof key === 'object' && !Array.isArray(key)) {
      if ('activeGroups' in key) {
        const newGroups = key.activeGroups.length === 0 ? ['all'] : key.activeGroups;
        updateFilter({ activeGroups: newGroups });
        return;
      }
      if ('registrantUserIds' in key) {
        updateFilter({
          advancedFilters: {
            ...(filterState.advancedFilters || {}),
            registrantUserIds: key.registrantUserIds,
          },
        });
        return;
      }
    }

    // 3. 都道府県解除
    if (key === 'pref') {
      setActivePref(undefined);
      return;
    }

    // 4. 評価ラベル解除
    if (key === 'ratingLabel') {
      setActiveRatingLabel(undefined);
      return;
    }

    let next = { ...(filterState.advancedFilters || {}) };

    // 5. タグ配列指定
    if (Array.isArray(key)) {
      next.tags = key;
    } else if (key === 'status') {
      // 6. 状態解除
      delete next.status;
      updateFilter({ activeTab: 'all', advancedFilters: Object.keys(next).length > 0 ? next : null });
      return;
    } else if (key === 'price') {
      // 7. 価格帯解除
      delete next.price_min;
      delete next.price_max;
    } else if (key === 'rating') {
      // 8. 評価解除
      delete next.rating_min;
      delete next.rating_max;
      delete next.rating_unrated;
    } else if (key === 'period') {
      // 9. 期間解除
      delete next.period;
      delete next.period_start;
      delete next.period_end;
    } else {
      delete next[key as string];
    }

    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  const activeFilterCount = useMemo(() => {
    const advanced = filterState.advancedFilters;
    const activeGroups = filterState.activeGroups || [];
    const activeTab = filterState.activeTab;

    const baseCount = advanced
      ? Object.entries(advanced).filter(
          ([k, v]: [string, any]) =>
            v !== undefined &&
            v !== null &&
            v !== 'all' &&
            v !== 'none' &&
            v !== '' &&
            v !== false &&
            k !== 'activeGroups' &&
            k !== 'tags' &&
            k !== 'registrantUserIds' &&
            k !== 'sort_order' &&
            k !== 'status'
        ).length +
          (advanced.tags?.length || 0) +
          (advanced.registrantUserIds?.length || 0)
      : 0;

    const groupCount = activeGroups.filter((x: string) => x !== 'all').length > 0 ? 1 : 0;
    const statusCount = (activeTab && activeTab !== 'all') || (advanced?.status && advanced.status !== 'all') ? 1 : 0;
    const prefCount = activePref ? 1 : 0;
    const ratingLabelCount = activeRatingLabel ? 1 : 0;

    return baseCount + groupCount + statusCount + prefCount + ratingLabelCount;
  }, [filterState.advancedFilters, filterState.activeGroups, filterState.activeTab, activePref, activeRatingLabel]);

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

  const handlePrefClick = (pref: string) => {
    setActivePref(prev => prev === pref ? undefined : pref);
    setShowPosts(false);
  };

  const handleRatingClick = (label: string) => {
    setActiveRatingLabel(prev => prev === label ? undefined : label);
    setShowPosts(false);
  };

  return (
    <div className="bg-[#fcfcfc] min-h-[100dvh] pb-24">
      <Header title="統計">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeFilterCount > 0
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title="絞り込みフィルター"
          aria-label="絞り込みフィルター"
        >
          <Filter size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white text-orange-500 text-[9px] font-black rounded-full flex items-center justify-center border border-orange-200">
              {activeFilterCount}
            </span>
          )}
        </button>
      </Header>

      <main className="max-w-2xl mx-auto w-full px-4 pt-1.5 pb-28 animate-fade-in space-y-2.5">
        {/* 1. 検索・フィルター操作エリア（1行統合型） */}
        <div className="flex flex-col gap-1.5 mb-2">
          {/* 1行統合バー：店名/住所切り替えトグル ＋ キーワード入力欄 */}
          <div className="flex items-center gap-1.5 bg-gray-50/90 border border-gray-200/70 rounded-2xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-300 focus-within:bg-white transition-all">
            {/* 店名／住所 切り替えピル */}
            <div className="flex bg-gray-200/60 p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setLocalSearchMode('store_name')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-[11px] font-black transition-all ${
                  searchMode !== 'address'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>🏪</span>
                <span>店名</span>
              </button>
              <button
                type="button"
                onClick={() => setLocalSearchMode('address')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-[11px] font-black transition-all ${
                  searchMode === 'address'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>📍</span>
                <span>住所</span>
              </button>
            </div>

            {/* キーワード入力欄 */}
            <div className="relative flex-1 flex items-center min-w-0">
              <Search className="absolute left-1.5 text-gray-400 shrink-0 pointer-events-none" size={14} />
              <input
                type="text"
                placeholder={searchMode === 'address' ? '住所・エリアで検索 (東京など)...' : '店名で検索...'}
                className="w-full pl-6 pr-6 py-1 text-[12px] font-medium text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setDebouncedKeyword('');
                    updateFilter({ keyword: '' });
                  }}
                  className="absolute right-1 text-gray-300 hover:text-gray-500 transition-colors p-1"
                  aria-label="検索キーワードをクリア"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* アクティブなフィルターチップ（1行横スクロール） */}
          <FilterChips
            filters={{
              ...(filterState.advancedFilters || {}),
              status: filterState.activeTab,
              filterMode: filterState.filterMode || 'group',
              activeGroups: filterState.activeGroups,
              pref: activePref,
              ratingLabel: activeRatingLabel,
            }}
            onRemove={removeFilter}
            users={memberUsers}
            groups={joinedGroups}
            isLoading={!isFilterLoaded || isGroupsLoading}
          />
        </div>

        {/* 2. 件数表示 ＆ グラフ／カレンダー切り替え（1行に統合して省スペース化） */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] font-black text-gray-700">
              📊 {stats ? `${stats.totalPosts} 件の記録` : '...'}
            </span>
            {inputValue && (
              <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                (「{inputValue}」)
              </span>
            )}
          </div>

          {/* コンパクトなグラフ/カレンダー切り替えピル */}
          <div className="flex bg-gray-100/90 rounded-xl p-0.5 border border-black/5 shadow-inner">
            <div className="px-3 py-1 text-[11px] font-black rounded-[9px] bg-white text-gray-900 shadow-xs">
              グラフ
            </div>
            <Link
              href="/calendar"
              className="px-3 py-1 text-[11px] font-black rounded-[9px] text-gray-400 hover:text-gray-600 transition-all duration-200"
            >
              カレンダー
            </Link>
          </div>
        </div>
        {isLoading && (
          <div className="space-y-4">
            {/* ローディングステータス通知 */}
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-orange-500">
              <Loader2 className="animate-spin text-orange-500" size={16} />
              <span>統計データを集計中...</span>
            </div>

            {/* TOTAL サマリーカードのスケルトン */}
            <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-3xl p-5 border border-orange-100/60 animate-pulse">
              <div className="w-14 h-3 bg-orange-200/50 rounded mb-3" />
              <div className="w-24 h-9 bg-orange-200/60 rounded-xl mb-2" />
              <div className="w-44 h-3 bg-orange-100/70 rounded" />
            </div>

            {/* ① ジャンル割合 スケルトン */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 animate-pulse">
              <div className="w-32 h-4 bg-gray-200 rounded" />
              <div className="w-44 h-44 mx-auto bg-gray-100 rounded-full flex items-center justify-center border-8 border-gray-50" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
              </div>
            </div>

            {/* ② 価格帯 スケルトン */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 animate-pulse">
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-100 rounded-2xl" />
            </div>
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
              <p className="text-[12px] font-bold text-orange-300 mt-0.5">
                {isRegistrantFiltered && registrantIds.length === 1 && registrantIds[0] === profile?.id ? 'あなたの投稿数' : '絞り込み条件に一致する投稿数'}
              </p>
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
              <RatingBarChart data={stats.ratingData} activeLabel={activeRatingLabel} onRatingClick={handleRatingClick} />
            </StatCard>

            {/* ④ 都道府県ランキング */}
            <StatCard title="④ 都道府県ランキング">
              {stats.prefData.filter(d => d.name !== 'その他').length === 0
                ? <p className="text-gray-300 text-sm text-center py-8">住所が設定された投稿がありません</p>
                : <PrefBarChart data={stats.prefData} activePref={activePref} onPrefClick={handlePrefClick} />
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
              <FilteredPostsList keyword={debouncedKeyword} searchMode={searchMode} />
            )}
          </div>
        )}
      </main>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        initialFilters={{
          ...(filterState.advancedFilters || {}),
          tags: filterState.advancedFilters?.tags || [],
          activeGroups: filterState.activeGroups || [],
          registrantUserIds: filterState.advancedFilters?.registrantUserIds || [],
          filterMode: filterState.filterMode || filterState.advancedFilters?.filterMode || 'group',
          tagMatchMode: filterState.tagMatchMode || filterState.advancedFilters?.tagMatchMode || 'AND',
          status: filterState.activeTab || 'all',
          is_hot_spring_mode: filterState.advancedFilters?.is_hot_spring_mode || false,
          spring_temp_min: filterState.advancedFilters?.spring_temp_min,
          spring_temp_max: filterState.advancedFilters?.spring_temp_max,
          is_source_fed: filterState.advancedFilters?.is_source_fed,
          bath_type: filterState.advancedFilters?.bath_type,
          stay_type: filterState.advancedFilters?.stay_type,
        }}
        onApply={(f) => {
          const { activeGroups: newGroups, status: newStatus, filterMode, ...rest } = f as any;
          updateFilter({
            activeGroups: newGroups || ['all'],
            activeTab: newStatus || filterState.activeTab,
            filterMode: filterMode || 'group',
            tagMatchMode: f.tagMatchMode || filterState.tagMatchMode || 'AND',
            advancedFilters: {
              ...filterState.advancedFilters,
              ...rest,
              filterMode: filterMode || 'group',
              registrantUserIds: f.registrantUserIds || [],
            },
          });
          setIsFilterModalOpen(false);
        }}
        showHotSpringFilter={appType === 'tabireco'}
      />
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#fcfcfc] min-h-[100dvh]">
        <Header />
        <main className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-4">
          <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-3xl p-5 border border-orange-100/60 animate-pulse">
            <div className="w-14 h-3 bg-orange-200/50 rounded mb-3" />
            <div className="w-24 h-9 bg-orange-200/60 rounded-xl mb-2" />
            <div className="w-44 h-3 bg-orange-100/70 rounded" />
          </div>
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 animate-pulse">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-44 h-44 mx-auto bg-gray-100 rounded-full" />
          </div>
        </main>
      </div>
    }>
      <StatsPageInner />
    </Suspense>
  );
}
