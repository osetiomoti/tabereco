'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Lock, Check, ChevronDown, Plus, Hash } from 'lucide-react';
import { getUserTags } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import { TagSelector } from './TagSelector';

type FilterState = {
  tag: string;
  period: string;
  registrant: 'all' | 'me';
  status: 'all' | 'want_to_go' | 'visited';
  is_favorite: boolean;
  is_mine_only: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
  initialTags?: Tag[];
};

const PERIOD_OPTIONS = [
  { label: 'すべての期間', value: 'all' },
  { label: '今年', value: 'this_year' },
  { label: '今月', value: 'this_month' },
  { label: '昨月', value: 'last_month' },
];

export function FilterModal({ isOpen, onClose, onApply, initialFilters, initialTags }: Props) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    tag: '',
    period: 'all',
    registrant: 'all',
    status: 'all',
    is_favorite: false,
    is_mine_only: false,
  });

  const [userTags, setUserTags] = useState<Tag[]>(initialTags || []);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen && !initialTags) {
      loadTags();
    }
  }, [isOpen, initialTags]);

  const loadTags = async () => {
    try {
      const tags = await getUserTags();
      setUserTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const toggleFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      tag: '',
      period: 'all',
      registrant: 'all',
      status: 'all',
      is_favorite: false,
      is_mine_only: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Container */}
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[92vh] flex flex-col">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-black text-gray-900">絞り込み</h2>
          <button onClick={handleReset} className="text-sm font-bold text-gray-400 hover:text-gray-600 underline underline-offset-4 decoration-gray-200">
            リセット
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 pb-32">
          {/* Tags */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
               <label className="text-sm font-black text-gray-600">タグで絞り込む</label>
               {filters.tag && (
                 <button 
                   onClick={() => toggleFilter('tag', '')}
                   className="text-[10px] bg-red-50 text-red-500 px-2.5 py-1 rounded-full font-black uppercase tracking-widest"
                 >
                   クリア
                 </button>
               )}
            </div>

            {/* Currently Selected + Tag Addition Button */}
            <div className="flex flex-wrap gap-2.5">
              {filters.tag ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-500/20 animate-in zoom-in">
                  <Hash size={16} />
                  <span>{filters.tag}</span>
                  <X 
                    size={16} 
                    className="ml-1 cursor-pointer opacity-70 hover:opacity-100" 
                    onClick={() => toggleFilter('tag', '')} 
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTagSelectorOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-[#fdfdfd] border-2 border-dashed border-gray-100 text-gray-300 rounded-2xl font-black hover:border-pink-200 hover:text-pink-400 transition-all active:scale-95"
                >
                  <Plus size={20} />
                  <span>タグを選択して追加</span>
                </button>
              )}
            </div>

            {/* Tag Candidates (Chips) */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 ml-1">
                よく使うタグの候補
              </span>
              <div className="flex flex-wrap gap-2">
                {userTags.length > 0 ? (
                  userTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleFilter('tag', tag.name)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        filters.tag === tag.name 
                          ? 'bg-pink-100 text-pink-600 border border-pink-200' 
                          : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-300 italic ml-1">タグの履歴がありません</p>
                )}
                
                {userTags.length > 10 && (
                   <button 
                     onClick={() => setIsTagSelectorOpen(true)}
                     className="px-3 py-2 text-pink-400 text-xs font-black underline underline-offset-4"
                   >
                     もっと見る...
                   </button>
                )}
              </div>
            </div>
            
            <TagSelector
              isOpen={isTagSelectorOpen}
              onClose={() => setIsTagSelectorOpen(false)}
              selectedTags={filters.tag ? [filters.tag] : []}
              onSelect={(tags) => toggleFilter('tag', tags[0] || '')}
            />
          </section>

          {/* Period */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600">期間</label>
            <div className="relative group">
              <select
                value={filters.period}
                onChange={(e) => toggleFilter('period', e.target.value)}
                className="w-full appearance-none bg-[#fdfdfd] border-2 border-gray-100 rounded-2xl py-4 px-5 text-gray-900 focus:outline-none focus:border-orange-200 focus:ring-4 focus:ring-orange-50/50 transition-all font-bold"
              >
                {PERIOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none group-focus-within:text-orange-400 transition-colors" size={20} />
            </div>
          </section>

          {/* Registrant */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600">登録者</label>
            <div className="flex gap-3">
              {['all', 'me'].map((r) => (
                <button
                  key={r}
                  onClick={() => toggleFilter('registrant', r)}
                  className={`flex-1 py-3.5 rounded-full font-black text-sm transition-all duration-300 ${
                    filters.registrant === r 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-white border-2 border-gray-100 text-gray-400'
                  }`}
                >
                  {r === 'all' ? '全員' : 'たけたけ'}
                </button>
              ))}
            </div>
          </section>

          {/* Status */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600">状態</label>
            <div className="bg-gray-50/50 p-1 rounded-[1.5rem] flex gap-1">
              {[
                { id: 'all', label: 'すべて' },
                { id: 'want_to_go', label: 'やりたい' },
                { id: 'visited', label: '達成済み✓' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleFilter('status', s.id)}
                  className={`flex-1 py-3 rounded-[1.25rem] font-black text-sm transition-all duration-300 ${
                    filters.status === s.id 
                      ? 'bg-white text-pink-500 shadow-xl shadow-pink-500/10' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Favorites Toggles */}
          <section className="space-y-3 pt-2">
            <button 
              onClick={() => toggleFilter('is_favorite', !filters.is_favorite)}
              className={`w-full py-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-black transition-all ${
                filters.is_favorite 
                  ? 'bg-pink-50 border-pink-200 text-pink-600' 
                  : 'bg-white border-gray-100 text-gray-500'
              }`}
            >
              <Heart size={18} className={filters.is_favorite ? 'fill-pink-500' : ''} />
              お気に入りのみ表示
            </button>

            <button 
              onClick={() => toggleFilter('is_mine_only', !filters.is_mine_only)}
              className={`w-full py-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-black transition-all ${
                filters.is_mine_only 
                  ? 'bg-gray-100 border-gray-200 text-gray-900' 
                  : 'bg-white border-gray-100 text-gray-500'
              }`}
            >
              <Lock size={18} />
              自分だけの非公開を表示
            </button>
          </section>
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50">
          <button 
            onClick={() => { onApply(filters); onClose(); }}
            className="w-full py-4.5 bg-gradient-to-r from-pink-500 via-orange-500 to-orange-400 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest"
          >
            絞り込みを適用する
            <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center ml-2">
              <span className="text-xs">N</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
