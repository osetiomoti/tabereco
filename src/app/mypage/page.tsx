'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Settings, Plus, MapPin, Calendar, User, Search, Star, ThumbsUp, Filter, Bookmark, BarChart2 } from 'lucide-react';
import { FilterModal } from '@/components/FilterModal';
import { Header } from '@/components/Header';
import Image from 'next/image';
import Link from 'next/link';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import { formatDate, getGoogleMapsUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { useMyProfile } from '@/hooks/useAppData';
import { useAppType } from '@/contexts/AppTypeContext';
import { getImageUrl } from '@/lib/image';
import { getStoreKey, pickRepresentativeImage } from '@/lib/storeUtils';

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - i) * 100));
        return (
          <div key={i} className="relative w-[11px] h-[11px]">
            <Star size={11} className="text-gray-200 fill-gray-200 absolute inset-0" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
              <Star size={11} className="text-orange-400 fill-orange-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
}


/** Restricted card shown to strangers instead of the real post card */
function RestrictedCard({ post }: { post: any }) {
  const mapsUrl = getGoogleMapsUrl(post);
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative aspect-square bg-gray-100 overflow-hidden touch-manipulation block"
    >
      {/* blurred placeholder */}
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100">
        <span className="text-2xl grayscale opacity-40">🔒</span>
        <span className="text-[8px] font-black text-gray-400 text-center leading-tight">
          非公開
        </span>
      </div>
      {/* bottom bar with store name */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
        <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">
          {post.store_name || post.title}
        </span>
      </div>
      {/* badge */}
      <div className="absolute top-1.5 left-1.5 bg-gray-700/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none">
        知り合い限定
      </div>
      {/* google maps hint */}
      <div className="absolute top-1.5 right-1.5 bg-blue-500/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none">
        Maps
      </div>
    </a>
  );
}

export default function MyPage() {
  const { appType } = useAppType();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  
  useScrollRestore('mypage');
  const router = useRouter();
  const { filterState, updateFilter } = useSharedFilter();
  const [activeTab, setActiveTab] = useState<'visited' | 'want_to_go' | 'liked'>('visited');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTargetUserId(params.get('userId') || params.get('user_id'));
      const tab = params.get('tab');
      if (tab === 'visited' || tab === 'want_to_go' || tab === 'liked') {
        setActiveTab(tab);
      }
    }
  }, []);

  const { profile: myProfileData, mutate: mutateMyUser } = useMyProfile();
  // myProfileData is the raw .data object from /api/profiles/me
  // (fetcher in useMyProfile returns j.data directly)
  const { data: targetUserData } = useSWR<{ success: boolean, data: any }>(
    targetUserId ? `/api/profiles/${targetUserId}` : null,
    (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json()),
    { revalidateOnMount: true }
  );

  const { data: ownPostsData, isLoading: ownPostsLoading } = useSWR<Post[]>(
    !targetUserId ? '/api/posts?is_mine=true' : null,
    () => getPosts({ is_mine: true })
  );

  const { data: friendsData } = useSWR<any[]>(
    !targetUserId ? '/api/friends' : null,
    () => import('@/lib/api/friends').then(m => m.getFriends())
  );

  // 他人の投稿に付けた「行きたい」
  const { data: markedWantToGoData, isLoading: markedWtgLoading } = useSWR<{ success: boolean, data: Post[] }>(
    !targetUserId ? '/api/posts?marked_want_to_go=true' : null,
    (url: string) => fetch(url).then(r => r.json())
  );

  // 他人の投稿に付けた「行った」
  const { data: markedVisitedData, isLoading: markedVisLoading } = useSWR<{ success: boolean, data: Post[] }>(
    !targetUserId ? '/api/posts?marked_visited=true' : null,
    (url: string) => fetch(url).then(r => r.json())
  );

  // 他人の投稿に付けた「いいね」
  const { data: likedPostsData, isLoading: likedPostsLoading } = useSWR<{ success: boolean, data: Post[] }>(
    !targetUserId ? '/api/posts?liked_by_me=true' : null,
    (url: string) => fetch(url).then(r => r.json())
  );

  const user = targetUserId ? targetUserData?.data?.user : myProfileData;
  const posts: Post[] = targetUserId ? (targetUserData?.data?.posts || []) : (ownPostsData || []);
  const loading = targetUserId ? !targetUserData : ownPostsLoading;
  const friendsCount = targetUserId ? (targetUserData?.data?.friendsCount || 0) : (friendsData?.length || 0);

  // Stats from API
  const avgRating = targetUserId
    ? (targetUserData?.data?.avgRating ?? null)
    : (myProfileData?.avgRating ?? null);
  const totalLikesReceived = targetUserId
    ? (targetUserData?.data?.totalLikesReceived ?? 0)
    : (myProfileData?.totalLikesReceived ?? 0);
  const ratingUserId = targetUserId ?? undefined;

  const [sortField, setSortField] = useState<'created' | 'visited' | 'rating_desc' | 'rating_asc'>('created');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isMyFilterModalOpen, setIsMyFilterModalOpen] = useState(false);
  const [myPageAdvancedFilters, setMyPageAdvancedFilters] = useState<any>({});
  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState<'store_name' | 'address'>('store_name');

  const markedWantToGoPosts: Post[] = markedWantToGoData?.data || [];
  const markedVisitedPosts: Post[] = markedVisitedData?.data || [];
  const likedPosts: Post[] = likedPostsData?.data || [];

  const ownVisitedPosts = posts.filter(p => p.status === 'visited');
  const ownWantToGoPosts = posts.filter(p => p.status === 'want_to_go');

  const ownVisitedCount = ownVisitedPosts.length;
  const ownWantCount = ownWantToGoPosts.length;
  const markedWtgCount = markedWantToGoPosts.length;
  const markedVisCount = markedVisitedPosts.length;

  // 投稿合計（行った+行きたい+他の人の行った+行きたい）
  const totalPostCount = targetUserId
    ? (targetUserData?.data?.totalPostCount ?? ownVisitedCount + ownWantCount)
    : ownVisitedCount + ownWantCount + markedWtgCount + markedVisCount;

  const likedCount = likedPosts.length;

  // まとめ用
  let filteredPosts: any[] = [];
  if (activeTab === 'visited') {
    const allMap = new Map<string, any>();
    [...ownVisitedPosts, ...markedVisitedPosts].forEach(p => allMap.set(p.id, p));
    filteredPosts = Array.from(allMap.values());
  } else if (activeTab === 'want_to_go') {
    const allMap = new Map<string, any>();
    [...ownWantToGoPosts, ...markedWantToGoPosts].forEach(p => allMap.set(p.id, p));
    filteredPosts = Array.from(allMap.values());
  } else if (activeTab === 'liked') {
    filteredPosts = [...likedPosts];
  }

  const applyFilters = (postArray: Post[]) => {
    let result = [...postArray];
    if (keyword) {
      const lower = keyword.toLowerCase();
      if (searchMode === 'store_name') {
        result = result.filter(p =>
          p.title?.toLowerCase().includes(lower) ||
          p.store_name?.toLowerCase().includes(lower) ||
          p.comment?.toLowerCase().includes(lower)
        );
      } else {
        result = result.filter(p =>
          p.address?.toLowerCase().includes(lower)
        );
      }
    }
    if (selectedTags.length > 0) {
      if (myPageAdvancedFilters.tagMatchMode === 'OR') {
        result = result.filter(p =>
          selectedTags.some(tag => p.tags?.some((t: any) => t.name === tag))
        );
      } else {
        result = result.filter(p =>
          selectedTags.every(tag => p.tags?.some((t: any) => t.name === tag))
        );
      }
    }
    // Advanced filters from filter modal
    if (myPageAdvancedFilters.minRating != null) {
      result = result.filter(p => (p.rating || 0) >= myPageAdvancedFilters.minRating);
    }
    if (myPageAdvancedFilters.dateFrom) {
      const from = new Date(myPageAdvancedFilters.dateFrom);
      result = result.filter(p => p.visited_at && new Date(p.visited_at) >= from);
    }
    if (myPageAdvancedFilters.dateTo) {
      const to = new Date(myPageAdvancedFilters.dateTo);
      result = result.filter(p => p.visited_at && new Date(p.visited_at) <= to);
    }
    if (myPageAdvancedFilters.isFavorite) {
      result = result.filter(p => p.is_favorite);
    }
    if (myPageAdvancedFilters.is_hot_spring_mode) {
      if (myPageAdvancedFilters.spring_temp_min != null) {
        result = result.filter(p => p.spring_temp_min != null && p.spring_temp_min >= myPageAdvancedFilters.spring_temp_min);
      }
      if (myPageAdvancedFilters.spring_temp_max != null) {
        result = result.filter(p => p.spring_temp_max != null && p.spring_temp_max <= myPageAdvancedFilters.spring_temp_max);
      }
      if (myPageAdvancedFilters.is_source_fed) {
        result = result.filter(p => p.is_source_fed === myPageAdvancedFilters.is_source_fed);
      }
      if (myPageAdvancedFilters.bath_type) {
        result = result.filter(p => p.bath_type === myPageAdvancedFilters.bath_type);
      }
      if (myPageAdvancedFilters.stay_type) {
        result = result.filter(p => p.stay_type === myPageAdvancedFilters.stay_type);
      }
    }
    result.sort((a, b) => {
      if (sortField === 'visited') {
        const tA = a.visited_at ? new Date(a.visited_at).getTime() : 0;
        const tB = b.visited_at ? new Date(b.visited_at).getTime() : 0;
        if (tA === 0 && tB === 0) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (tA === 0) return 1;
        if (tB === 0) return -1;
        return tB - tA;
      } else if (sortField === 'rating_desc') {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        return rB - rA;
      } else if (sortField === 'rating_asc') {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        return rA - rB;
      } else {
        // created: 投稿日時順
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return tB - tA;
      }
    });
    return result;
  };

  const filteredOwnVisited = applyFilters(ownVisitedPosts);
  const filteredMarkedVisited = applyFilters(markedVisitedPosts);
  const filteredOwnWant = applyFilters(ownWantToGoPosts);
  const filteredMarkedWant = applyFilters(markedWantToGoPosts);
  filteredPosts = applyFilters(filteredPosts);

  // 「みんなの投稿の『行った』」を店舗単位にグルーピング
  const groupedMarkedVisitedStores = (() => {
    const storeMap = new Map<string, {
      storeKey: string;
      posts: any[];
      storeName: string;
      address: string | null;
      representativePost: any;
      representativeImage: string | null;
      uniqueVisitorsCount: number;
      avgRating: number | null;
      allRestricted: boolean;
    }>();

    for (const post of filteredMarkedVisited) {
      const key = getStoreKey(post);
      const existing = storeMap.get(key);
      if (existing) {
        existing.posts.push(post);
      } else {
        storeMap.set(key, {
          storeKey: key,
          posts: [post],
          storeName: post.store_name || post.title || '店舗',
          address: post.address || null,
          representativePost: post,
          representativeImage: null,
          uniqueVisitorsCount: 1,
          avgRating: null,
          allRestricted: false,
        });
      }
    }

    return Array.from(storeMap.values()).map((group) => {
      // 最新の投稿を代表とする
      const sortedPosts = [...group.posts].sort((a, b) => {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return tB - tA;
      });
      const repPost = sortedPosts[0];

      // 代表画像の選定
      const imageItems: Array<{ image_url?: string | null; image_urls?: string[]; created_at?: any }> = [];
      for (const p of group.posts) {
        imageItems.push({
          image_url: p.image_url,
          image_urls: p.image_urls,
          created_at: p.created_at,
        });
        if (p.visiteds && Array.isArray(p.visiteds)) {
          for (const v of p.visiteds) {
            imageItems.push({
              image_url: v.image_url,
              image_urls: v.image_urls,
              created_at: v.created_at,
            });
          }
        }
      }
      const repImage = pickRepresentativeImage(imageItems) || repPost.image_url || null;

      // ユニーク訪問者数の計算（投稿者 + postVisited 登録者）
      const visitorUserIds = new Set<string>();
      for (const p of group.posts) {
        if (p.user_id) visitorUserIds.add(p.user_id);
        if (p.visiteds && Array.isArray(p.visiteds)) {
          for (const v of p.visiteds) {
            if (v.user_id) visitorUserIds.add(v.user_id);
          }
        }
      }
      const uniqueCount = Math.max(1, visitorUserIds.size);

      // 平均評価の計算
      const ratings: number[] = [];
      for (const p of group.posts) {
        if (p.rating != null && p.rating > 0) ratings.push(p.rating);
        if (p.visiteds && Array.isArray(p.visiteds)) {
          for (const v of p.visiteds) {
            if (v.rating != null && v.rating > 0) ratings.push(v.rating);
          }
        }
      }
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      const allRestricted = group.posts.every((p) => p.is_restricted);

      return {
        ...group,
        representativePost: repPost,
        representativeImage: repImage,
        uniqueVisitorsCount: uniqueCount,
        avgRating: avg,
        allRestricted,
      };
    });
  })();

  const goToMap = async () => {
    if (targetUserId) {
      updateFilter({
        filterMode: 'registrant',
        activeGroups: [],
        advancedFilters: { ...filterState?.advancedFilters, registrantUserIds: [targetUserId], include_mine: false }
      });
    } else {
      let myId = myProfileData?.id;
      if (!myId) {
        try {
          const r = await fetch('/api/profiles/me');
          const j = await r.json();
          myId = j.data?.id;
        } catch (e) {}
      }
      updateFilter({
        filterMode: 'registrant',
        activeGroups: [],
        advancedFilters: { ...filterState?.advancedFilters, registrantUserIds: myId ? [myId] : [], include_mine: true }
      });
    }
    router.push('/map');
  };

  const goToCalendar = async () => {
    if (targetUserId) {
      updateFilter({
        filterMode: 'registrant',
        activeGroups: [],
        advancedFilters: { ...filterState?.advancedFilters, registrantUserIds: [targetUserId], include_mine: false }
      });
    } else {
      let myId = myProfileData?.id;
      if (!myId) {
        try {
          const r = await fetch('/api/profiles/me');
          const j = await r.json();
          myId = j.data?.id;
        } catch (e) {}
      }
      updateFilter({
        filterMode: 'registrant',
        activeGroups: [],
        advancedFilters: { ...filterState?.advancedFilters, registrantUserIds: myId ? [myId] : [], include_mine: true }
      });
    }
    router.push('/calendar');
  };

  const goToStats = async () => {
    const navUserId = targetUserId ?? myProfileData?.id;
    if (!navUserId) {
      try {
        const r = await fetch('/api/profiles/me');
        const j = await r.json();
        const id = j.data?.id;
        if (id) {
          updateFilter({
            filterMode: 'registrant',
            activeGroups: [],
            advancedFilters: {
              ...filterState?.advancedFilters,
              filterMode: 'registrant',
              registrantUserIds: [id],
              include_mine: true,
            },
          });
          router.push(`/stats?from=mypage&userId=${id}`);
          return;
        }
      } catch (e) {}
    } else {
      updateFilter({
        filterMode: 'registrant',
        activeGroups: [],
        advancedFilters: {
          ...filterState?.advancedFilters,
          filterMode: 'registrant',
          registrantUserIds: [navUserId],
          include_mine: !targetUserId,
        },
      });
      router.push(`/stats?from=mypage&userId=${navUserId}`);
      return;
    }
    router.push('/stats?from=mypage');
  };

  const ratingsHref = targetUserId
    ? `/mypage/ratings?userId=${targetUserId}`
    : '/mypage/ratings';

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      <Header
        title={targetUserId ? `${user?.name || 'ともだち'}のページ` : (user?.name || 'マイページ')}
        hideSettings={!!targetUserId}
        showBackButton={!!targetUserId}
      />

      {/* Profile Info */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="relative shrink-0">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
            {user?.avatar_url ? (
              <Image
                src={getImageUrl(user.avatar_url.includes('?') ? user.avatar_url : `${user.avatar_url}?v=${Date.now()}`)}
                alt="User"
                fill
                className="object-cover"
                unoptimized
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          {!targetUserId && (
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-transform" onClick={() => router.push('/settings')}>
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Stats Row: 平均レビュー | 投稿 | ともだち | いいね */}
        <div className="flex-1 flex justify-around ml-4 items-end pb-1">
          {/* 平均評価 */}
          <Link href={ratingsHref} className="flex flex-col items-center justify-end h-[42px] group relative -top-1">
            <div className="flex flex-col items-center flex-1 justify-end">
              {avgRating !== null ? (
                <>
                  <span className="text-[17px] font-black text-orange-500 leading-none">
                    {avgRating.toFixed(1)}
                  </span>
                  <div className="mt-0.5">
                    <StarRating rating={avgRating} />
                  </div>
                </>
              ) : (
                <span className="text-[17px] font-black text-gray-300 leading-none">-</span>
              )}
              <span className="text-[10px] text-gray-400 font-black mt-1">平均評価</span>
            </div>
          </Link>

          {/* 投稿 */}
          <div className="flex flex-col items-center justify-end h-[42px] relative -top-1">
            <div className="flex-1 flex flex-col justify-end items-center">
              <span className="text-[17px] font-black text-gray-900 leading-none">{totalPostCount}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-black mt-1.5 h-[12px] flex items-center">投稿</span>
          </div>

          {/* ともだち */}
          {!targetUserId ? (
            <Link href="/groups" className="hover:scale-105 transition-transform h-[42px] flex flex-col items-center justify-end relative -top-1">
              <div className="flex-1 flex flex-col justify-end items-center">
                <span className="text-[17px] font-black text-gray-900 leading-none">{friendsCount}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-black mt-1.5 h-[12px] flex items-center">ともだち</span>
            </Link>
          ) : (
            <div className="flex flex-col items-center justify-end h-[42px] relative -top-1">
              <div className="flex-1 flex flex-col justify-end items-center">
                <span className="text-[17px] font-black text-gray-900 leading-none">{friendsCount}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-black mt-1.5 h-[12px] flex items-center">ともだち</span>
            </div>
          )}

          {/* もらったいいね */}
          <div className="flex flex-col items-center justify-end h-[42px] relative -top-1">
            <div className="flex-1 flex flex-col justify-end items-center">
              <div className="flex items-center gap-1">
                <ThumbsUp size={14} className="text-pink-400 fill-pink-400" />
                <span className="text-[17px] font-black text-gray-900 leading-none">{totalLikesReceived}</span>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 font-black mt-1.5 whitespace-nowrap -ml-1 -mr-1 text-center scale-90 h-[12px] flex items-center">もらったいいね</span>
          </div>
        </div>
      </div>

      {/* New record button */}
      {!targetUserId && (
        <div className="px-4 mb-6">
          <Link
            href="/posts/new"
            className="w-full py-4 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg hover:scale-[1.01] active:scale-98 transition-all"
            style={{
              background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-hover))',
              boxShadow: '0 10px 15px -3px var(--color-primary-shadow), 0 4px 6px -2px var(--color-primary-shadow)'
            }}
          >
            <div className="p-1.5 bg-white/20 rounded-[10px]"><Plus size={22} strokeWidth={3} /></div>
            <span>新しく記録する</span>
          </Link>
        </div>
      )}

      {/* Action Row */}
      <div className="px-4 mb-5 grid grid-cols-4 gap-2">
        <button
          onClick={() => setIsMyFilterModalOpen(true)}
          className={`flex flex-col h-[56px] border rounded-2xl items-center justify-center transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative ${
            Object.values(myPageAdvancedFilters).some(v => v != null && v !== false && v !== '') || sortField !== 'created' || selectedTags.length > 0
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)] border-[var(--color-primary-light)]'
              : 'bg-white text-gray-600 border-gray-100 hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-light)]'
          }`}
        >
          <Filter size={18} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider leading-tight text-center">絞り込み<br/>並び替え</span>
          {(Object.values(myPageAdvancedFilters).some(v => v != null && v !== false && v !== '') || sortField !== 'created' || selectedTags.length > 0) && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">!</span>
          )}
        </button>

        <button onClick={goToMap} className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-light)] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <MapPin size={18} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">マップ</span>
        </button>
        
        <button onClick={goToCalendar} className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-light)] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <Calendar size={18} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">カレンダー</span>
        </button>

        <button
          onClick={goToStats}
          className="flex flex-col h-[56px] bg-white border border-gray-100 rounded-2xl items-center justify-center text-gray-600 hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-light)] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
        >
          <BarChart2 size={18} strokeWidth={2.5} className="mb-0.5" />
          <span className="text-[9px] font-black tracking-wider">統計</span>
        </button>
      </div>

      {/* Tags Chips */}
      {selectedTags.length > 0 && (
        <div className="px-4 mb-4 flex gap-2 flex-wrap">
          {selectedTags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-lg text-[12px] font-bold border border-[var(--color-primary-light)]">
              #{t}
              <button className="opacity-60 hover:opacity-100" onClick={() => setSelectedTags(prev => prev.filter(x => x !== t))}>×</button>
            </span>
          ))}
        </div>
      )}



      {/* Search bar */}
      <div className="px-4 mb-4">
        {/* Search mode toggle */}
        <div className="flex gap-2 mb-2.5">
          <button
            onClick={() => { setSearchMode('store_name'); setKeyword(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
              searchMode === 'store_name'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            🏪 店名
          </button>
          <button
            onClick={() => { setSearchMode('address'); setKeyword(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
              searchMode === 'address'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            📍 住所
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input
            type="text"
            placeholder={searchMode === 'address' ? '住所・エリアで検索（例：渋谷区...）' : '記録を検索...'}
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-800 placeholder:text-gray-300"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-6">
        <div className="flex bg-gray-100/80 rounded-[14px] p-1 border border-black/5 shadow-inner">
          <TabBtn active={activeTab === 'visited'} onClick={() => setActiveTab('visited')} label="行った" />
          <TabBtn active={activeTab === 'want_to_go'} onClick={() => setActiveTab('want_to_go')} label="行きたい" />
          <TabBtn active={activeTab === 'liked'} onClick={() => setActiveTab('liked')} label="いいね" />
        </div>
      </div>

      {/* Tab Content (Grid) */}
      {activeTab === 'want_to_go' && !targetUserId ? (
        <div className="animate-in fade-in duration-500">
          <div className="mb-2">
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-[11px] font-black text-gray-400 tracking-wider uppercase">自分の「行きたい」</span>
              <span className="bg-orange-100 text-orange-500 text-[10px] font-black px-1.5 py-0.5 rounded-full">{filteredOwnWant.length}</span>
            </div>
            {loading ? (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {[1,2,3].map(i => <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />)}
              </div>
            ) : filteredOwnWant.length === 0 ? (
              <div className="py-3 text-center text-gray-300 text-[12px] font-bold">まだ登録がありません</div>
            ) : (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {filteredOwnWant.map(post => (
                  <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
                    {post.image_url ? (
                      <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                    ) : (
                      <MiniNoImageMap post={post} />
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
                    {post.is_favorite && (
                      <div className="absolute top-1.5 right-1.5 bg-pink-500/90 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black">♥</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="mx-4 my-3 border-t border-gray-100" />
          <div>
            <div className="px-4 py-2 flex items-center gap-2">
              <Bookmark size={12} className="text-orange-400" />
              <span className="text-[11px] font-black text-gray-400 tracking-wider uppercase">みんなの投稿の「行きたい」</span>
              <span className="bg-orange-100 text-orange-500 text-[10px] font-black px-1.5 py-0.5 rounded-full">{filteredMarkedWant.length}</span>
            </div>
            {markedWtgLoading ? (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {[1,2,3].map(i => <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />)}
              </div>
            ) : filteredMarkedWant.length === 0 ? (
              <div className="py-8 text-center text-gray-300 text-[12px] font-bold">他の人の投稿で「行きたい」を押してみよう</div>
            ) : (
              <div className="px-0.5 grid grid-cols-3 gap-0.5 pb-4">
                {filteredMarkedWant.map(post => (
                  post.is_restricted ? (
                    <RestrictedCard key={post.id} post={post} />
                  ) : (
                    <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
                      {post.image_url ? (
                        <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                      ) : (
                        <MiniNoImageMap post={post} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                        <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {post.store_name && <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate opacity-80">{post.store_name}</span>}
                          {post.user?.name && <span className="text-orange-300 font-black text-[8px] drop-shadow-md truncate">by {post.user.name}</span>}
                        </div>
                      </div>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'visited' && !targetUserId ? (
        <div className="animate-in fade-in duration-500">
          <div className="mb-2">
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-[11px] font-black text-gray-400 tracking-wider uppercase">自分の「行った」</span>
              <span className="bg-orange-100 text-orange-500 text-[10px] font-black px-1.5 py-0.5 rounded-full">{filteredOwnVisited.length}</span>
            </div>
            {loading ? (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {[1,2,3].map(i => <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />)}
              </div>
            ) : filteredOwnVisited.length === 0 ? (
              <div className="py-8 text-center text-gray-300 text-[12px] font-bold">まだ記録がありません</div>
            ) : (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {filteredOwnVisited.map(post => (
                  <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
                    {post.image_url ? (
                      <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 group-hover:scale-105 transition-transform duration-500">
                        <span className="text-xl mb-1">🍽️</span>
                        <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
                        {post.store_name && <span className="text-[7px] font-bold text-gray-400 mt-0.5 truncate w-full text-center">{post.store_name}</span>}
                      </div>
                    )}
                    {post.image_url && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                          <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                          <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate mt-0.5 opacity-80">
                            {post.store_name} • {post.visited_at ? formatDate(post.visited_at).split('-').slice(1).join('/') : ''}
                          </span>
                        </div>
                      </>
                    )}
                    {post.rating && (
                      <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-orange-500 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm scale-75 origin-top-left">
                        <span className="text-[10px] font-black">★</span>
                        <span className="text-[10px] font-black">{post.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {post.is_favorite && (
                      <div className="absolute top-1.5 right-1.5 bg-pink-500/90 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black">♥</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="mx-4 my-3 border-t border-gray-100" />
          <div>
            <div className="px-4 py-2 flex items-center gap-2">
              <Bookmark size={12} className="text-orange-400" />
              <span className="text-[11px] font-black text-gray-400 tracking-wider uppercase">みんなの投稿の「行った」</span>
              <span className="bg-orange-100 text-orange-500 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {groupedMarkedVisitedStores.length}店舗
              </span>
            </div>
            {markedVisLoading ? (
              <div className="px-0.5 grid grid-cols-3 gap-0.5">
                {[1,2,3].map(i => <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />)}
              </div>
            ) : groupedMarkedVisitedStores.length === 0 ? (
              <div className="py-8 text-center text-gray-300 text-[12px] font-bold">他の人の投稿で「行った」を押してみよう</div>
            ) : (
              <div className="px-0.5 grid grid-cols-3 gap-0.5 pb-4">
                {groupedMarkedVisitedStores.map(store => {
                  const post = store.representativePost;
                  if (store.allRestricted) {
                    return <RestrictedCard key={store.storeKey} post={post} />;
                  }
                  return (
                    <Link
                      href={`/posts/${post.id}`}
                      key={store.storeKey}
                      className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation block"
                    >
                      {store.representativeImage ? (
                        <Image
                          src={getImageUrl(store.representativeImage)}
                          alt={store.storeName}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 group-hover:scale-105 transition-transform duration-500">
                          <span className="text-xl mb-1">🍽️</span>
                          <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">
                            {store.storeName}
                          </span>
                        </div>
                      )}

                      {/* 暗いグラデーション */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90 pointer-events-none" />

                      {/* 左上: 訪問人数バッジ */}
                      <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <User size={10} className="text-orange-400" />
                        <span>{store.uniqueVisitorsCount}</span>
                      </div>

                      {/* 右上: 平均評価バッジ */}
                      {store.avgRating != null && (
                        <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-sm text-orange-500 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm scale-90 origin-top-right">
                          <span className="text-[9px] font-black">★</span>
                          <span className="text-[9px] font-black">{store.avgRating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* 下部: 店舗名・住所 */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                        <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">
                          {store.storeName}
                        </span>
                        {store.address && (
                          <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate mt-0.5 opacity-80">
                            {store.address}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      ) : (activeTab === 'liked' ? likedPostsLoading : loading) ? (
        <div className="px-0.5 grid grid-cols-3 gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 font-bold text-[14px]">
          {activeTab === 'liked' ? 'いいねした投稿がまだありません' : '記録が見つかりません'}
        </div>
      ) : (
        <div className="px-0.5 grid grid-cols-3 gap-0.5 animate-in fade-in duration-500">
          {filteredPosts.map(post => (
            post.is_restricted ? (
              <RestrictedCard key={post.id} post={post} />
            ) : (
              <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-50 group overflow-hidden touch-manipulation">
                {post.image_url ? (
                  <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                ) : post.status === 'want_to_go' ? (
                  <MiniNoImageMap post={post} />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center p-2 transition-transform duration-500 group-hover:scale-105 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100`}>
                    <span className="text-2xl mb-1">🍽️</span>
                    <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
                    {post.store_name && <span className="text-[7px] font-bold text-gray-400 mt-0.5 truncate w-full text-center">{post.store_name}</span>}
                    {post.user?.name && (activeTab === 'liked' || post.user_id !== myProfileData?.id) && (
                      <span className="text-[8px] font-black text-orange-500 mt-0.5 truncate">by {post.user.name}</span>
                    )}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />

                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                  <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {post.store_name && (
                      <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate opacity-80">
                        {post.store_name} {post.visited_at ? `• ${formatDate(post.visited_at).split('-').slice(1).join('/')}` : ''}
                      </span>
                    )}
                    {post.user?.name && (activeTab === 'liked' || post.user_id !== myProfileData?.id) && (
                      <span className="text-orange-300 font-black text-[8px] drop-shadow-md truncate">
                        by {post.user.name}
                      </span>
                    )}
                  </div>
                </div>

                {post.rating && (
                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-orange-500 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm scale-75 origin-top-left">
                    <span className="text-[10px] font-black">★</span>
                    <span className="text-[10px] font-black">{post.rating.toFixed(1)}</span>
                  </div>
                )}

                {post.is_favorite && (
                  <div className="absolute top-1.5 right-1.5 bg-pink-500/90 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm scale-75 origin-top-right">
                    <span className="text-[10px] font-black">♥</span>
                  </div>
                )}
                {post.user_id !== myProfileData?.id && activeTab !== 'liked' && (
                  <div className="absolute bottom-1.5 right-1.5 bg-gray-800/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-sm opacity-90 scale-90 origin-bottom-right">
                    みんなの投稿
                  </div>
                )}
              </Link>
            )
          ))}
        </div>
      )}




      {/* My Page Filter Modal (without group/registrant and status) */}
      <FilterModal
        isOpen={isMyFilterModalOpen}
        onClose={() => setIsMyFilterModalOpen(false)}
        hideGroupAndRegistrant={true}
        hideStatus={true}
        onApply={(f) => {
          // Apply sort_order → sortField
          const sortMap: Record<string, 'created' | 'visited' | 'rating_desc' | 'rating_asc'> = {
            'created_desc': 'created',
            'visited_desc': 'visited',
            'rating_desc': 'rating_desc',
            'rating_asc': 'rating_asc',
          };
          if (f.sort_order && sortMap[f.sort_order]) setSortField(sortMap[f.sort_order]);
          // Apply tags
          if (f.tags) setSelectedTags(f.tags);
          // Store remaining advanced filters (excluding sort/tags/group/status)
          const { activeGroups: _, status: __, filterMode: ___, sort_order: ____, tags: _____, ...rest } = f as any;
          setMyPageAdvancedFilters({
            minRating: f.rating_min,
            dateFrom: f.period_start,
            dateTo: f.period_end,
            isFavorite: f.is_favorite,
            tagMatchMode: f.tagMatchMode,
            is_hot_spring_mode: (f as any).is_hot_spring_mode,
            spring_temp_min: (f as any).spring_temp_min,
            spring_temp_max: (f as any).spring_temp_max,
            is_source_fed: (f as any).is_source_fed,
            bath_type: (f as any).bath_type,
            stay_type: (f as any).stay_type,
          });
        }}
        initialFilters={{
          ...myPageAdvancedFilters,
          tags: selectedTags,
          tagMatchMode: myPageAdvancedFilters.tagMatchMode || 'AND',
          sort_order: sortField === 'created' ? 'created_desc' : sortField === 'visited' ? 'visited_desc' : sortField,
          is_hot_spring_mode: myPageAdvancedFilters.is_hot_spring_mode,
          spring_temp_min: myPageAdvancedFilters.spring_temp_min,
          spring_temp_max: myPageAdvancedFilters.spring_temp_max,
          is_source_fed: myPageAdvancedFilters.is_source_fed,
          bath_type: myPageAdvancedFilters.bath_type,
          stay_type: myPageAdvancedFilters.stay_type,
        }}
        showHotSpringFilter={appType === 'tabireco'}
      />
    </div>
  );
}

function SortOption({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-[12px] font-bold hover:bg-gray-50 transition-colors ${active ? 'text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
    >
      {label}
    </button>
  );
}

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-[42px] h-[42px] text-gray-300" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
    </button>
  );
}
