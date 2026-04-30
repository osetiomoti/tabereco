import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePosts() {
  const { data, error, isLoading, mutate } = useSWR('/api/posts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    posts: data?.items || [],
    isLoading,
    isError: error,
    mutate,
  };
}
