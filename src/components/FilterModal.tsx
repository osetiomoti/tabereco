'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, Lock, ChevronDown, Plus, Hash, Search, Users, Check, User } from 'lucide-react';
import { getUserTags } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import { TagSelector } from './TagSelector';

type FilterState = {
  tag: string;
  period: string;
  registrantUserId: string; // '' = all, or specific user id
  status: 'all' | 'visited';
  is_favorite: boolean;
  is_mine_only: boolean;
  activeGroups: string[]; // 'all', 'mine', or group IDs
};

type Member = {
  id: string;
  name: string;
  avatar_url?: string;
  role?: string;
};

type Group = {
  id: string;
  name: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  initialTags?: Tag[];
};

const PERIOD_OPTIONS = [
  { label: 'すべての期間', value: 'all' },
  { label: '今月', value: 'this_month' },
  { label: '過去3ヶ月', value: 'last_3_months' },
  { label: '今年', value: 'this_year' },
  { label: '昨年', value: 'last_year' },
];

const DEFAULT_FILTERS: FilterState = {
  tag: '',
  period: 'all',
  registrantUserId: '',
  status: 'all',
  is_favorite: false,
  is_mine_only: false,
  activeGroups: ['all'],
};

export function FilterModal({ isOpen, onClose, onApply, initialFilters, initialTags }: Props) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...(initialFilters || {}) });

  const [userTags, setUserTags] = useState<Tag[]>(initialTags || []);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Combobox state for group selector
  const [groupSearch, setGroupSearch] = useState('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  // Load tags + groups when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!initialTags) loadTags();
      loadGroups();
    }
  }, [isOpen]);

  // Load members whenever the selected groups change
  useEffect(() => {
    if (!isOpen) return;
    const selectedGroupIds = filters.activeGroups.filter(g => g !== 'all' && g !== 'mine');
    if (selectedGroupIds.length > 0) {
      loadMembers(selectedGroupIds);
    } else {
      setMembers([]);
    }
  }, [filters.activeGroups, isOpen]);

  // Close group dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadGroups = async () => {
    try {
      const { getJoinedGroups } = await import('@/lib/api/groups');
      const data = await getJoinedGroups();
      setJoinedGroups(data || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await getUserTags();
      setUserTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadMembers = async (groupIds: string[]) => {
    setLoadingMembers(true);
    try {
      const allMembers = new Map<string, Member>();
      await Promise.all(
        groupIds.map(async (gid) => {
          const res = await fetch(`/api/groups/${gid}/members`);
          const json = await res.json();
          (json.data || []).forEach((m: Member) => allMembers.set(m.id, m));
        })
      );
      setMembers(Array.from(allMembers.values()));
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setGroupSearch('');
    setMembers([]);
  };

  // ---- Group combobox helpers ----
  const allGroupOptions: { id: string; label: string; emoji: string }[] = [
    { id: 'all', label: 'すべて', emoji: '🌍' },
    { id: 'mine', label: '自分のみ', emoji: '👤' },
    ...joinedGroups.map(g => ({ id: g.id, label: g.name, emoji: '👥' })),
  ];

  const filteredGroupOptions = allGroupOptions.filter(o =>
    o.label.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const selectedGroupLabels = (): string => {
    if (filters.activeGroups.includes('all')) return 'すべて表示';
    return filters.activeGroups
      .map(id => {
        const opt = allGroupOptions.find(o => o.id === id);
        return opt ? `${opt.emoji} ${opt.label}` : id;
      })
      .join(', ');
  };

  const toggleGroupOption = (id: string) => {
    if (id === 'all') {
      toggleFilter('activeGroups', ['all']);
    } else {
      let next = filters.activeGroups.filter(x => x !== 'all');
      if (next.includes(id)) next = next.filter(x => x !== id);
      else next.push(id);
      if (next.length === 0) next = ['all'];
      toggleFilter('activeGroups', next);
    }
    // Reset member filter when groups change
    toggleFilter('registrantUserId', '');
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

          {/* 1. Group Combobox */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600 flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              表示するグループ
            </label>
            <div className="relative" ref={groupDropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setIsGroupDropdownOpen(v => !v)}
                className={`w-full flex items-center justify-between bg-[#fdfdfd] border-2 rounded-2xl py-3.5 px-5 text-left transition-all ${
                  isGroupDropdownOpen
                    ? 'border-indigo-300 ring-4 ring-indigo-50/50'
                    : 'border-gray-100 hover:border-indigo-200'
                }`}
              >
                <span className="font-bold text-gray-800 text-sm truncate pr-2">
                  {selectedGroupLabels()}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {isGroupDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {/* Search input */}
                  <div className="p-3 border-b border-gray-50">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <Search size={16} className="text-gray-300 shrink-0" />
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={e => setGroupSearch(e.target.value)}
                        placeholder="グループを検索..."
                        className="flex-1 bg-transparent text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:outline-none"
                        autoFocus
                      />
                      {groupSearch && (
                        <button onClick={() => setGroupSearch('')}>
                          <X size={14} className="text-gray-300" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredGroupOptions.length === 0 ? (
                      <p className="text-center text-xs text-gray-300 py-4">見つかりませんでした</p>
                    ) : (
                      filteredGroupOptions.map(opt => {
                        const isSelected = filters.activeGroups.includes(opt.id) ||
                          (opt.id === 'all' && filters.activeGroups.includes('all'));
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleGroupOption(opt.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {opt.emoji} {opt.label}
                            </span>
                            {isSelected && (
                              <Check size={16} className="text-indigo-500 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Registrant (group members) */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600 flex items-center gap-2">
              <User size={16} className="text-orange-400" />
              投稿者
            </label>
            {filters.activeGroups.includes('all') || filters.activeGroups.length === 0 ? (
              <p className="text-xs text-gray-300 font-bold italic">
                グループを選択すると、そのメンバーで絞り込めます
              </p>
            ) : loadingMembers ? (
              <div className="flex gap-2 items-center text-xs text-gray-300 font-bold">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                メンバーを読み込み中...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {/* "All" option */}
                <button
                  onClick={() => toggleFilter('registrantUserId', '')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all border ${
                    filters.registrantUserId === ''
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200'
                  }`}
                >
                  全員
                </button>
                {members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => toggleFilter('registrantUserId', member.id === filters.registrantUserId ? '' : member.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all border flex items-center gap-1.5 ${
                      filters.registrantUserId === member.id
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-orange-200'
                    }`}
                  >
                    {member.name || member.id.slice(0, 8)}
                  </button>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-gray-300 font-bold italic">メンバーが見つかりませんでした</p>
                )}
              </div>
            )}
          </section>

          {/* 3. Tags */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-gray-600 flex items-center gap-2">
                <Hash size={16} className="text-pink-400" />
                タグ
              </label>
              {filters.tag && (
                <button
                  onClick={() => toggleFilter('tag', '')}
                  className="text-[10px] bg-red-50 text-red-500 px-2.5 py-1 rounded-full font-black uppercase tracking-widest"
                >
                  クリア
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {filters.tag ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-500/20 animate-in zoom-in">
                  <Hash size={16} />
                  <span>{filters.tag}</span>
                  <X size={16} className="ml-1 cursor-pointer opacity-70 hover:opacity-100" onClick={() => toggleFilter('tag', '')} />
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

            <div className="flex flex-wrap gap-2">
              {userTags.slice(0, 10).map(tag => (
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
              ))}
            </div>

            <TagSelector
              isOpen={isTagSelectorOpen}
              onClose={() => setIsTagSelectorOpen(false)}
              selectedTags={filters.tag ? [filters.tag] : []}
              onSelect={(tags) => toggleFilter('tag', tags[0] || '')}
            />
          </section>

          {/* 4. Period */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600">期間</label>
            <div className="relative group">
              <select
                value={filters.period}
                onChange={e => toggleFilter('period', e.target.value)}
                className="w-full appearance-none bg-[#fdfdfd] border-2 border-gray-100 rounded-2xl py-4 px-5 text-gray-900 focus:outline-none focus:border-orange-200 focus:ring-4 focus:ring-orange-50/50 transition-all font-bold"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={20} />
            </div>
          </section>

          {/* 5. Status (visited only, no want_to_go) */}
          <section className="space-y-3">
            <label className="text-sm font-black text-gray-600">状態</label>
            <div className="bg-gray-50/50 p-1 rounded-[1.5rem] flex gap-1">
              {[
                { id: 'all', label: 'すべて' },
                { id: 'visited', label: '行った✓' },
              ].map(s => (
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

          {/* 6. Favorites / Private Toggles */}
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
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-50">
          <button
            onClick={() => { onApply(filters); onClose(); }}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-orange-500 to-orange-400 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all"
          >
            絞り込みを適用する
          </button>
        </div>
      </div>
    </div>
  );
}
