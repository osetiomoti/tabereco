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

  // 1. Fetch own posts
  const { data: ownPostsData, isLoading: ownLoading } = useSWR<Post[]>('/api/posts', () => getPosts(), {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  // 2. Fetch joined groups
  const { data: groupsData, isLoading: groupsLoading } = useSWR<any[]>('/api/groups', () => getJoinedGroups(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // 3. Fetch group posts for each group
  // We need to fetch multiple groups. SWR doesn't support multiple keys easily, 
  // but we can map over groupsData if it exists.
  // For simplicity, we'll use a combined fetcher or just fetch sequentially if needed.
  // Actually, we can fetch all group posts in one go if the API supports it, or use a custom key.
  
  const joinedGroups = groupsData || [];
  
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
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const loading = ownLoading || groupsLoading || groupPostsLoading;
  const ownPostsCache = useMemo(() => (ownPostsData || []).map((p: Post) => ({ ...p, __is_mine: true })), [ownPostsData]);
  const groupPostsCache = (groupPostsData || []) as any[];

  // Compute displayed posts locally
  const posts = useMemo(() => {
    let combinedMap = new Map();

    const myId = ownPostsCache.length > 0 ? (ownPostsCache[0] as any).user_id : null;

    // Always start with own posts as base
    ownPostsCache.forEach((p: Post) => combinedMap.set(p.id, p));

    // Merge group posts on top (group posts from other members)
    if (activeGroups.length === 0) {
      // If no group filter, show all joined groups' posts
      groupPostsCache.forEach((g: any) => g.posts.forEach((p: Post) => combinedMap.set(p.id, p)));
    } else {
      // Only selected groups
      groupPostsCache.forEach((g: any) => {
        if (activeGroups.includes(g.groupId)) {
          g.posts.forEach((p: Post) => combinedMap.set(p.id, p));
        }
      });
    }

    let result = Array.from(combinedMap.values()) as Post[];
    const includeMine = advancedFilters?.include_mine ?? false;

    // 「自分の投稿を含める」がOFFの場合、自分を除外
    const isRegistrantSelected = advancedFilters?.registrantUserIds && advancedFilters.registrantUserIds.length > 0;
    const isMeSelected = advancedFilters?.registrantUserIds?.includes(myId);

    if (!includeMine && !isMeSelected && myId && isRegistrantSelected) {
      // Only exclude mine if a specific registrant filter is active and excludes me
      result = result.filter(p => (p as any).user_id !== myId);
    }

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

    // Advanced filters
    if (advancedFilters?.tags && advancedFilters.tags.length > 0) {
      result = result.filter(p => advancedFilters.tags.every((tag: string) => p.tags?.some((t: any) => t.name === tag)));
    }
    if (advancedFilters?.is_favorite) {
      result = result.filter(p => p.is_favorite);
    }
    if (advancedFilters?.status && advancedFilters.status !== 'all') {
      result = result.filter(p => p.status === advancedFilters.status);
    }
    if (advancedFilters?.registrantUserIds && advancedFilters.registrantUserIds.length > 0) {
      result = result.filter((p: Post) => advancedFilters.registrantUserIds.includes((p as any).user_id));
    }
    
    return result.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeGroups, activeTab, keyword, advancedFilters, ownPostsCache, groupPostsCache]);

  const removeFilter = (key: string | string[]) => {
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
      delete next[key];
    }
    updateFilter({ advancedFilters: Object.keys(next).length > 0 ? next : null });
  };

  const activeFilterCount = useMemo(() => {
    return advancedFilters
      ? Object.entries(advancedFilters).filter(([k, v]: [string, any]) =>
          v && v !== 'all' && v !== '' && v !== false && k !== 'activeGroups' && k !== 'tags' && k !== 'registrantUserIds'
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
  };
}
