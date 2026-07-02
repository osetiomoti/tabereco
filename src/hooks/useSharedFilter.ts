'use client';

import { useState, useEffect } from 'react';

type SharedFilterState = {
  activeTab: 'all' | 'want_to_go' | 'visited';
  keyword: string;
  activeGroups: string[];
  advancedFilters: any;
  activeMapTag: string | null;
};

const defaultState: SharedFilterState = {
  activeTab: 'all',
  keyword: '',
  activeGroups: ['all'],
  advancedFilters: { include_mine: true },
  activeMapTag: null, // map側のタグ用
};

const STORAGE_KEY = 'tabereco_shared_filter';
const EVENT_KEY = 'tabereco_shared_filter_updated';

// シンプルなイベントによる状態同期フック
export function useSharedFilter() {
  const [filterState, setFilterState] = useState<SharedFilterState>(defaultState);

  useEffect(() => {
    // 初回ロード
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFilterState(JSON.parse(stored));
      } catch (e) {}
    }

    // イベントリスナー
    const handleUpdate = () => {
      const updated = localStorage.getItem(STORAGE_KEY);
      if (updated) {
        try {
           setFilterState(JSON.parse(updated));
        } catch (e) {}
      }
    };

    window.addEventListener(EVENT_KEY, handleUpdate);
    // 別タブ対応用
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateFilter = (updates: Partial<SharedFilterState>) => {
    setFilterState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT_KEY));
      return next;
    });
  };

  return { filterState, updateFilter };
}
