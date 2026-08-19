'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, ChevronDown, Plus, Hash, Search, Users, User } from 'lucide-react';
import { useMyTags, useGroups, useMyProfile, useFriends } from '@/hooks/useAppData';
import type { Tag } from '@/lib/types';
import { TagSelector } from './TagSelector';

type FilterState = {
  tags: string[];
  period: string;
  period_start?: string;
  period_end?: string;
  filterMode: 'registrant' | 'group';
  registrantUserIds: string[];
  status: 'all' | 'visited' | 'want_to_go';
  is_favorite: boolean;
  is_mine_only: boolean;
  include_mine: boolean;
  activeGroups: string[];
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  sort_order: 'created_desc' | 'visited_desc' | 'rating_asc' | 'rating_desc' | 'price_asc' | 'price_desc';
  tagMatchMode: 'AND' | 'OR';
};

type Member = { id: string; name: string; avatar_url?: string };
type Group  = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  initialTags?: Tag[];
  hideGroupAndRegistrant?: boolean;
  hideStatus?: boolean;
  hideTags?: boolean;
};

const PERIOD_OPTIONS = [
  { label: '指定なし', value: 'none' },
  { label: 'すべての期間（日付あり）', value: 'all' },
  { label: '今月', value: 'this_month' },
  { label: '過去3ヶ月', value: 'last_3_months' },
  { label: '今年', value: 'this_year' },
  { label: '昨年', value: 'last_year' },
  { label: 'カスタム', value: 'custom' },
];

const PRICE_OPTIONS = [0, 1000, 2000, 3000, 4000, 5000, 10000];

const DEFAULT: FilterState = {
  tags: [],
  period: 'none',
  filterMode: 'group',
  registrantUserIds: [],
  status: 'all',
  is_favorite: false,
  is_mine_only: false,
  include_mine: true,
  activeGroups: [],
  sort_order: 'created_desc',
  tagMatchMode: 'AND',
};

export function FilterModal({ isOpen, onClose, onApply, initialFilters, initialTags, hideGroupAndRegistrant = false, hideStatus = false, hideTags = false }: Props) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT, ...(initialFilters || {}) });
  const { tags: swrTags } = useMyTags();
  const { groups: swrGroups } = useGroups();
  const { friends: swrFriends } = useFriends();
  const { profile: currentUser } = useMyProfile();
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [members, setMembers]           = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, string[]>>({});
  const hasDefaulted = useRef(false);

  // combobox state
  const [groupSearch,  setGroupSearch]  = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [groupOpen,  setGroupOpen]  = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const groupRef  = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  const [priceMinMode, setPriceMinMode] = useState<'select' | 'custom'>(() => {
    if (initialFilters?.price_min === undefined) return 'select';
    return PRICE_OPTIONS.includes(initialFilters.price_min) ? 'select' : 'custom';
  });
  const [priceMaxMode, setPriceMaxMode] = useState<'select' | 'custom'>(() => {
    if (initialFilters?.price_max === undefined) return 'select';
    return PRICE_OPTIONS.includes(initialFilters.price_max) ? 'select' : 'custom';
  });

  /* ── load on open ── */
  useEffect(() => {
    if (!isOpen) {
      hasDefaulted.current = false;
      return;
    }
    setJoinedGroups(swrGroups);

    setFilters(prev => {
      const base = { ...DEFAULT, ...(initialFilters || {}) };
      // Fallback if period is 'all' but intended to be 'none' from old data? We can leave as is, DEFAULT has 'none'
      if (!initialFilters?.activeGroups || initialFilters.activeGroups.length === 0 || initialFilters.activeGroups.includes('all')) {
        base.activeGroups = swrGroups.map(g => g.id);
      }
      return base;
    });
  }, [isOpen, swrGroups]);

  useEffect(() => {
    if (joinedGroups.length > 0) {
      const allGroupIds = joinedGroups.map(g => g.id);
      loadMembers(allGroupIds);
    }
  }, [joinedGroups]);

  /* ── click-outside ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (groupRef.current  && !groupRef.current.contains(e.target as Node))  setGroupOpen(false);
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── デフォルト全選択: メンバー読み込み後かつcurrentUser確定後、未選択なら全員を選択 ── */
  useEffect(() => {
    // currentUserがまだ読み込まれていない場合は待機する
    if (members.length > 0 && currentUser && !hasDefaulted.current) {
      hasDefaulted.current = true;
      setFilters(prev => {
        let next = { ...prev };
        if (prev.registrantUserIds.length === 0) {
          // 全員を選択（自分も含む）
          const allIds = members.map(m => m.id);
          if (allIds.length > 0) next.registrantUserIds = allIds;
        }
        return next;
      });
    }
  }, [members, currentUser]);

  const loadMembers = async (ids: string[]) => {
    setLoadingMembers(true);
    const memberMap = new Map<string, Member>();
    // 自分自身も追加
    if (currentUser) {
      memberMap.set(currentUser.id, { id: currentUser.id, name: currentUser.name || '自分' });
    }
    const gMembersMap: Record<string, string[]> = {};
    await Promise.all(ids.map(async id => {
      const r = await fetch(`/api/groups/${id}/members`);
      const j = await r.json();
      const mIds: string[] = [];
      (j.data || []).forEach((m: Member) => {
        memberMap.set(m.id, m);
        mIds.push(m.id);
      });
      gMembersMap[id] = mIds;
    }));
    setMembers([...memberMap.values()]);
    setGroupMembersMap(gMembersMap);
    setLoadingMembers(false);
  };

  const set = (k: keyof FilterState, v: any) =>
    setFilters(p => ({ ...p, [k]: v }));

  const handleReset = () => {
    const allIds = members.filter(m => m.id !== currentUser?.id).map(m => m.id);
    setFilters({
      ...DEFAULT,
      activeGroups: groupOptions.map(g => g.id),
      registrantUserIds: allIds,
    });
    setGroupSearch(''); setMemberSearch('');
  };

  /* ── group options ── */
  const groupOptions = joinedGroups.map(g => ({ id: g.id, label: g.name }));
  const filteredGroups = groupOptions.filter(o =>
    o.label.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const toggleGroup = async (id: string) => {
    let nextGroups = [...filters.activeGroups];
    const isAdding = !nextGroups.includes(id);
    nextGroups = isAdding ? [...nextGroups, id] : nextGroups.filter(x => x !== id);
    set('activeGroups', nextGroups);

    try {
      let currentMap = { ...groupMembersMap };
      if (!currentMap[id]) {
        const r = await fetch(`/api/groups/${id}/members`);
        const j = await r.json();
        currentMap[id] = (j.data || []).map((m: any) => m.id as string);
        setGroupMembersMap(currentMap);
      }

      const groupMemberIds = currentMap[id] || [];
      let nextMembers = [...filters.registrantUserIds];

      if (isAdding) {
        groupMemberIds.forEach((mId: string) => {
          if (!nextMembers.includes(mId)) nextMembers.push(mId);
        });
      } else {
        const keepIds = new Set<string>();
        nextGroups.forEach(gId => {
          (currentMap[gId] || []).forEach((mId: string) => keepIds.add(mId));
        });
        // 自分のIDは常に保持
        if (currentUser) keepIds.add(currentUser.id);
        nextMembers = nextMembers.filter(mId => {
          if (groupMemberIds.includes(mId)) return keepIds.has(mId);
          return true;
        });
      }

      set('registrantUserIds', nextMembers);
    } catch (e) {
      console.error(e);
    }
  };

  const groupLabel = () => {
    if (filters.activeGroups.length === 0) return '選択なし';
    if (filters.activeGroups.length === groupOptions.length && groupOptions.length > 0) {
      return `全${groupOptions.length}グループ選択中`;
    }
    if (filters.activeGroups.length === 1) {
      return groupOptions.find(g => g.id === filters.activeGroups[0])?.label ?? '1グループ';
    }
    return `${filters.activeGroups.length}グループ選択中`;
  };

  /* ── member options (自分含む全員) ── */
  let availableMembers = [...members];
  // 友達の並び順に基づいてソート
  availableMembers.sort((a, b) => {
    // 自分自身は常に一番上
    if (a.id === currentUser?.id) return -1;
    if (b.id === currentUser?.id) return 1;

    const idxA = swrFriends.findIndex((f: any) => f.id === a.id);
    const idxB = swrFriends.findIndex((f: any) => f.id === b.id);
    
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });
  
  const allMemberIds = availableMembers.map(m => m.id);
  const allMembersSelected =
    allMemberIds.length > 0 &&
    allMemberIds.every(id => filters.registrantUserIds.includes(id)) &&
    filters.registrantUserIds.length === allMemberIds.length;

  const filteredMembers = availableMembers.filter((m: Member) =>
    (m.name || '').toLowerCase().includes(memberSearch.toLowerCase())
  );
  const memberLabel = () => {
    if (filters.registrantUserIds.length === 0) return '選択なし';
    if (allMembersSelected) return `全${allMemberIds.length}名選択中`;
    if (filters.registrantUserIds.length === 1) {
      return availableMembers.find((m: Member) => m.id === filters.registrantUserIds[0])?.name ?? '1名選択中';
    }
    return `${filters.registrantUserIds.length}名選択中`;
  };

  const memberOptionsEnabled = availableMembers.length > 0;

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

        {/* Body: 2-row horizontal scroll layout */}
        <div className="flex-1 overflow-y-auto pb-28">

          {/* ── Row 1: Filter Mode + Group/User selectors (horizontal scroll) ── */}
          {!hideGroupAndRegistrant && (
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">絞り込み方法</label>
            {/* Toggle: Group left, User right */}
            <div className="flex p-1 bg-gray-100 rounded-xl gap-1 mb-4">
              <button
                onClick={() => set('filterMode', 'group')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-black transition-all ${
                  filters.filterMode === 'group' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'
                }`}
              >
                <Users size={14} />
                グループ
              </button>
              <button
                onClick={() => set('filterMode', 'registrant')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-black transition-all ${
                  filters.filterMode === 'registrant' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'
                }`}
              >
                <User size={14} />
                投稿者
              </button>
            </div>

            {/* Group combobox */}
            {filters.filterMode === 'group' && (
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
                    <div className="max-h-44 overflow-y-auto py-1">
                      {groupOptions.length > 0 && (
                        <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.activeGroups.length === groupOptions.length && groupOptions.length > 0}
                            onChange={() => {
                              if (filters.activeGroups.length === groupOptions.length) {
                                setFilters(p => ({ ...p, activeGroups: [], registrantUserIds: [] }));
                              } else {
                                const allGroupIds = groupOptions.map(g => g.id);
                                const allIds = members.map(m => m.id);
                                setFilters(p => ({ ...p, activeGroups: allGroupIds, registrantUserIds: allIds }));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                          />
                          <span className="text-[14px] text-gray-700">全選択</span>
                        </label>
                      )}
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
            )}

            {/* Member combobox */}
            {filters.filterMode === 'registrant' && (
              !memberOptionsEnabled ? (
                <p className="text-[13px] text-gray-400 italic">メンバーがいません</p>
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
                        <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={allMembersSelected}
                            onChange={() => {
                              if (allMembersSelected) {
                                set('registrantUserIds', []);
                              } else {
                                set('registrantUserIds', allMemberIds);
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                          />
                          <span className="text-[14px] text-gray-700">全選択</span>
                        </label>
                        {loadingMembers ? (
                          <div className="px-4 py-3 text-[13px] text-gray-400">読み込み中...</div>
                        ) : (
                          filteredMembers.map((m: Member) => {
                            const isSelected = filters.registrantUserIds.includes(m.id);
                            const isMe = m.id === currentUser?.id;
                            return (
                              <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    let next = [...filters.registrantUserIds];
                                    if (isSelected) next = next.filter((id: string) => id !== m.id);
                                    else next = [...next, m.id];
                                    set('registrantUserIds', next);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                                />
                                <span className="text-[14px] text-gray-700">{m.name}{isMe ? ' (自分)' : ''}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
            </div>
          )}

          {/* ── Other filters ── */}
          <div className="px-5 pt-4 pb-4 space-y-6">

              {/* ── Tag card ── */}
              {!hideTags && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">タグ</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => set('tagMatchMode', 'AND')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        filters.tagMatchMode !== 'OR' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      すべて含む
                    </button>
                    <button
                      type="button"
                      onClick={() => set('tagMatchMode', 'OR')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        filters.tagMatchMode === 'OR' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      いずれかを含む
                    </button>
                  </div>
                </div>
                <div className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white flex items-center justify-between min-h-[48px] relative">
                  <div className="flex flex-wrap gap-1 items-center flex-1 pr-10 py-0.5">
                    {filters.tags.length === 0 ? (
                      <span className="text-gray-300 text-[13px]">タグなし</span>
                    ) : (
                      filters.tags.map((tag: string) => (
                        <div key={tag} className="inline-flex items-center gap-1 bg-[#FAF1EE] text-[#A86E64] border border-[#F3E2DD] px-2 py-0.5 rounded-full text-[11px] font-medium">
                          <span>#{tag}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); set('tags', filters.tags.filter((t: string) => t !== tag)); }} className="hover:opacity-75 ml-0.5">
                            <X size={9} className="text-[#A86E64]" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <button type="button" onClick={() => setIsTagSelectorOpen(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-orange-500 hover:text-orange-600 shrink-0">
                    編集
                  </button>
                </div>
                <TagSelector isOpen={isTagSelectorOpen} onClose={() => setIsTagSelectorOpen(false)} selectedTags={filters.tags} onSelect={(tags: string[]) => set('tags', tags)} />
              </div>
              )}

              {/* ── Period card ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">期間</label>
                <div className="relative">
                  <select
                    value={filters.period}
                    onChange={e => set('period', e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-3 text-[13px] text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                  >
                    {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {filters.period === 'custom' && (
                  <div className="flex flex-col gap-1 mt-1">
                    <input type="date" value={filters.period_start || ''} onChange={e => set('period_start', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400 [color-scheme:light]" />
                    <input type="date" value={filters.period_end || ''} onChange={e => set('period_end', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400 [color-scheme:light]" />
                  </div>
                )}
              </div>

              {/* ── Status card ── */}
              {!hideStatus && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">状態</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'all', label: 'すべて' },
                      { id: 'visited', label: '行った' },
                      { id: 'want_to_go', label: '行きたい' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => set('status', s.id as any)}
                        className={`w-full py-2 rounded-xl text-[12px] font-bold transition-all border ${
                          filters.status === s.id
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sort card ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">並び替え</label>
                <div className="relative">
                  <select
                    value={filters.sort_order}
                    onChange={e => set('sort_order', e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-3 text-[13px] text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                  >
                    <option value="created_desc">新しい順 (投稿日時順)</option>
                    <option value="visited_desc">行った日順</option>
                    <option value="rating_desc">評価が高い順</option>
                    <option value="rating_asc">評価が低い順</option>
                    <option value="price_desc">値段帯が高い順</option>
                    <option value="price_asc">値段帯が安い順</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* ── Rating card ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">評価（以上）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.rating_min ?? ''}
                    onChange={e => set('rating_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="例: 4.0"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 text-[13px] text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                  />
                  <span className="text-[12px] font-bold text-gray-500 shrink-0">以上</span>
                </div>
              </div>

              {/* ── Price card ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">値段帯</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-400 w-6 shrink-0">下限</span>
                    <div className="relative flex-1">
                      <select
                        value={priceMinMode === 'custom' ? 'custom' : (filters.price_min ?? '')}
                        onChange={(e) => {
                          if (e.target.value === 'custom') { setPriceMinMode('custom'); }
                          else { setPriceMinMode('select'); set('price_min', e.target.value ? parseInt(e.target.value, 10) : undefined); }
                        }}
                        className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2 px-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400 transition-all"
                      >
                        <option value="">なし</option>
                        {PRICE_OPTIONS.map(val => <option key={val} value={val}>{val.toLocaleString()}円</option>)}
                        <option value="custom">自由入力</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {priceMinMode === 'custom' && (
                      <input type="number" value={filters.price_min ?? ''} onChange={e => set('price_min', e.target.value ? parseInt(e.target.value, 10) : undefined)} placeholder="下限" className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-400 w-6 shrink-0">上限</span>
                    <div className="relative flex-1">
                      <select
                        value={priceMaxMode === 'custom' ? 'custom' : (filters.price_max ?? '')}
                        onChange={(e) => {
                          if (e.target.value === 'custom') { setPriceMaxMode('custom'); }
                          else { setPriceMaxMode('select'); set('price_max', e.target.value ? parseInt(e.target.value, 10) : undefined); }
                        }}
                        className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2 px-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400 transition-all"
                      >
                        <option value="">なし</option>
                        {PRICE_OPTIONS.map(val => <option key={val} value={val}>{val.toLocaleString()}円</option>)}
                        <option value="custom">自由入力</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {priceMaxMode === 'custom' && (
                      <input type="number" value={filters.price_max ?? ''} onChange={e => set('price_max', e.target.value ? parseInt(e.target.value, 10) : undefined)} placeholder="上限" className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-orange-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* ── Favorite card ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">その他</label>
                <button
                  onClick={() => set('is_favorite', !filters.is_favorite)}
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl border text-[13px] font-bold transition-all ${
                    filters.is_favorite
                      ? 'bg-orange-50 border-orange-200 text-orange-600'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Heart size={14} className={filters.is_favorite ? 'fill-orange-500 text-orange-500' : ''} />
                  お気に入り
                </button>
              </div>

            </div>{/* end vertical flex */}
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={() => {
              const finalFilters = { ...filters };
              // 全グループ選択の場合は 'all' を設定（バックエンドで全グループ対象にするため）
              if (filters.activeGroups.length === groupOptions.length && groupOptions.length > 0) {
                finalFilters.activeGroups = ['all'];
              }
              // 全員選択の場合は空配列を設定（バックエンドで全員対象にするため）
              if (allMembersSelected) {
                finalFilters.registrantUserIds = [];
              }
              onApply(finalFilters);
              onClose();
            }}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[15px] active:scale-98 transition-all shadow-sm"
          >
            絞り込みを適用する
          </button>
        </div>
      </div>
    </div>
  );
}
