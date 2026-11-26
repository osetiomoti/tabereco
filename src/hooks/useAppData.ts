/**
 * useAppData - グローバルキャッシュを使ったデータフック
 * SWRのキャッシュを共有することで、ページ遷移をまたいでも再フェッチしない
 */
import { useMemo } from 'react';
import useSWR from 'swr';
import { getUserTags, getPosts } from '@/lib/api/posts';
import { getFriends } from '@/lib/api/friends';
import { getJoinedGroups, getGroupPosts } from '@/lib/api/groups';
import type { Tag, Post } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(j => j.data);
const jsonFetcher = (url: string) => fetch(url).then(r => r.json());

/** 自分のプロフィール（キャッシュ共有） */
export function useMyProfile() {
  const { data, isLoading, mutate } = useSWR('/api/profiles/me', fetcher, {
    dedupingInterval: 0, // 常に最新を取得
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return { profile: data ?? null, isLoading, mutate };
}

/** 自分のタグ一覧（キャッシュ共有） */
export function useMyTags() {
  const { data, isLoading, mutate } = useSWR<Tag[]>('/api/tags', () => getUserTags(), {
    dedupingInterval: 60_000,
  });
  return { tags: data ?? [], isLoading, mutate };
}

/** グループ全員のタグ一覧（重複排除済み） */
export function useGroupTags() {
  const { data, isLoading } = useSWR<Tag[]>('/api/tags?scope=group', (url: string) =>
    fetch(url).then(r => r.json()).then(j => j.data ?? []), {
    dedupingInterval: 60_000,
  });
  return { tags: data ?? [], isLoading };
}

/** ともだち一覧（キャッシュ共有） */
export function useFriends() {
  const { data, isLoading, mutate } = useSWR<any[]>('/api/friends', () => getFriends(), {
    dedupingInterval: 120_000, // 2分間キャッシュ
  });

  const friends = useMemo(() => {
    let list = data ?? [];
    if (typeof window !== 'undefined') {
      try {
        const savedOrder = localStorage.getItem('friends_order');
        if (savedOrder) {
          const order = JSON.parse(savedOrder) as string[];
          list = [...list].sort((a, b) => {
            const idxA = order.indexOf(a.friendship_id);
            const idxB = order.indexOf(b.friendship_id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });
        }
      } catch (e) {}
    }
    return list;
  }, [data]);

  return { friends, isLoading, mutate };
}

/** グループ一覧（キャッシュ共有） */
export function useGroups() {
  const { data, isLoading, mutate } = useSWR<any[]>('/api/groups', fetcher, {
    dedupingInterval: 120_000,
  });

  const groups = useMemo(() => {
    let list = data ?? [];
    if (typeof window !== 'undefined') {
      try {
        const savedOrder = localStorage.getItem('groups_order');
        if (savedOrder) {
          const order = JSON.parse(savedOrder) as string[];
          list = [...list].sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });
        }
      } catch (e) {}
    }
    return list;
  }, [data]);

  return { groups, isLoading, mutate };
}

/** 自分の投稿（訪問済み+行きたい）をSWRでキャッシュ */
export function useMyPosts() {
  const { data: visited, isLoading: v1, mutate: mutateVisited } = useSWR<Post[]>(
    ['/api/posts', 'visited'],
    () => getPosts({ status: 'visited' }),
    { dedupingInterval: 180_000, revalidateOnFocus: false }
  );
  const { data: markedVisitedData, isLoading: v1m, mutate: mutateMarkedVisited } = useSWR<{ success: boolean; data: Post[] }>(
    '/api/posts?marked_visited=true',
    jsonFetcher,
    { dedupingInterval: 180_000, revalidateOnFocus: false }
  );
  const { data: wantToGo, isLoading: v2, mutate: mutateWantToGo } = useSWR<Post[]>(
    ['/api/posts', 'want_to_go'],
    () => getPosts({ status: 'want_to_go' }),
    { dedupingInterval: 180_000, revalidateOnFocus: false }
  );
  const { data: markedWantToGoData, isLoading: v2m, mutate: mutateMarkedWantToGo } = useSWR<{ success: boolean; data: Post[] }>(
    '/api/posts?marked_want_to_go=true',
    jsonFetcher,
    { dedupingInterval: 180_000, revalidateOnFocus: false }
  );

  const visitedPosts = useMemo(() => {
    const list = [...(visited ?? [])];
    const marked = markedVisitedData?.data ?? [];
    const seen = new Set(list.map(p => p.id));
    for (const p of marked) {
      if (!seen.has(p.id)) {
        list.push(p);
        seen.add(p.id);
      }
    }
    return list;
  }, [visited, markedVisitedData]);

  const wantToGoPosts = useMemo(() => {
    const list = [...(wantToGo ?? [])];
    const marked = markedWantToGoData?.data ?? [];
    const seen = new Set(list.map(p => p.id));
    for (const p of marked) {
      if (!seen.has(p.id)) {
        list.push(p);
        seen.add(p.id);
      }
    }
    return list;
  }, [wantToGo, markedWantToGoData]);

  const mutateAll = async () => {
    await Promise.all([
      mutateVisited(),
      mutateMarkedVisited(),
      mutateWantToGo(),
      mutateMarkedWantToGo(),
    ]);
  };

  return {
    visitedPosts,
    wantToGoPosts,
    isLoading: v1 || v1m || v2 || v2m,
    mutateWantToGo,
    mutateAll,
  };
}

/** グループのアクティビティ（メンバーの投稿）をSWRでキャッシュ */
export function useGroupActivities(myUserId: string | null) {
  const { data: groupsData } = useSWR<any[]>('/api/groups', fetcher, {
    dedupingInterval: 120_000,
    revalidateOnFocus: false,
  });
  const joinedGroups = groupsData ?? [];

  const groupPostsKey = joinedGroups.length > 0 && myUserId
    ? ['/api/home/group-activities', joinedGroups.map((g: any) => g.id).join(',')]
    : null;

  const { data, isLoading } = useSWR(groupPostsKey, async () => {
    const activitiesMap = new Map<string, any>();
    const wantToGoMap = new Map<string, any>();
    const allPostsMap = new Map<string, any>();
    const initialLikes: Record<string, boolean> = {};
    const initialCounts: Record<string, number> = {};

    await Promise.all(
      joinedGroups.map(async (g: any) => {
        try {
          const posts = await getGroupPosts(g.id);
          posts.forEach((p: any) => {
            allPostsMap.set(p.id, { ...p, __group_name: g.name });
            initialCounts[p.id] = p.want_to_gos?.length || 0;
            initialLikes[p.id] = p.want_to_gos?.some((w: any) => w.user_id === myUserId) || false;
            if (p.status === 'want_to_go') {
              wantToGoMap.set(p.id, { ...p, __group_name: g.name });
            }
            if (p.user_id !== myUserId) {
              activitiesMap.set(p.id, { ...p, __group_name: g.name });
            }
          });
        } catch (e) {
          console.error(`Failed to load posts for group ${g.id}:`, e);
        }
      })
    );

    return {
      activities: Array.from(activitiesMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      allGroupWantToGo: Array.from(wantToGoMap.values()),
      initialLikes,
      initialCounts,
    };
  }, { dedupingInterval: 120_000, revalidateOnFocus: false });

  return {
    groupActivities: data?.activities ?? [],
    allGroupWantToGo: data?.allGroupWantToGo ?? [],
    initialLikes: data?.initialLikes ?? {},
    initialCounts: data?.initialCounts ?? {},
    isLoading,
  };
}

/** ランキング上位をSWRでキャッシュ */
export function useTopRankings() {
  const { data, isLoading } = useSWR(
    '/api/rankings/top',
    jsonFetcher,
    { dedupingInterval: 300_000, revalidateOnFocus: false }
  );
  return { rankingItems: data?.data ?? [], isLoading };
}
