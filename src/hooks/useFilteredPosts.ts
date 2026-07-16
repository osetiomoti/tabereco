'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post } from '@/lib/types';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useFilteredPosts() {
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, activeGroups, advancedFilters, activeMapTag } = filterState;
  const [memberUsers, setMemberUsers] = useState<{ id: string; name: string }[]>([]);

  // 1. Fetch own posts
  const { data: ownPostsData, isLoading: ownLoading } = useSWR<Post[]>(['/api/posts', 'own_filtered'], () => getPosts(), {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  // 2. Fetch joined groups
  const { data: groupsData, isLoading: groupsLoading } = useSWR<any[]>('/api/groups', () => getJoinedGroups(), {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });

  const joinedGroups = groupsData || [];

  // Load group members when joinedGroups changes
  useEffect(() => {
    if (joinedGroups.length > 0) {
      const loadAllMembers = async () => {
        const map = new Map<string, { id: string; name: string }>();
        let myId = '';
        // Add own profile first
        try {
          const profileRes = await fetch('/api/profiles/me');
          const profileJson = await profileRes.json();
          if (profileJson.data) {
            myId = profileJson.data.id;
            map.set(myId, { id: myId, name: profileJson.data.name || '自分' });
          }
        } catch (e) {
          console.error(e);
        }

        await Promise.all(
          joinedGroups.map(async (g: any) => {
            try {
              const r = await fetch(`/api/groups/${g.id}/members`);
              const j = await r.json();
              (j.data || []).forEach((m: any) => {
                map.set(m.id, { id: m.id, name: m.name });
              });
            } catch (e) {
              console.error(e);
            }
          })
        );
        const membersList = Array.from(map.values());
        setMemberUsers(membersList);

        // 以前はここで updateFilter を呼んで全メンバーのIDを保存していましたが、
        // それだと後からグループに追加されたメンバーが除外されてしまうバグがありました。
        // 空配列 [] を「全員」として扱うように変更したため、ここは削除します。
      };
      loadAllMembers();
    }
  }, [joinedGroups, advancedFilters, updateFilter]);

  // 3. Fetch group posts for each group
  // We need to fetch multiple groups. SWR doesn't support multiple keys easily, 
  // but we can map over groupsData if it exists.
  // For simplicity, we'll use a combined fetcher or just fetch sequentially if needed.
  // Actually, we can fetch all group posts in one go if the API supports it, or use a custom key.
  
  
  // Custom fetcher for all group posts
  const groupPostsKey = joinedGroups.length > 0 ? ['/api/groups/posts', joinedGroups.map((g: any) => g.id).join(',')] : null;
  const { data: groupPostsData, isLoading: groupPostsLoading } = useSWR(groupPostsKey, async () => {
    const results = await Promise.all(
      joinedGroups.map(async (g: any) => {
        const p = await getGroupPosts(g.id);
        return { groupId: g.id, posts: p.map((post: any) => ({ ...post, __group_name: g.name, __is_mine: false })) };
      })
    );
    return results;
  }, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const loading = ownLoading || groupsLoading || groupPostsLoading;
  const ownPostsCache = useMemo(() => (ownPostsData || []).map((p: Post) => ({ ...p, __is_mine: true })), [ownPostsData]);
  const groupPostsCache = (groupPostsData || []) as any[];

  // Compute displayed posts locally
  const posts = useMemo(() => {
    const filterMode: 'registrant' | 'group' = (advancedFilters as any)?.filterMode || 'registrant';

    let result: Post[] = [];

    if (filterMode === 'group') {
      // ── グループモード: グループ投稿のみ、activeGroups でフィルター ──
      const combinedMap = new Map<string, Post>();

      if (activeGroups.includes('all')) {
        groupPostsCache.forEach((g: any) => g.posts.forEach((p: Post) => combinedMap.set(p.id, p)));
      } else if (activeGroups.length > 0) {
        groupPostsCache.forEach((g: any) => {
          if (activeGroups.includes(g.groupId)) {
            g.posts.forEach((p: Post) => combinedMap.set(p.id, p));
          }
        });
      }

      result = Array.from(combinedMap.values());
    } else {
      // ── 投稿者モード: 自分の投稿ベース、グループフィルターは無視 ──
      // 自分の投稿 + グループ内の他者投稿をすべてマージしてから registrantUserIds でフィルター
      const combinedMap = new Map<string, Post>();
      ownPostsCache.forEach((p: Post) => combinedMap.set(p.id, p));
      // グループ投稿も含める（メンバーフィルターで絞る）
      groupPostsCache.forEach((g: any) => g.posts.forEach((p: Post) => combinedMap.set(p.id, p)));

      result = Array.from(combinedMap.values());

      // registrantUserIds フィルター（投稿者選択）
      if (advancedFilters?.registrantUserIds !== undefined && advancedFilters.registrantUserIds.length > 0) {
        result = result.filter((p: Post) => advancedFilters.registrantUserIds.includes(p.user_id));
      }
    }

    // ── 共通フィルター ──
    if (activeTab !== 'all') {
      result = result.filter(p => p.status === activeTab);
    }

    if (keyword) {
      const lowerReq = keyword.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(lowerReq) ||
        p.store_name?.toLowerCase().includes(lowerReq) ||
        p.comment?.toLowerCase().includes(lowerReq)
      );
    }

    if (advancedFilters?.tags && advancedFilters.tags.length > 0) {
      result = result.filter(p => advancedFilters.tags.every((tag: string) => p.tags?.some((t: any) => t.name === tag)));
    }
    if (advancedFilters?.is_favorite) {
      result = result.filter(p => p.is_favorite);
    }
    if (advancedFilters?.status && advancedFilters.status !== 'all') {
      result = result.filter(p => p.status === advancedFilters.status);
    }

    // ── 期間フィルター ──
    const period = advancedFilters?.period || 'none';
    if (period !== 'none') {
      // 指定がある場合、日付が設定されていることが前提
      result = result.filter(p => !!p.visited_at);

      if (period !== 'all') {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (period === 'this_month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === 'last_3_months') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          endDate = now;
        } else if (period === 'this_year') {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
        } else if (period === 'last_year') {
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
        } else if (period === 'custom') {
          if (advancedFilters?.period_start) startDate = new Date(advancedFilters.period_start);
          if (advancedFilters?.period_end) endDate = new Date(advancedFilters.period_end);
        }

        if (startDate || endDate) {
          result = result.filter(p => {
            const d = new Date(p.visited_at!);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
          });
        }
      }
    }

    
    if (advancedFilters?.rating_min !== undefined) {
      result = result.filter(p => p.rating >= advancedFilters.rating_min);
    }
    if (advancedFilters?.price_min !== undefined) {
      result = result.filter(p => p.price_min !== null && p.price_min >= advancedFilters.price_min);
    }
    if (advancedFilters?.price_max !== undefined) {
      // 登録時の価格帯は min-max で保存されているため、price_max を比較
      // price_max が null の場合は設定されていないか、○○円以上（青天井）という意味合いになる
      // そのため上限フィルターが指定された場合、上限より高い価格帯は除外する
      // また min が max を超えるような価格帯も除外
      result = result.filter(p => {
        if (p.price_min === null) return false;
        return p.price_min <= advancedFilters.price_max;
      });
    }

    const sortOrder = advancedFilters?.sort_order || 'created_desc';
    result.sort((a: Post, b: Post) => {
      switch (sortOrder) {
        case 'rating_desc':
          return b.rating - a.rating;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'price_desc':
          return (b.price_min || 0) - (a.price_min || 0);
        case 'price_asc': {
          const pA = a.price_min !== null ? a.price_min : Infinity;
          const pB = b.price_min !== null ? b.price_min : Infinity;
          return pA - pB;
        }
        case 'created_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [activeGroups, activeTab, keyword, advancedFilters, ownPostsCache, groupPostsCache]);


  const removeFilter = (key: string | string[] | Record<string, any>) => {
    // オブジェクト形式：个別投稿者チップの削除
    if (typeof key === 'object' && !Array.isArray(key) && 'registrantUserIds' in key) {
      updateFilter({
        advancedFilters: {
          ...(advancedFilters || {}),
          registrantUserIds: key.registrantUserIds,
        }
      });
      return;
    }
    let next = { ...advancedFilters };
    if (Array.isArray(key)) {
      if (key.length === 0) {
        // Clear all advanced filters and reset tab
        next = {} as any;
        updateFilter({ activeTab: 'all', advancedFilters: null });
        return;
      } else {
        next.tags = key;
      }
    } else if (key === 'status') {
      updateFilter({ activeTab: 'all' });
      return;
    } else {
      delete next[key as string];
    }
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  const activeFilterCount = useMemo(() => {
    return advancedFilters
      ? Object.entries(advancedFilters).filter(([k, v]: [string, any]) =>
          v !== undefined && v !== null && v !== 'all' && v !== '' && v !== false && k !== 'activeGroups' && k !== 'tags' && k !== 'registrantUserIds' && k !== 'sort_order'
        ).length + (advancedFilters.tags?.length || 0) + (advancedFilters.registrantUserIds?.length || 0) + (activeGroups.filter((x: string) => x !== 'all').length > 0 ? 1 : 0)
      : activeGroups.filter((x: string) => x !== 'all').length;
  }, [advancedFilters, activeGroups]);

  return {
    posts,
    loading,
    filterState,
    updateFilter,
    joinedGroups,
    removeFilter,
    activeFilterCount,
    memberUsers,
  };
}
