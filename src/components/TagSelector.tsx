'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, X, Hash, Check, Users } from 'lucide-react';
import { useMyTags, useGroupTags } from '@/hooks/useAppData';
import type { Tag } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onSelect: (tags: string[]) => void;
};

export function TagSelector({ isOpen, onClose, selectedTags, onSelect }: Props) {
  // SWRキャッシュから即座に取得（ページ遷移をまたいで共有される）
  const { tags: swrTags, isLoading: swrLoading } = useMyTags();
  const { tags: groupSwrTags, isLoading: groupLoading } = useGroupTags();
  const [showGroupTags, setShowGroupTags] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いた時に初期化
  useEffect(() => {
    if (isOpen) {
      setTempSelected([...selectedTags]);
      setSearchQuery('');
      setIsCreating(false);
      setNewTagName('');
    }
  }, [isOpen]);

  // 表示するタグの計算（ユーザー作成タグ、重複排除）
  const allAvailableTags = useMemo(() => {
    const sourceTags = showGroupTags ? groupSwrTags : swrTags;
    const names = sourceTags.map((t: Tag) => t.name);
    return Array.from(new Set(names));
  }, [swrTags, groupSwrTags, showGroupTags]);

  // 検索フィルタリング
  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().replace(/^#/, '');
    if (!query) return allAvailableTags;
    return allAvailableTags.filter((t: string) => 
      t.toLowerCase().includes(query.toLowerCase())
    );
  }, [allAvailableTags, searchQuery]);

  const isLoading = showGroupTags ? groupLoading : swrLoading;

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

  const handleCreateInlineTag = () => {
    const name = newTagName.trim().replace(/^#/, '');
    if (name) {
      if (!tempSelected.includes(name)) {
        setTempSelected((prev: string[]) => [...prev, name]);
      }
      setIsCreating(false);
      setNewTagName('');
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!newTagName.trim()) {
        setIsCreating(false);
      }
    }, 200);
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

        {/* グループ全員のタグ切替トグル */}
        <div className="px-6 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className={showGroupTags ? 'text-orange-500' : 'text-gray-300'} />
            <span className={`text-[11px] font-bold ${showGroupTags ? 'text-orange-500' : 'text-gray-400'}`}>
              グループ全員のタグを含む
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowGroupTags(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${showGroupTags ? 'bg-orange-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showGroupTags ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
              isCreating ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#F3E2DD] bg-[#FAF1EE] text-[#A86E64] animate-in zoom-in">
                  <span className="text-[13px] font-bold opacity-60">#</span>
                  <input
                    type="text"
                    placeholder="タグ名を入力"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onBlur={handleBlur}
                    className="bg-transparent border-none p-0 text-[13px] font-medium text-gray-700 placeholder:text-gray-300 focus:ring-0 w-28 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateInlineTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineTag}
                    className="text-[13px] font-bold text-[#E6557E] hover:text-[#D1446C] transition-colors whitespace-nowrap ml-1"
                  >
                    追加
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-500 font-bold text-sm transition-all hover:border-gray-300 active:scale-[0.97]"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>新しいタグ</span>
                </button>
              )
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
