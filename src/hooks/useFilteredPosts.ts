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
  const { data: ownPostsData, isLoading: ownLoading } = useSWR('/api/posts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  // 2. Fetch joined groups
  const { data: groupsData, isLoading: groupsLoading } = useSWR('/api/groups', fetcher, {
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
  const ownPostsCache = useMemo(() => (ownPostsData || []).map((p: any) => ({ ...p, __is_mine: true })), [ownPostsData]);
  const groupPostsCache = groupPostsData || [];

  // Compute displayed posts locally
  const posts = useMemo(() => {
    let combinedMap = new Map();

    if (activeGroups.includes('all')) {
      ownPostsCache.forEach(p => combinedMap.set(p.id, p));
      groupPostsCache.forEach(g => g.posts.forEach(p => combinedMap.set(p.id, p)));
    } else {
      if (activeGroups.includes('mine')) {
        ownPostsCache.forEach(p => combinedMap.set(p.id, p));
      }
      groupPostsCache.forEach(g => {
        if (activeGroups.includes(g.groupId)) {
          g.posts.forEach(p => combinedMap.set(p.id, p));
        }
      });
    }

    let result = Array.from(combinedMap.values()) as Post[];

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
    if (advancedFilters?.registrantUserId) {
      result = result.filter(p => (p as any).user_id === advancedFilters.registrantUserId);
    }
    
    return result.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      ? Object.entries(advancedFilters).filter(([k, v]) =>
          v && v !== 'all' && v !== '' && v !== false && k !== 'activeGroups' && k !== 'tags'
        ).length + (advancedFilters.tags?.length || 0) + (activeGroups.filter(x => x !== 'all').length > 0 ? 1 : 0)
      : activeGroups.filter(x => x !== 'all').length;
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
