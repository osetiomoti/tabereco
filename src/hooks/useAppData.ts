/**
 * useAppData - グローバルキャッシュを使ったデータフック
 * SWRのキャッシュを共有することで、ページ遷移をまたいでも再フェッチしない
 */
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
  const { data, isLoading } = useSWR<any[]>('/api/friends', () => getFriends(), {
    dedupingInterval: 120_000, // 2分間キャッシュ
  });
  return { friends: data ?? [], isLoading };
}

/** グループ一覧（キャッシュ共有） */
export function useGroups() {
  const { data, isLoading } = useSWR<any[]>('/api/groups', fetcher, {
    dedupingInterval: 120_000,
  });
  return { groups: data ?? [], isLoading };
}
