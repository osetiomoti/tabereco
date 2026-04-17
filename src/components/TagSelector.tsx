'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Hash, Check } from 'lucide-react';
import { getUserTags } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onSelect: (tags: string[]) => void;
};

// 初期表示用の共通タグ（プリセット）
const PRESET_TAGS = [
  'グルメ', 'スイーツ', 'ラーメン', 'カフェ', '居酒屋', 
  'ランチ', 'ディナー', '自炊', 'コンビニ', '激辛', 'ヘルシー'
];

export function TagSelector({ isOpen, onClose, selectedTags, onSelect }: Props) {
  const [userTags, setUserTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // モーダルが開いた時に初期化
  useEffect(() => {
    if (isOpen) {
      setTempSelected([...selectedTags]);
      setSearchQuery('');
      loadUserTags();
    }
  }, [isOpen]);

  const loadUserTags = async () => {
    setIsLoading(true);
    try {
      const tags = await getUserTags();
      setUserTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 表示するタグの計算（プリセット + ユーザー作成タグ、重複排除）
  const allAvailableTags = useMemo(() => {
    const userNames = userTags.map(t => t.name);
    return Array.from(new Set([...PRESET_TAGS, ...userNames]));
  }, [userTags]);

  // 検索フィルタリング
  const filteredTags = useMemo(() => {
    if (!searchQuery) return allAvailableTags;
    return allAvailableTags.filter(t => 
      t.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allAvailableTags, searchQuery]);

  // 入力中の文字が既存タグにない場合、新規追加ボタンを表示
  const showAddButton = searchQuery && !allAvailableTags.some(t => t === searchQuery);

  const toggleTag = (tagName: string) => {
    setTempSelected(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    );
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet Body */}
      <div className="relative w-full max-w-2xl mx-auto bg-white rounded-t-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-400 tracking-tight">タグを選択</h2>
          <button 
            type="button"
            onClick={handleConfirm}
            className="text-red-600 font-black text-sm hover:text-red-500 transition-colors"
          >
            決定
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4">
          <div className="relative group">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" 
              size={20} 
            />
            <input
              type="text"
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
            />
          </div>
        </div>

        {/* Selected Tags Display (Mini Chips) */}
        {tempSelected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pb-2 min-h-11">
            {tempSelected.map(tag => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-full text-sm font-bold shadow-md shadow-orange-500/20 animate-in zoom-in"
              >
                #{tag}
                <X size={14} className="cursor-pointer" onClick={() => toggleTag(tag)} />
              </span>
            ))}
          </div>
        )}

        {/* Tags Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-12">

          {/* Tag Cloud */}
          <div className="flex flex-wrap gap-2.5">
            {/* Quick Add Input Chip — visible only when user has typed something */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  const tagName = searchQuery.trim().replace(/^#/, '');
                  if (tagName) {
                    if (!tempSelected.includes(tagName)) {
                      setTempSelected(prev => [...prev, tagName]);
                    }
                    setSearchQuery('');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-orange-400 bg-orange-50 text-orange-600 transition-all duration-300 active:scale-95 shadow-sm"
              >
                <Hash size={14} className="text-orange-400" />
                <span className="text-sm font-bold">{searchQuery.trim().replace(/^#/, '')}</span>
                <span className="text-orange-500 text-sm font-black ml-2">追加 +</span>
              </button>
            )}

            {isLoading ? (
              <div className="w-full flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-gray-100 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : filteredTags.length === 0 && !searchQuery ? (
              <p className="text-gray-400 text-sm w-full text-center py-8">タグが見つかりませんでした</p>
            ) : (
              filteredTags.map(tag => {
                const isSelected = tempSelected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-sm transition-all duration-300 active:scale-95
                      ${isSelected 
                        ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }
                    `}
                  >
                    <Hash size={14} className={isSelected ? 'text-white' : 'text-gray-400'} />
                    <span>{tag}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
