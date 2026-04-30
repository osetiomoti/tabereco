'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import { getPosts } from '@/lib/api/posts';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Post } from '@/lib/types';

export function useFilteredPosts() {
  const { filterState, updateFilter } = useSharedFilter();
  const { activeTab, keyword, activeGroups, advancedFilters, activeMapTag } = filterState;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [ownPostsCache, setOwnPostsCache] = useState<Post[]>([]);
  const [groupPostsCache, setGroupPostsCache] = useState<{groupId: string, posts: Post[]}[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ownData, groups] = await Promise.all([
          getPosts({}), 
          getJoinedGroups()
        ]);
        
        setJoinedGroups(groups || []);

        const groupDataArrays = await Promise.all(
          (groups || []).map(async (g: any) => {
            const p = await getGroupPosts(g.id);
            const postsWithGroup = p.map((post: any) => ({ ...post, __group_name: g.name, __is_mine: false }));
            return { groupId: g.id, posts: postsWithGroup };
          })
        );

        setOwnPostsCache(ownData.map((post: any) => ({ ...post, __is_mine: true })));
        setGroupPostsCache(groupDataArrays);
      } catch (err) {
        console.error('Failed to load posts or groups:', err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, 100);
    return () => clearTimeout(timer);
  }, []);

  // Compute displayed posts locally
  useEffect(() => {
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
    
    // activeMapTag is only applied on the map, but we can compute it here if needed or let the map component handle it.
    // We'll let MapPage handle activeMapTag to keep the base filtered list pure for other pages.

    setPosts(result.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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
