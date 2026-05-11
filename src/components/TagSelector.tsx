'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, X, Hash, Check } from 'lucide-react';
import { getUserTags } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onSelect: (tags: string[]) => void;
};

export function TagSelector({ isOpen, onClose, selectedTags, onSelect }: Props) {
  const [userTags, setUserTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // 表示するタグの計算（ユーザー作成タグ、重複排除）
  const allAvailableTags = useMemo(() => {
    const userNames = userTags.map((t: Tag) => t.name);
    return Array.from(new Set(userNames));
  }, [userTags]);

  // 検索フィルタリング
  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().replace(/^#/, '');
    if (!query) return allAvailableTags;
    return allAvailableTags.filter((t: string) => 
      t.toLowerCase().includes(query.toLowerCase())
    );
  }, [allAvailableTags, searchQuery]);

  const toggleTag = (tagName: string) => {
    setTempSelected((prev: string[]) => 
      prev.includes(tagName) 
        ? prev.filter((t: string) => t !== tagName) 
        : [...prev, tagName]
    );
  };

  const handleAddTag = () => {
    const tagName = searchQuery.trim().replace(/^#/, '');
    if (tagName && !tempSelected.includes(tagName)) {
      setTempSelected((prev: string[]) => [...prev, tagName]);
      setSearchQuery('');
    }
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
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Bottom Sheet Body */}
      <div className="relative w-full max-w-2xl mx-auto bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-lg font-bold text-gray-400">タグを選択</h2>
          <button 
            type="button"
            onClick={handleConfirm}
            className="text-red-600 font-bold text-lg hover:opacity-70 transition-opacity"
          >
            決定
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search 
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" 
              size={18} 
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="タグ検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) handleAddTag();
              }}
              className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-300 focus:ring-0 text-base font-medium"
            />
          </div>
        </div>

        {/* Selected Tags Display */}
        {tempSelected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pb-2 min-h-10">
            {tempSelected.map((tag: string) => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-full text-[13px] font-bold animate-in zoom-in"
              >
                # {tag}
                <X size={14} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => toggleTag(tag)} />
              </span>
            ))}
          </div>
        )}

        {/* Tags Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-12">
          <div className="flex flex-wrap gap-3">
            {/* Persistent "+ 新しいタグ" chip (always visible) */}
            {!isLoading && (
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-500 font-bold text-sm transition-all hover:border-gray-300 active:scale-[0.97]"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>新しいタグ</span>
              </button>
            )}

            {/* Add / Select Chip - shows when typing */}
            {searchQuery.trim() && (() => {
              const name = searchQuery.trim().replace(/^#/, '');
              const alreadySelected = tempSelected.includes(name);
              if (alreadySelected) return null;
              const isExisting = allAvailableTags.includes(name);
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isExisting) {
                      toggleTag(name);
                    } else {
                      handleAddTag();
                    }
                  }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-full border-2 border-pink-200 bg-pink-50/30 text-pink-500 transition-all active:scale-[0.95] animate-in zoom-in"
                >
                  <span className="text-base font-bold opacity-60">#</span>
                  <span className="text-base font-bold text-gray-700">{name}</span>
                  <span className="text-base font-bold">{isExisting ? '選択' : '追加'}</span>
                </button>
              );
            })()}

            {isLoading ? (
              <div className="w-full flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-gray-100 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : (
              filteredTags.map((tag: string) => {
                const isSelected = tempSelected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border font-bold text-sm transition-all
                      ${isSelected 
                        ? 'bg-gray-100 border-gray-100 text-gray-900' 
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }
                    `}
                  >
                    <span className="opacity-50">#</span>
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
