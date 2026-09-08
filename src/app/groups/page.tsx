'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { getJoinedGroups, createGroup, joinGroup } from '@/lib/api/groups';
import { getFriends, addFriend, removeFriend, searchUsers } from '@/lib/api/friends';
import {
  Plus, Users, Copy, CheckCircle, ChevronRight, Hash,
  Search, UserPlus, X, Trash2, User, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/image';

// dnd-kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Friend = { id: string; name: string; avatar_url?: string | null; friendship_id: string };
type Group = { id: string; name: string; description?: string | null; image_url?: string | null; invite_code: string };

// ─── Sortable Friend Row ──────────────────────────────────────────────────
function SortableFriendRow({ f, handleRemoveFriend }: { f: Friend, handleRemoveFriend: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.friendship_id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 transition-all select-none relative ${
        isDragging ? 'shadow-lg border-orange-300' : 'shadow-sm hover:border-gray-200'
      }`}
    >
      <Link href={`/mypage?userId=${f.id}`} className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-85 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden relative flex-shrink-0 border-2 border-white shadow">
          {f.avatar_url ? <Image src={getImageUrl(f.avatar_url)} alt={f.name} fill className="object-cover" /> : <User size={20} className="text-orange-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 truncate">{f.name}</p>
        </div>
      </Link>
      <button
        onClick={() => handleRemoveFriend(f.friendship_id)}
        className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all z-10"
      >
        <Trash2 size={16} />
      </button>
      <div
        {...attributes}
        {...listeners}
        className="p-2 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing touch-none z-10"
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
          <circle cx="5" cy="4" r="2" /><circle cx="11" cy="4" r="2" />
          <circle cx="5" cy="10" r="2" /><circle cx="11" cy="10" r="2" />
          <circle cx="5" cy="16" r="2" /><circle cx="11" cy="16" r="2" />
        </svg>
      </div>
    </div>
  );
}

// ─── Sortable Group Row ──────────────────────────────────────────────────
function SortableGroupRow({ group, copyCode, copiedCode }: { group: Group, copyCode: (code: string) => void, copiedCode: string | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/card transition-all select-none ${isDragging ? 'shadow-lg border-orange-300' : ''}`}
    >
      <Link href={`/groups/${group.id}`} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 pr-[88px]">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 shadow-inner shrink-0 overflow-hidden relative">
          {group.image_url ? (
            <Image src={getImageUrl(group.image_url)} alt={group.name} fill className="object-cover" />
          ) : (
            <Hash size={22} strokeWidth={3} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-gray-900 leading-tight group-hover/card:text-orange-500 transition-colors truncate">{group.name}</h3>
          <p className="text-xs text-gray-400 font-bold mt-0.5 truncate">{group.description || '美味しいスポットをシェア！'}</p>
        </div>
        <ChevronRight className="ml-2 text-gray-200 group-hover/card:text-orange-400 transition-colors shrink-0" />
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyCode(group.invite_code); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-gray-50 hover:bg-orange-50 text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-gray-100 transition-all active:scale-95 z-10"
      >
        {copiedCode === group.invite_code ? (
          <><CheckCircle size={12} className="text-green-500" /><span className="text-green-600">コピー済み</span></>
        ) : (
          <><Copy size={12} className="text-gray-400" /><span className="text-gray-400">{group.invite_code}</span></>
        )}
      </button>
      <div
        {...attributes}
        {...listeners}
        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing touch-none z-10 mr-12"
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
          <circle cx="5" cy="4" r="2" /><circle cx="11" cy="4" r="2" />
          <circle cx="5" cy="10" r="2" /><circle cx="11" cy="10" r="2" />
          <circle cx="5" cy="16" r="2" /><circle cx="11" cy="16" r="2" />
        </svg>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'groups'>('friends');

  // URLパラメータからタブを初期化
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'groups') setTab('groups');
  }, []);

  const [myId, setMyId] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ともだち追加
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [copiedMyId, setCopiedMyId] = useState(false);

  // グループ
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 自分のプロフィール取得
  useEffect(() => {
    fetch('/api/profiles/me')
      .then(r => r.json())
      .then(j => { if (j.success) setMyId(j.data.id); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, g, pRes] = await Promise.all([
      getFriends(),
      getJoinedGroups(),
      fetch('/api/friends/pending').then(r => r.json())
    ]);
    
    // localStorageからソート順を復元
    let sortedF = f ?? [];
    let sortedG = g ?? [];
    try {
      const savedFOrder = localStorage.getItem('friends_order');
      if (savedFOrder) {
        const order = JSON.parse(savedFOrder) as string[];
        sortedF = [...sortedF].sort((a, b) => {
          const idxA = order.indexOf(a.friendship_id);
          const idxB = order.indexOf(b.friendship_id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }
      const savedGOrder = localStorage.getItem('groups_order');
      if (savedGOrder) {
        const order = JSON.parse(savedGOrder) as string[];
        sortedG = [...sortedG].sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }
    } catch (e) {
      console.error('Failed to parse order from localStorage', e);
    }
    
    setFriends(sortedF);
    setGroups(sortedG);
    setPendingRequests(pRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ユーザー検索（デバウンス）
  useEffect(() => {
    if (searchQuery.length < 3) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchUsers(searchQuery)); } catch {}
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (userId: string) => {
    setAddingId(userId);
    try {
      await addFriend(userId);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      load();
    } catch (e: any) { alert(e.message); }
    setAddingId(null);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('ともだちを削除しますか？')) return;
    await removeFriend(friendshipId);
    load();
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert('ともだちになりました！');
      load();
    } catch (e: any) {
      alert(e.message || '承認に失敗しました');
    }
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(myId);
    setCopiedMyId(true);
    setTimeout(() => setCopiedMyId(false), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    await createGroup(newGroupName.trim());
    setNewGroupName('');
    load();
    setIsCreating(false);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsJoining(true);
    const g = await joinGroup(inviteCode.trim());
    if (g) { setInviteCode(''); load(); }
    else alert('グループが見つからないか、既に参加しています');
    setIsJoining(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const friendIds = new Set(friends.map(f => f.id));

  // Mutable refs so useEffect callbacks always see latest state
  const friendsRef = useRef<Friend[]>([]);
  friendsRef.current = friends;
  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEndFriends = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFriends((prev) => {
      const oldIdx = prev.findIndex(f => f.friendship_id === active.id);
      const newIdx = prev.findIndex(f => f.friendship_id === over.id);
      const newOrder = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem('friends_order', JSON.stringify(newOrder.map(f => f.friendship_id)));
      return newOrder;
    });
  };

  const handleDragEndGroups = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGroups((prev) => {
      const oldIdx = prev.findIndex(g => g.id === active.id);
      const newIdx = prev.findIndex(g => g.id === over.id);
      const newOrder = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem('groups_order', JSON.stringify(newOrder.map(g => g.id)));
      return newOrder;
    });
  };

  return (
    <>
      <Header title="ともだち" />
      <main className="w-full max-w-2xl mx-auto px-4 pt-4 pb-32 animate-in fade-in duration-500 overflow-x-hidden">

        {/* Tab Toggle */}
        <div className="flex w-full bg-gray-100/80 rounded-full p-1 border border-black/5 shadow-inner mb-6">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2.5 text-[12px] font-black rounded-full transition-all duration-300 flex items-center justify-center gap-1 ${
              tab === 'friends' ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-gray-400'
            }`}
          >
            <User size={13} /><span>ともだち</span>
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-2.5 text-[12px] font-black rounded-full transition-all duration-300 flex items-center justify-center gap-1 ${
              tab === 'groups' ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-gray-400'
            }`}
          >
            <Users size={13} /><span>グループ</span>
          </button>
        </div>

        {/* ===== ともだちタブ ===== */}
        {tab === 'friends' && (
          <div className="space-y-6">
            {/* 自分のID */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-3xl p-4">
              <p className="text-[11px] font-black text-orange-400 tracking-widest mb-2">あなたのID</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 font-mono text-[11px] text-gray-600 font-bold truncate bg-white/70 px-3 py-2 rounded-xl border border-orange-100">
                  {myId || '読み込み中...'}
                </p>
                <button
                  onClick={copyMyId}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-xl text-[11px] font-black shadow-md shadow-orange-200 active:scale-95 transition-all whitespace-nowrap"
                >
                  {copiedMyId ? <><CheckCircle size={12} /><span>コピー済み</span></> : <><Copy size={12} /><span>コピー</span></>}
                </button>
              </div>
              <p className="text-[10px] text-orange-300 font-bold mt-2 break-words leading-relaxed">このIDを相手に教えてともだち追加してもらおう</p>
            </div>

            {/* 検索・追加 */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4">
                <UserPlus size={16} className="text-orange-500" />ともだちを追加
              </h2>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="IDまたは名前を入力（3文字以上）"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X size={16} />
                  </button>
                )}
              </div>

              {searching && (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                        {u.avatar_url ? <Image src={getImageUrl(u.avatar_url)} alt={u.name} fill className="object-cover" /> : <User size={18} className="text-orange-400" />}
                      </div>
                      <span className="flex-1 min-w-0 font-bold text-sm text-gray-800 truncate">{u.name}</span>
                      {(() => {
                        if (friendIds.has(u.id)) {
                          return <span className="text-[11px] font-bold text-green-500 flex items-center gap-1"><UserCheck size={14} />ともだち</span>;
                        }
                        const sentReq = pendingRequests.find(r => r.user.id === u.id && r.type === 'sent');
                        if (sentReq) {
                          return <span className="text-[11px] font-bold text-gray-400">リクエスト済み</span>;
                        }
                        return (
                          <button
                            onClick={() => handleAddFriend(u.id)}
                            disabled={addingId === u.id}
                            className="shrink-0 px-3 py-1.5 bg-orange-500 text-white text-[12px] font-black rounded-xl shadow-sm shadow-orange-200 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {addingId === u.id ? '追加中...' : '追加'}
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 3 && !searching && searchResults.length === 0 && (
                <p className="text-center text-sm text-gray-400 font-bold mt-4">ユーザーが見つかりませんでした</p>
              )}
            </div>

            {/* 届いているリクエスト */}
            {pendingRequests.filter(r => r.type === 'received').length > 0 && (
              <div className="bg-pink-50 border border-pink-100 rounded-3xl p-5 shadow-sm">
                <h2 className="text-[11px] font-black text-pink-400 tracking-widest mb-3">届いているリクエスト</h2>
                <div className="space-y-2">
                  {pendingRequests.filter(r => r.type === 'received').map(req => (
                    <div key={req.friendship_id} className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-pink-100">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                        {req.user.avatar_url ? <Image src={getImageUrl(req.user.avatar_url)} alt={req.user.name} fill className="object-cover" /> : <User size={18} className="text-pink-400" />}
                      </div>
                      <span className="flex-1 min-w-0 font-bold text-sm text-gray-800 truncate">{req.user.name}</span>
                      <button
                        onClick={() => handleAcceptRequest(req.friendship_id)}
                        className="shrink-0 px-4 py-2 bg-pink-500 text-white text-[12px] font-black rounded-xl shadow-sm shadow-pink-200 active:scale-95 transition-all"
                      >
                        承認する
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ともだち一覧 */}
            <div>
              <h2 className="text-[11px] font-black text-gray-400 tracking-widest ml-1 mb-3">ともだち（{friends.length}人）</h2>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Users size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-bold text-sm">まだともだちがいません</p>
                  <p className="text-gray-300 font-bold text-xs mt-1">IDで検索して追加しよう</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndFriends}>
                  <SortableContext items={friends.map(f => f.friendship_id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {friends.map((f) => (
                        <SortableFriendRow key={f.friendship_id} f={f} handleRemoveFriend={handleRemoveFriend} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {/* ===== グループタブ ===== */}
        {tab === 'groups' && (
          <div className="space-y-6">
            {/* グループ作成・参加 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-orange-100/50 to-red-50/50 rounded-bl-[90px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <h2 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4 relative z-10">
                  <Plus size={16} className="text-orange-500" strokeWidth={3} />新しいグループを作る
                </h2>
                <form onSubmit={handleCreateGroup} className="flex gap-2 relative z-10">
                  <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="グループ名" className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none min-w-0" />
                  <button type="submit" disabled={isCreating || !newGroupName.trim()} className="shrink-0 bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-black disabled:opacity-40 active:scale-95 transition-all">
                    {isCreating ? '...' : '作成'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-100/50 to-indigo-50/50 rounded-bl-[90px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <h2 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4 relative z-10">
                  <Users size={16} className="text-blue-500" strokeWidth={3} />招待コードで参加
                </h2>
                <form onSubmit={handleJoinGroup} className="flex gap-2 relative z-10">
                  <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="コード: ABCX9Z" className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none min-w-0" />
                  <button type="submit" disabled={isJoining || !inviteCode.trim()} className="shrink-0 bg-blue-500 text-white px-5 py-3 rounded-2xl text-sm font-black shadow-sm shadow-blue-500/20 disabled:opacity-40 active:scale-95 transition-all">
                    {isJoining ? '...' : '参加'}
                  </button>
                </form>
              </div>
            </div>

            {/* グループ一覧 */}
            <div>
              <h2 className="text-[11px] font-black text-gray-400 tracking-widest ml-1 mb-3">参加中のグループ</h2>
              {loading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-3xl animate-pulse" />)}</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Users size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-bold text-sm">まだグループがありません</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndGroups}>
                  <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {groups.map((group) => (
                        <SortableGroupRow key={group.id} group={group} copyCode={copyCode} copiedCode={copiedCode} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

      </main>
    </>
  );
}
