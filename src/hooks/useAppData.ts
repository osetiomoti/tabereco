/**
 * useAppData - グローバルキャッシュを使ったデータフック
 * SWRのキャッシュを共有することで、ページ遷移をまたいでも再フェッチしない
 */
import { useMemo } from 'react';
import useSWR from 'swr';
import { getUserTags } from '@/lib/api/posts';
import { getFriends } from '@/lib/api/friends';
import type { Tag } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(j => j.data);

/** 自分のプロフィール（キャッシュ共有） */
export function useMyProfile() {
  const { data, isLoading } = useSWR('/api/profiles/me', fetcher, {
    dedupingInterval: 300_000, // 5分間キャッシュ
  });
  return { profile: data ?? null, isLoading };
}

/** 自分のタグ一覧（キャッシュ共有） */
export function useMyTags() {
  const { data, isLoading, mutate } = useSWR<Tag[]>('/api/tags', () => getUserTags(), {
    dedupingInterval: 60_000,
  });
  return { tags: data ?? [], isLoading, mutate };
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
