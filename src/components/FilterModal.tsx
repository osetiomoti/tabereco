'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, Lock, ChevronDown, Plus, Hash, Search } from 'lucide-react';
import { getUserTags } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import { TagSelector } from './TagSelector';

type FilterState = {
  tags: string[];
  period: string;
  registrantUserId: string;
  status: 'all' | 'visited' | 'want_to_go';
  is_favorite: boolean;
  is_mine_only: boolean;
  activeGroups: string[];
};

type Member = { id: string; name: string; avatar_url?: string };
type Group  = { id: string; name: string };

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

const DEFAULT: FilterState = {
  tags: [],
  period: 'all',
  registrantUserId: '',
  status: 'all',
  is_favorite: false,
  is_mine_only: false,
  activeGroups: ['all'],
};

export function FilterModal({ isOpen, onClose, onApply, initialFilters, initialTags }: Props) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT, ...(initialFilters || {}) });
  const [userTags, setUserTags]         = useState<Tag[]>(initialTags || []);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [members, setMembers]           = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // combobox state
  const [groupSearch,  setGroupSearch]  = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [groupOpen,  setGroupOpen]  = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const groupRef  = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  /* ── load on open ── */
  useEffect(() => {
    if (!isOpen) return;
    if (!initialTags) loadTags();
    loadGroups();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let ids = filters.activeGroups.filter(g => g !== 'all' && g !== 'mine');
    
    // If 'all' is selected, include all joined groups
    if (filters.activeGroups.includes('all')) {
      ids = joinedGroups.map(g => g.id);
    }
    
    if (ids.length) loadMembers(ids);
    else setMembers([]);
  }, [filters.activeGroups, isOpen, joinedGroups]);

  /* ── click-outside ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (groupRef.current  && !groupRef.current.contains(e.target as Node))  setGroupOpen(false);
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const loadGroups = async () => {
    const { getJoinedGroups } = await import('@/lib/api/groups');
    setJoinedGroups((await getJoinedGroups()) || []);
  };
  const loadTags = async () => {
    setUserTags(await getUserTags());
  };
  const loadMembers = async (ids: string[]) => {
    setLoadingMembers(true);
    const map = new Map<string, Member>();
    await Promise.all(ids.map(async id => {
      const r = await fetch(`/api/groups/${id}/members`);
      const j = await r.json();
      (j.data || []).forEach((m: Member) => map.set(m.id, m));
    }));
    setMembers([...map.values()]);
    setLoadingMembers(false);
  };

  const set = (k: keyof FilterState, v: any) =>
    setFilters(p => ({ ...p, [k]: v }));

  const handleReset = () => {
    setFilters({ ...DEFAULT });
    setGroupSearch(''); setMemberSearch('');
    setMembers([]);
  };

  /* ── group options ── */
  const groupOptions = [
    { id: 'all',  label: 'すべて' },
    { id: 'mine', label: '自分のみ' },
    ...joinedGroups.map(g => ({ id: g.id, label: g.name })),
  ];
  const filteredGroups = groupOptions.filter(o =>
    o.label.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const toggleGroup = (id: string) => {
    if (id === 'all') { set('activeGroups', ['all']); set('registrantUserId', ''); return; }
    let next = filters.activeGroups.filter(x => x !== 'all');
    next = next.includes(id) ? next.filter(x => x !== id) : [...next, id];
    if (!next.length) next = ['all'];
    set('activeGroups', next);
    set('registrantUserId', '');
  };

  const groupLabel = () => {
    if (filters.activeGroups.includes('all')) return 'すべて';
    return filters.activeGroups.map(id => groupOptions.find(o => o.id === id)?.label ?? id).join(', ');
  };

  /* ── member options ── */
  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(memberSearch.toLowerCase())
  );
  const memberLabel = () => {
    if (!filters.registrantUserId) return '全員';
    return members.find(m => m.id === filters.registrantUserId)?.name ?? '選択中';
  };

  // Remove hasFilter restriction so dropdown is always enabled
  const memberOptionsEnabled = members.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900">絞り込み</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="text-[13px] font-medium text-gray-400 hover:text-gray-600">
              リセット
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 pb-28">

          {/* ── Group Combobox ── */}
          <section className="space-y-2">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">グループ</label>
            <div className="relative" ref={groupRef}>
              <button
                type="button"
                onClick={() => setGroupOpen(v => !v)}
                className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-left transition-all bg-white ${
                  groupOpen ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-[14px] font-medium text-gray-800 truncate">{groupLabel()}</span>
                <ChevronDown size={16} className={`text-gray-400 shrink-0 ml-2 transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
              </button>

              {groupOpen && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* search */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input
                        value={groupSearch}
                        onChange={e => setGroupSearch(e.target.value)}
                        placeholder="グループを検索..."
                        className="flex-1 bg-transparent text-[13px] text-gray-700 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* items */}
                  <div className="max-h-44 overflow-y-auto py-1">
                    {filteredGroups.map(opt => {
                      const checked = filters.activeGroups.includes(opt.id);
                      return (
                        <label key={opt.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroup(opt.id)}
                            className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                          />
                          <span className="text-[14px] text-gray-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Member Combobox ── */}
          <section className="space-y-2">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">投稿者</label>
            {!memberOptionsEnabled ? (
              <p className="text-[13px] text-gray-400 italic">グループにメンバーがいません</p>
            ) : (
              <div className="relative" ref={memberRef}>
                <button
                  type="button"
                  onClick={() => setMemberOpen(v => !v)}
                  className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-left transition-all bg-white ${
                    memberOpen ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-[14px] font-medium text-gray-800 truncate">{memberLabel()}</span>
                  <ChevronDown size={16} className={`text-gray-400 shrink-0 ml-2 transition-transform ${memberOpen ? 'rotate-180' : ''}`} />
                </button>

                {memberOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="メンバーを検索..."
                          className="flex-1 bg-transparent text-[13px] text-gray-700 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto py-1">
                      {/* "all" option */}
                      <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="member"
                          checked={!filters.registrantUserId}
                          onChange={() => set('registrantUserId', '')}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-[14px] text-gray-700">全員</span>
                      </label>
                      {loadingMembers ? (
                        <div className="px-4 py-3 text-[13px] text-gray-400">読み込み中...</div>
                      ) : (
                        filteredMembers.map(m => (
                          <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                            <input
                              type="radio"
                              name="member"
                              checked={filters.registrantUserId === m.id}
                              onChange={() => set('registrantUserId', m.id)}
                              className="w-4 h-4 accent-orange-500"
                            />
                            <span className="text-[14px] text-gray-700">{m.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Tag ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">タグ</label>
              {filters.tags.length > 0 && (
                <button onClick={() => set('tags', [])} className="text-[11px] text-red-400 hover:text-red-500 font-medium">すべてクリア</button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filters.tags.map(tag => (
                <div key={tag} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-[10px] text-[13px] font-medium animate-in zoom-in">
                  <Hash size={14} />
                  <span>{tag}</span>
                  <X size={14} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => set('tags', filters.tags.filter(t => t !== tag))} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsTagSelectorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-[13px] font-medium hover:border-orange-300 hover:text-orange-500 transition-all mt-1"
            >
              <Plus size={16} />
              タグを追加する
            </button>
            <div className="flex flex-wrap gap-2 mt-4">
              {userTags.slice(0, 12).map(tag => {
                const isSelected = filters.tags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) set('tags', filters.tags.filter(t => t !== tag.name));
                      else set('tags', [...filters.tags, tag.name]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      isSelected
                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
            <TagSelector
              isOpen={isTagSelectorOpen}
              onClose={() => setIsTagSelectorOpen(false)}
              selectedTags={filters.tags}
              onSelect={tags => set('tags', tags)}
            />
          </section>

          {/* ── Period ── */}
          <section className="space-y-2">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">期間</label>
            <div className="relative">
              <select
                value={filters.period}
                onChange={e => set('period', e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              >
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </section>

          {/* ── Status ── */}
          <section className="space-y-2">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">状態</label>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'すべて' }, 
                { id: 'visited', label: '行った' },
                { id: 'want_to_go', label: '行きたい' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => set('status', s.id as any)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all border ${
                    filters.status === s.id
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Toggles ── */}
          <section className="space-y-2">
            {[
              { key: 'is_favorite', icon: <Heart size={16} className={filters.is_favorite ? 'fill-orange-500 text-orange-500' : ''} />, label: 'お気に入りのみ' },
              { key: 'is_mine_only', icon: <Lock size={16} />, label: '自分の非公開のみ' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => set(key as any, !(filters as any)[key])}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-[14px] font-medium transition-all ${
                  (filters as any)[key]
                    ? 'bg-orange-50 border-orange-200 text-orange-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </section>
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white/95 backdrop-blur-sm border-t border-gray-100">
          <button
            onClick={() => { onApply(filters); onClose(); }}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[15px] active:scale-98 transition-all shadow-sm"
          >
            絞り込みを適用する
          </button>
        </div>
      </div>
    </div>
  );
}
