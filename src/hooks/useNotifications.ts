import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useUnreadNotifications() {
  const { data, error, mutate } = useSWR('/api/notifications/unread-count', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  });

  return {
    count: data?.count ?? 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
