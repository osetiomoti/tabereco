import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/profiles/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // プロフィールは頻繁に変わらないので長めにキャッシュ
  });

  return {
    user: data?.data || null,
    isLoading,
    isError: error,
    mutate,
  };
}
