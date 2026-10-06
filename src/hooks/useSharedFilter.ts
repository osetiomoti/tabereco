'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppType, type AppType } from '@/contexts/AppTypeContext';

type SharedFilterState = {
  activeTab: 'all' | 'want_to_go' | 'visited' | 'liked';
  keyword: string;
  searchMode: 'store_name' | 'address';
  activeGroups: string[];
  advancedFilters: any;
  activeMapTag: string | null;
  filterMode?: 'group' | 'registrant';
  tagMatchMode?: 'AND' | 'OR';
};

const defaultTaberecoState: SharedFilterState = {
  activeTab: 'all',
  keyword: '',
  searchMode: 'store_name',
  activeGroups: ['all'],
  advancedFilters: undefined,
  activeMapTag: null,
};

const defaultTabirecoState: SharedFilterState = {
  activeTab: 'all',
  keyword: '',
  searchMode: 'store_name',
  activeGroups: ['all'],
  advancedFilters: undefined,
  activeMapTag: null,
};

const getStorageKey = (appType: AppType) => `tabereco_shared_filter_v2_${appType}`;
const getEventKey = (appType: AppType) => `tabereco_shared_filter_updated_${appType}`;

// シンプルなイベントによる状態同期フック (appType ごとに独立して保持)
export function useSharedFilter() {
  const { appType } = useAppType();
  const defaultState = appType === 'tabireco' ? defaultTabirecoState : defaultTaberecoState;
  const storageKey = getStorageKey(appType);
  const eventKey = getEventKey(appType);

  const [filterState, setFilterState] = useState<SharedFilterState>(defaultState);

  useEffect(() => {
    // 初回ロードまたは appType 切り替え時
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setFilterState(JSON.parse(stored));
      } catch (e) {
        setFilterState(defaultState);
      }
    } else {
      // 移行措置: 旧共通キーがある場合は tabereco 用として一度だけ引き継ぐ
      if (appType === 'tabereco') {
        const legacy = localStorage.getItem('tabereco_shared_filter_v2');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            localStorage.setItem(storageKey, legacy);
            setFilterState(parsed);
            return;
          } catch (e) {}
        }
      }
      setFilterState(defaultState);
    }

    // イベントリスナー
    const handleUpdate = () => {
      const updated = localStorage.getItem(storageKey);
      if (updated) {
        try {
          setFilterState(JSON.parse(updated));
        } catch (e) {}
      }
    };

    window.addEventListener(eventKey, handleUpdate);
    // 別タブ対応用
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(eventKey, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [appType, storageKey, eventKey]);

  const updateFilter = useCallback((updates: Partial<SharedFilterState>) => {
    setFilterState(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {}
      window.dispatchEvent(new Event(eventKey));
      return next;
    });
  }, [storageKey, eventKey]);

  return { filterState, updateFilter };
}

