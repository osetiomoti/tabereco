'use client';

import { useMemo, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useSharedFilter } from '@/hooks/useSharedFilter';
import type { Post } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UseTimelineOptions {
  timelineMode?: 'home' | 'user' | 'group';
  targetUserId?: string;
  targetGroupId?: string;
  limit?: number;
  useSharedFilters?: boolean;
  filters?: {
    status?: string;
    keyword?: string;
    tags?: string[];
    sortField?: string;
    sortOrder?: string;
    searchMode?: string;
  };
}

export function useTimeline(options: UseTimelineOptions = {}) {
  const { filterState } = useSharedFilter();
  
  const {
    timelineMode = 'home',
    targetUserId,
    targetGroupId,
    limit = 50,
    useSharedFilters = true,
    filters = {},
  } = options;

  const getKey = (pageIndex: number, previousPageData: any) => {
    // If we reached the end
    if (previousPageData && !previousPageData.pagination.hasMore) return null;

    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('timeline_mode', timelineMode);
    
    if (targetUserId) params.append('target_user_id', targetUserId);
    if (targetGroupId) params.append('group_id', targetGroupId);

    if (useSharedFilters) {
      const activeTab = filters.status !== undefined ? filters.status : filterState.activeTab;
      const keyword = filters.keyword !== undefined ? filters.keyword : filterState.keyword;
      const searchMode = filters.searchMode !== undefined ? filters.searchMode : (filterState.searchMode || 'store_name');
      const activeGroups = filterState.activeGroups;
      const advancedFilters = filterState.advancedFilters;
      const activeMapTag = filterState.activeMapTag;
      
      const tags = filters.tags !== undefined ? filters.tags : (advancedFilters as any)?.tags;
      const tagMatchMode = (advancedFilters as any)?.tagMatchMode || filterState.tagMatchMode || 'AND';

      if (activeTab && activeTab !== 'all') params.append('status', activeTab);
      if (keyword) params.append('keyword', keyword);
      if (searchMode) params.append('search_mode', searchMode);
      
      const filterMode = (advancedFilters as any)?.filterMode || 'registrant';

      if (filterMode === 'group') {
        if (activeGroups.length > 0 && !activeGroups.includes('all')) {
          params.append('group_ids', activeGroups.join(','));
        }
      } else {
        if (advancedFilters?.registrantUserIds && advancedFilters.registrantUserIds.length > 0) {
          params.append('registrant_ids', advancedFilters.registrantUserIds.join(','));
        }
      }

      if (activeMapTag) params.append('tag_id', activeMapTag);
      
      if (tags && tags.length > 0) {
        params.append('selected_tags', tags.join(','));
        params.append('tag_match_mode', tagMatchMode);
      }
      
      if (filters.sortField) params.append('sort_field', filters.sortField);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
    }

    if (pageIndex > 0 && previousPageData?.pagination?.nextCursor) {
      params.append('cursor', previousPageData.pagination.nextCursor);
    }

    return `/api/timeline?${params.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const posts = useMemo(() => {
    if (!data) return [];
    return data.flatMap(page => page.data || []) as Post[];
  }, [data]);

  const isEmpty = data?.[0]?.data?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.pagination?.hasMore === false);
  const isRefreshing = isValidating && data && data.length === size;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');

  const loadMore = useCallback(() => {
    if (!isReachingEnd && !isLoadingMore) {
      setSize(size + 1);
    }
  }, [isReachingEnd, isLoadingMore, size, setSize]);

  return {
    posts,
    error,
    isLoading: isLoading || (isValidating && !data),
    isLoadingMore,
    isReachingEnd,
    isRefreshing,
    loadMore,
    mutate,
  };
}
