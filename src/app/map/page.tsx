'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import type { Post } from '@/lib/types';
import { MapPin, Search, Filter, X, UtensilsCrossed, Loader2, Plus } from 'lucide-react';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { FilterModal } from '@/components/FilterModal';
import { FilterChips } from '@/components/PostCard';
import { useAppType } from '@/contexts/AppTypeContext';
import { SearchStoreCard, type StoreGroupItem } from '@/components/SearchStoreCard';
import { groupPostsByStore, pickRepresentativeImage } from '@/lib/storeUtils';
import { appendFilterSearchParams } from '@/lib/searchQuery';
import {
  PREFECTURE_BOUNDS,
  getBoundsForPrefecture,
  getPrefectureFromCoords,
} from '@/lib/prefectures';
import type { MapBounds } from '@/components/MapView';

// Google Maps は `window` を使うため、SSR をオフにして動的インポートする
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  ),
});

const JAPAN_CENTER = { lat: 37.0, lng: 137.5 };
const JAPAN_ZOOM = 5;
const PAGE_SIZE = 100;

function SearchPageInner() {
  const { appType } = useAppType();
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, searchMode, activeGroups, advancedFilters, activeMapTag, filterMode } = filterState;
  const { memberUsers, joinedGroups } = useGroupMembers();

  // 初期表示は「リスト」
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const searchParams = useSearchParams();
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');
  const queryPostId = searchParams.get('postId');

  // URLパラメータ（lat, lng, postId）で遷移してきた場合は自動的にマップを表示
  useEffect(() => {
    if (queryLat && queryLng) {
      setViewMode('map');
    }
  }, [queryLat, queryLng]);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
    if (queryLat && queryLng) {
      return { lat: parseFloat(queryLat), lng: parseFloat(queryLng) };
    }
    return JAPAN_CENTER;
  });
  const [zoom, setZoom] = useState<number>(() => {
    return (queryLat && queryLng) || queryPostId ? 16 : JAPAN_ZOOM;
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number; placeId?: string; name?: string; address?: string } | null>(null);

  // 投稿絞り込み用のキーワード入力（ローカル状態：デバウンスで shared filter に反映）
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // shared filter の keyword が外部から変わった場合に同期
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  const handleKeywordChange = (value: string) => {
    setLocalKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter({ keyword: value });
    }, 300);
  };

  const handleClearKeyword = () => {
    setLocalKeyword('');
    updateFilter({ keyword: '' });
  };

  useEffect(() => {
    if (queryLat && queryLng) {
      setCenter({ lat: parseFloat(queryLat), lng: parseFloat(queryLng) });
      setZoom(16);
    }
  }, [queryLat, queryLng]);

  // ═══════════════════════════════════════════════════
  // 1. リスト表示データ取得（100件ずつページネーション＆無限スクロール）
  // ═══════════════════════════════════════════════════
  const [listPosts, setListPosts] = useState<Post[]>([]);
  const [listTotal, setListTotal] = useState<number>(0);
  const [listPage, setListPage] = useState<number>(1);
  const [listHasMore, setListHasMore] = useState<boolean>(true);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listLoadingMore, setListLoadingMore] = useState<boolean>(false);

  const listRequestIdRef = useRef<number>(0);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // 初回取得 / フィルター変更時の再取得
  const fetchInitialList = useCallback(async () => {
    const reqId = ++listRequestIdRef.current;
    setListLoading(true);
    setListPage(1);

    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('limit', String(PAGE_SIZE));
    appendFilterSearchParams(params, filterState);

    try {
      const res = await fetch(`/api/posts/search?${params.toString()}`);
      const json = await res.json();
      if (reqId === listRequestIdRef.current && json.success) {
        setListPosts(json.items || []);
        setListTotal(json.total || 0);
        setListHasMore(!!json.hasMore);
        setListPage(1);
      }
    } catch (e) {
      console.error('[SearchPage] fetchInitialList error:', e);
    } finally {
      if (reqId === listRequestIdRef.current) {
        setListLoading(false);
      }
    }
  }, [filterState]);

  // 追加取得（次の100件）
  const fetchMoreList = useCallback(async () => {
    if (listLoadingMore || !listHasMore || listLoading) return;
    setListLoadingMore(true);

    const nextPage = listPage + 1;
    const reqId = listRequestIdRef.current;

    const params = new URLSearchParams();
    params.append('page', String(nextPage));
    params.append('limit', String(PAGE_SIZE));
    appendFilterSearchParams(params, filterState);

    try {
      const res = await fetch(`/api/posts/search?${params.toString()}`);
      const json = await res.json();
      if (reqId === listRequestIdRef.current && json.success) {
        const newItems: Post[] = json.items || [];
        setListPosts((prev) => {
          const map = new Map<string, Post>();
          prev.forEach((p) => map.set(p.id, p));
          newItems.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
        setListTotal(json.total || 0);
        setListHasMore(!!json.hasMore);
        setListPage(nextPage);
      }
    } catch (e) {
      console.error('[SearchPage] fetchMoreList error:', e);
    } finally {
      setListLoadingMore(false);
    }
  }, [filterState, listHasMore, listLoading, listLoadingMore, listPage]);

  // フィルター変更時に初回取得を実行
  useEffect(() => {
    fetchInitialList();
  }, [fetchInitialList]);

  // 投稿作成・更新・削除などのイベント通知を受信した際に自動再フェッチ
  useEffect(() => {
    const handleUpdate = () => {
      fetchInitialList();
    };
    window.addEventListener('app:post-updated', handleUpdate);
    window.addEventListener('app:post-created', handleUpdate);
    return () => {
      window.removeEventListener('app:post-updated', handleUpdate);
      window.removeEventListener('app:post-created', handleUpdate);
    };
  }, [fetchInitialList]);

  // IntersectionObserver による無限スクロール監視
  useEffect(() => {
    if (viewMode !== 'list') return;
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && listHasMore && !listLoading && !listLoadingMore) {
          fetchMoreList();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [viewMode, listHasMore, listLoading, listLoadingMore, fetchMoreList]);

  // ═══════════════════════════════════════════════════
  // 2. マップ表示データ取得（都道府県全体Bounds＆表示範囲に応じた軽量ピン取得）
  // ═══════════════════════════════════════════════════

  // 初期表示の都道府県Bounds（愛知県、東京都などの都道府県全体範囲）
  const [mapInitialBounds, setMapInitialBounds] = useState<MapBounds | null>(() => {
    if (typeof window === 'undefined') return null;
    const cachedPref = sessionStorage.getItem('tabereco_user_pref');
    if (cachedPref) {
      const b = getBoundsForPrefecture(cachedPref);
      if (b) return b;
    }
    return null;
  });

  // 現在地取得と都道府県判定
  // ─── ユーザー位置情報と初期Bounds設定（localStorageで永続化し次回以降は確認しない） ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // URLに個別地点クエリがある場合はそちらが優先
    if (queryLat && queryLng) return;

    // 1. すでに保存された都道府県・位置情報がある場合は即座にそれを復元（ブラウザ許可プロンプトを再発させない）
    try {
      const savedPref = localStorage.getItem('tabereco_user_pref');
      if (savedPref) {
        const b = getBoundsForPrefecture(savedPref);
        if (b) {
          setMapInitialBounds(b);
          return;
        }
      }
      // 過去に拒否または確認済みの場合は自動取得をスキップ
      if (localStorage.getItem('tabereco_geo_status') === 'denied') {
        const fallbackBounds = getBoundsForPrefecture('愛知県') || PREFECTURE_BOUNDS['愛知県'];
        if (!mapInitialBounds) setMapInitialBounds(fallbackBounds);
        return;
      }
    } catch (e) {}

    if (!navigator.geolocation) {
      const fallbackBounds = getBoundsForPrefecture('愛知県') || PREFECTURE_BOUNDS['愛知県'];
      if (!mapInitialBounds) setMapInitialBounds(fallbackBounds);
      return;
    }

    // 2. 初回のみ位置情報を取得（一度取得できたらlocalStorageに保存して二度と自動確認しない）
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const prefName = getPrefectureFromCoords(lat, lng) || '愛知県';
        try {
          localStorage.setItem('tabereco_user_loc', JSON.stringify({ lat, lng }));
          localStorage.setItem('tabereco_user_pref', prefName);
          localStorage.setItem('tabereco_geo_status', 'granted');
        } catch (e) {}

        const b = getBoundsForPrefecture(prefName);
        if (b) {
          setMapInitialBounds(b);
        }
      },
      (err) => {
        console.log('[SearchPage] Geolocation fallback:', err.message);
        try {
          localStorage.setItem('tabereco_geo_status', 'denied');
        } catch (e) {}
        const fallbackBounds = getBoundsForPrefecture('愛知県') || PREFECTURE_BOUNDS['愛知県'];
        if (!mapInitialBounds) {
          setMapInitialBounds(fallbackBounds);
        }
      },
      { timeout: 6000, enableHighAccuracy: false }
    );
  }, [mapInitialBounds, queryLat, queryLng]);

  // マップ用ピンデータ
  const [mapPosts, setMapPosts] = useState<Post[]>([]);
  const [mapLoading, setMapLoading] = useState<boolean>(false);
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null);
  const mapRequestIdRef = useRef<number>(0);
  const mapDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // マップデータ取得関数（表示範囲Boundsに基づく軽量ピン取得）
  const fetchMapPosts = useCallback(
    async (bounds: MapBounds) => {
      const reqId = ++mapRequestIdRef.current;
      setMapLoading(true);

      const params = new URLSearchParams();
      params.append('north', String(bounds.north));
      params.append('south', String(bounds.south));
      params.append('east', String(bounds.east));
      params.append('west', String(bounds.west));
      appendFilterSearchParams(params, filterState);

      try {
        const res = await fetch(`/api/posts/map?${params.toString()}`);
        const json = await res.json();
        if (reqId === mapRequestIdRef.current && json.success) {
          setMapPosts(json.items || []);
        }
      } catch (e) {
        console.error('[SearchPage] fetchMapPosts error:', e);
      } finally {
        if (reqId === mapRequestIdRef.current) {
          setMapLoading(false);
        }
      }
    },
    [filterState]
  );

  // 地図の移動・ズーム停止時 (idle) コールバック
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      setCurrentBounds(bounds);
      if (mapDebounceTimerRef.current) clearTimeout(mapDebounceTimerRef.current);
      mapDebounceTimerRef.current = setTimeout(() => {
        fetchMapPosts(bounds);
      }, 350);
    },
    [fetchMapPosts]
  );

  // フィルター変更時に現在の表示範囲（または初期Bounds）でマップデータを再取得
  useEffect(() => {
    if (currentBounds) {
      fetchMapPosts(currentBounds);
    } else if (mapInitialBounds) {
      fetchMapPosts(mapInitialBounds);
    }
  }, [fetchMapPosts, currentBounds, mapInitialBounds]);

  // ═══════════════════════════════════════════════════
  // 3. 店舗単位でのグルーピング（リスト表示用）
  // ═══════════════════════════════════════════════════
  const storeGroups = useMemo<StoreGroupItem[]>(() => {
    const map = groupPostsByStore(listPosts);
    const items: StoreGroupItem[] = [];

    for (const [storeKey, storePosts] of map.entries()) {
      if (storePosts.length === 0) continue;

      // 自分の投稿（__is_mine === true）を優先
      const myVisitedPost = storePosts.find((p) => (p as any).__is_mine === true && p.status === 'visited');
      const myWantToGoPost = storePosts.find((p) => (p as any).__is_mine === true && p.status === 'want_to_go');
      const anyMyPost = myVisitedPost || myWantToGoPost || storePosts.find((p) => (p as any).__is_mine === true);

      const postWithImg = storePosts.find((p) => p.image_url || (p.image_urls && p.image_urls.length > 0));
      const repPost = anyMyPost || postWithImg || storePosts[0];

      // 代表画像
      const repImage =
        pickRepresentativeImage(storePosts) ||
        repPost.image_url ||
        (repPost.image_urls && repPost.image_urls[0]) ||
        null;

      // 評価の平均値
      const ratings = storePosts.map((p) => p.rating).filter((r): r is number => r != null && r > 0);
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null;

      // ステータス判定（ログインユーザー自身の投稿・マークのみを判定）
      const hasVisited = !!myVisitedPost || storePosts.some((p) => !!(p as any)._isMarkedVisited);
      const hasWantToGo = !hasVisited && (!!myWantToGoPost || storePosts.some((p) => !!(p as any)._isMarkedWantToGo));

      // 自分が詳細登録した投稿のID
      const myPostId =
        myVisitedPost?.id ||
        (anyMyPost && (anyMyPost.status === 'visited' || (anyMyPost as any)._isMarkedVisited) ? anyMyPost.id : null);

      // タグの収集（重複なし）
      const tagSet = new Set<string>();
      storePosts.forEach((p) => {
        p.tags?.forEach((t: any) => {
          if (t.name) tagSet.add(t.name);
        });
      });

      // ユニークユーザー数（行った人の数）
      const userIds = new Set<string>();
      storePosts.forEach((p) => {
        if (p.user_id) userIds.add(p.user_id);
      });

      // 価格帯（店舗内の全投稿から最小・最大を算出）
      const pricesMin = storePosts.map((p) => p.price_min).filter((p): p is number => p != null);
      const pricesMax = storePosts.map((p) => p.price_max).filter((p): p is number => p != null);
      const priceMin = pricesMin.length > 0 ? Math.min(...pricesMin) : (repPost.price_min ?? null);
      const priceMax = pricesMax.length > 0 ? Math.max(...pricesMax) : (repPost.price_max ?? null);

      items.push({
        storeKey,
        storeName: repPost.store_name || repPost.title || '店舗名未設定',
        address: repPost.address || null,
        representativePost: repPost,
        representativeImage: repImage,
        postCount: storePosts.length,
        userCount: userIds.size,
        hasVisited,
        hasWantToGo,
        myPostId,
        avgRating,
        tags: Array.from(tagSet),
        latitude: repPost.latitude || null,
        longitude: repPost.longitude || null,
        priceMin,
        priceMax,
      });
    }

    return items;
  }, [listPosts]);

  // フィルター削除ヘルパー
  const removeFilter = (key: string | string[] | Record<string, any>) => {
    // 1. 全解除（クリアボタン押下時）
    if (key === 'clear_all' || (Array.isArray(key) && key.length === 0)) {
      updateFilter({
        activeTab: 'all',
        activeGroups: ['all'],
        advancedFilters: null,
        activeMapTag: null,
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
            ...(advancedFilters || {}),
            registrantUserIds: key.registrantUserIds,
          },
        });
        return;
      }
    }

    let next = { ...(advancedFilters || {}) };

    // 3. タグ配列指定
    if (Array.isArray(key)) {
      next.tags = key;
    } else if (key === 'status') {
      // 4. 状態解除
      delete next.status;
      updateFilter({ activeTab: 'all', advancedFilters: Object.keys(next).length > 0 ? next : null });
      return;
    } else if (key === 'price') {
      // 5. 価格帯解除
      delete next.price_min;
      delete next.price_max;
    } else if (key === 'rating') {
      // 6. 評価解除
      delete next.rating_min;
      delete next.rating_max;
      delete next.rating_unrated;
    } else if (key === 'period') {
      // 7. 期間解除
      delete next.period;
      delete next.period_start;
      delete next.period_end;
    } else {
      delete next[key as string];
    }

    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  const activeFilterCount = useMemo(() => {
    const baseCount = advancedFilters
      ? Object.entries(advancedFilters).filter(
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
          (advancedFilters.tags?.length || 0) +
          (advancedFilters.registrantUserIds?.length || 0)
      : 0;

    const groupCount = activeGroups.filter((x: string) => x !== 'all').length > 0 ? 1 : 0;
    const statusCount = (activeTab && activeTab !== 'all') || (advancedFilters?.status && advancedFilters.status !== 'all') ? 1 : 0;

    return baseCount + groupCount + statusCount;
  }, [advancedFilters, activeGroups, activeTab]);

  return (
    <>
      <Header title="検索">
        <div className="flex items-center gap-2">
          <Link
            href="/posts/new"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-gradient-to-tr from-primary-500 to-orange-400 text-white shadow-sm active:scale-90"
            title="新しく記録する"
            aria-label="新しく記録する"
          >
            <Plus size={20} strokeWidth={2.6} />
          </Link>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              activeFilterCount > 0
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Filter size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white text-orange-500 text-[9px] font-black rounded-full flex items-center justify-center border border-orange-200">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </Header>

      <main className="max-w-2xl mx-auto w-full px-4 pt-3 pb-28 animate-fade-in">
        {/* 1. 検索・フィルター操作エリア */}
        <div className="flex flex-col gap-2 mb-3">
          {/* 検索モード切り替えトグル（店名 / 住所） */}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                updateFilter({ searchMode: 'store_name', keyword: '' });
                setLocalKeyword('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                searchMode !== 'address'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200/60'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              🏪 店名で絞り込み
            </button>
            <button
              onClick={() => {
                updateFilter({ searchMode: 'address', keyword: '' });
                setLocalKeyword('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                searchMode === 'address'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200/60'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              📍 住所で絞り込み
            </button>
          </div>

          {/* キーワード入力バー */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={
                searchMode === 'address'
                  ? '住所・エリアで絞り込み（例：渋谷区、銀座...）'
                  : '店名で絞り込み...'
              }
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-2xl text-[12px] font-medium text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-300 shadow-xs transition-all"
              value={localKeyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
            {localKeyword && (
              <button
                onClick={handleClearKeyword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* アクティブなフィルターチップ */}
          <FilterChips
            filters={{
              ...(advancedFilters || {}),
              status: activeTab,
              filterMode: filterMode || 'group',
              activeGroups: activeGroups,
            }}
            onRemove={removeFilter}
            users={memberUsers}
            groups={joinedGroups}
          />
        </div>

        {/* 2. リスト／マップ 切り替えUI（思い出画面と完全同一仕様） */}
        <div className="flex bg-gray-100/80 rounded-[14px] p-1 mb-3 border border-black/5 shadow-inner">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            リスト
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            マップ
          </button>
        </div>

        {/* 3. 検索結果件数表示 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-black text-gray-500">
            {viewMode === 'list'
              ? `📍 ${storeGroups.length} 店舗表示中`
              : `📍 ${mapPosts.filter((p: Post) => p.latitude && p.longitude).length} 件のピン表示中`}
            {localKeyword && (
              <span className="text-gray-400 font-normal"> (「{localKeyword}」で絞り込み)</span>
            )}
          </span>
          {viewMode === 'list' && listTotal > 0 && storeGroups.length < listTotal && (
            <span className="text-[10px] font-medium text-gray-400">
              全 {listTotal} 件中
            </span>
          )}
        </div>

        {/* 4. メイン表示エリア（リストまたはマップ） */}
        {viewMode === 'list' ? (
          <div>
            {listLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : storeGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                  <UtensilsCrossed size={32} />
                </div>
                <p className="text-gray-400 text-xs font-bold">条件に合う店舗が見つかりませんでした</p>
                {(localKeyword || activeFilterCount > 0) && (
                  <button
                    onClick={() => {
                      handleClearKeyword();
                      updateFilter({
                        activeMapTag: null,
                        advancedFilters: undefined,
                      });
                    }}
                    className="text-xs text-orange-500 font-bold underline"
                  >
                    フィルターをクリア
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {storeGroups.map((store) => (
                  <SearchStoreCard key={store.storeKey} store={store} />
                ))}

                {/* 無限スクロールの監視ターゲット要素 */}
                <div ref={observerTargetRef} className="py-4 flex items-center justify-center min-h-[48px]">
                  {listLoadingMore && (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <Loader2 size={16} className="animate-spin text-orange-500" />
                      <span>次の店舗を読み込み中...</span>
                    </div>
                  )}
                  {!listHasMore && listPosts.length > 0 && (
                    <p className="text-[11px] font-bold text-gray-300">
                      すべての店舗を表示しました（全 {listTotal} 件）
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[calc(100dvh-285px)] min-h-[360px] rounded-2xl overflow-hidden border border-gray-100 relative shadow-sm">
            {mapLoading && (
              <div className="absolute top-3 left-3 z-[160] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1.5 pointer-events-none">
                <Loader2 size={12} className="animate-spin text-orange-500" />
                <span className="text-[10px] font-bold text-gray-600">店舗を更新中...</span>
              </div>
            )}
            <MapView
              posts={mapPosts}
              center={center}
              zoom={zoom}
              initialBounds={mapInitialBounds}
              onBoundsChange={handleBoundsChange}
              tempMarker={tempMarker}
              setTempMarker={setTempMarker}
              initialSelectedPostId={queryPostId}
            />
          </div>
        )}
      </main>

      {/* 画面右下のフローティングアクションボタン（＋ 記録する） */}
      <FloatingActionButton />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(f) => {
          const { activeGroups: newGroups, status: newStatus, ...rest } = f as any;
          const cleanedRest = Object.fromEntries(
            Object.entries(rest).filter(
              ([, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
            )
          );

          updateFilter({
            activeTab: newStatus || 'all',
            filterMode: (f as any).filterMode || 'group',
            activeGroups: newGroups || ['all'],
            advancedFilters: Object.keys(cleanedRest).length > 0 ? cleanedRest : undefined,
          });
        }}
        initialFilters={
          {
            ...(advancedFilters || {}),
            status: activeTab,
            filterMode: filterMode || 'group',
            activeGroups: activeGroups,
          } as any
        }
        showHotSpringFilter={appType === 'tabireco'}
      />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-gray-50 flex items-center justify-center min-h-screen">
          <MapPin className="text-orange-500 animate-bounce" size={48} />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
