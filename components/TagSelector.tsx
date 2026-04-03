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
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">タグを選択</h2>
          <button 
            type="button"
            onClick={handleConfirm}
            className="text-orange-600 font-black text-lg hover:text-orange-500 transition-colors"
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-12">
          {/* Add New Tag Row */}
          {showAddButton && (
            <div className="animate-in slide-in-from-left duration-200">
              <button
                type="button"
                onClick={() => {
                  toggleTag(searchQuery);
                  setSearchQuery('');
                }}
                className="flex items-center justify-between w-full p-4 border-2 border-dashed border-orange-200 bg-orange-50 rounded-2xl text-orange-600 group hover:border-orange-500 hover:bg-orange-100/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                    <Plus size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider opacity-60">新しいタグを作成</span>
                    <p className="text-lg font-black leading-none mt-0.5">#{searchQuery}</p>
                  </div>
                </div>
                <div className="bg-orange-500/10 px-3 py-1 rounded-full text-xs font-black">追加</div>
              </button>
            </div>
          )}

          {/* Tag Cloud */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">タグ一覧</h3>
            <div className="flex flex-wrap gap-2.5">
              {isLoading ? (
                <div className="w-full flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : filteredTags.length === 0 ? (
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
                        flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all duration-300 active:scale-95
                        ${isSelected 
                          ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-white border-gray-100 text-gray-600 hover:border-orange-500/30 hover:bg-orange-50/30'
                        }
                      `}
                    >
                      <Hash size={14} className={isSelected ? 'text-white' : 'text-gray-300'} />
                      <span>{tag}</span>
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
