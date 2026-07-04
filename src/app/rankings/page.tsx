'use client';

import { useState, useMemo, useCallback } from 'react';
import { Trophy, Save, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { saveRankings } from '@/lib/api/friends';
import { useMyTags, useFriends, useMyProfile } from '@/hooks/useAppData';
import type { Tag } from '@/lib/types';
import { Header } from '@/components/Header';
import useSWR, { mutate } from 'swr';

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

// ─── Sortable Row ──────────────────────────────────────────────────────
function SortableRow({ post, index, isReadOnly, medals }: {
  post: any;
  index: number;
  isReadOnly: boolean;
  medals: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    disabled: isReadOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white border rounded-2xl p-3 transition-colors ${
        isDragging ? 'border-orange-300 shadow-lg' : 'border-gray-100 shadow-sm'
      } ${!isReadOnly ? 'hover:shadow-md' : ''}`}
    >
      {/* 順位バッジ */}
      <div className="w-8 text-center flex-shrink-0">
        {index < 3 ? (
          <span className="text-xl leading-none">{medals[index]}</span>
        ) : (
          <span className="text-sm font-black text-gray-300">{index + 1}</span>
        )}
      </div>

      {/* サムネイル */}
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100">
        {post.image_url ? (
          <Image src={post.image_url} alt={post.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-gray-900 truncate">{post.title}</p>
        <p className="text-xs text-gray-400 font-bold truncate">{post.store_name}</p>
        {post.rating && (
          <span className="text-[11px] font-black text-orange-400">{'★'.repeat(Math.floor(post.rating))}</span>
        )}
      </div>

      {/* ドラッグハンドル */}
      {!isReadOnly && (
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing p-1 touch-none"
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
            <circle cx="5" cy="4" r="2" /><circle cx="11" cy="4" r="2" />
            <circle cx="5" cy="10" r="2" /><circle cx="11" cy="10" r="2" />
            <circle cx="5" cy="16" r="2" /><circle cx="11" cy="16" r="2" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Rankings Fetcher ──────────────────────────────────────────────────
function useRankings(tag: string, userId?: string) {
  const key = tag ? `/api/rankings?tag=${encodeURIComponent(tag)}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}` : null;
  return useSWR<any[]>(key, (url: string) =>
    fetch(url).then(r => r.json()).then(j => j.data ?? []), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function RankingsPage() {
  const { tags: myTags } = useMyTags();
  const { friends } = useFriends();
  const { profile: myProfile } = useMyProfile();

  const [friendTags, setFriendTags] = useState<Tag[]>([]);
  const [rankingTag, setRankingTag] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [rankingSaved, setRankingSaved] = useState(false);
  const [localPosts, setLocalPosts] = useState<any[] | null>(null);

  const isReadOnly = selectedUserId !== null;

  // タグリスト（自分 or フレンド）
  const displayTags = useMemo(
    () => selectedUserId === null ? myTags : friendTags,
    [selectedUserId, myTags, friendTags]
  );

  // ランキングデータ（SWRキャッシュ）
  const { data: remoteRankingPosts, isLoading: rankingLoading } = useRankings(
    rankingTag,
    selectedUserId ?? undefined
  );

  // ローカル並び替えがあればそちらを優先
  const rankingPosts = localPosts ?? remoteRankingPosts ?? [];

  // タグ or ユーザー変更時にローカル並び替えをリセット
  const handleTagSelect = (tag: string) => {
    setRankingTag(tag);
    setShowTagDropdown(false);
    setLocalPosts(null);
    setRankingSaved(false);
  };

  const handleUserSelect = (userId: string | null) => {
    setSelectedUserId(userId);
    setRankingTag('');
    setLocalPosts(null);
    setRankingSaved(false);
    if (userId !== null) {
      setFriendTags([]);
      import('@/lib/api/posts').then(({ getUserTags }) => {
        getUserTags(userId).then(tags => setFriendTags(tags ?? [])).catch(() => {});
      });
    }
  };

  // dnd-kit sensors（マウス + タッチ両対応）
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalPosts(prev => {
      const list = prev ?? remoteRankingPosts ?? [];
      const oldIdx = list.findIndex(p => p.id === active.id);
      const newIdx = list.findIndex(p => p.id === over.id);
      return arrayMove(list, oldIdx, newIdx);
    });
    setRankingSaved(false);
  }, [remoteRankingPosts]);

  const handleSave = async () => {
    if (isReadOnly || !rankingTag) return;
    await saveRankings(rankingTag, rankingPosts.map(p => p.id));
    mutate(key => typeof key === 'string' && key.startsWith('/api/rankings'));
    setRankingSaved(true);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      <Header title="ランキング" />

      {/* User Selector */}
      <div className="flex gap-4 overflow-x-auto px-4 py-4 hide-scrollbar border-b border-gray-50 bg-gray-50/50">
        <button onClick={() => handleUserSelect(null)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className={`w-[52px] h-[52px] rounded-full overflow-hidden border-[3px] transition-all bg-white ${selectedUserId === null ? 'border-orange-500 scale-110 shadow-md p-[2px]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
              {myProfile?.avatar_url ? (
                <Image src={myProfile.avatar_url} alt="You" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-black truncate max-w-[60px] ${selectedUserId === null ? 'text-orange-500' : 'text-gray-400'}`}>マイランキング</span>
        </button>
        {friends.map(friend => (
          <button key={friend.id} onClick={() => handleUserSelect(friend.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`w-[52px] h-[52px] rounded-full overflow-hidden border-[3px] transition-all bg-white ${selectedUserId === friend.id ? 'border-orange-500 scale-110 shadow-md p-[2px]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
                {friend.avatar_url ? (
                  <Image src={friend.avatar_url} alt={friend.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-black truncate max-w-[60px] ${selectedUserId === friend.id ? 'text-orange-500' : 'text-gray-400'}`}>{friend.name}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-6">
        {/* タグ選択 */}
        <div className="mb-6 relative">
          <label className="text-[11px] font-black text-gray-400 tracking-widest ml-1 block mb-2">
            {isReadOnly ? 'ランキングを見るタグを選択' : 'ランキングするタグを選択'}
          </label>
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-left shadow-sm hover:border-orange-300 transition-colors"
          >
            <span className={rankingTag ? 'text-gray-900' : 'text-gray-400'}>
              {rankingTag ? `#${rankingTag}` : 'タグを選ぶ...'}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showTagDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto">
              {displayTags.length === 0 ? (
                <p className="text-center text-sm text-gray-400 font-bold p-4">タグがありません</p>
              ) : (
                displayTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTagSelect(t.name)}
                    className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-orange-50 transition-colors ${rankingTag === t.name ? 'text-orange-500 bg-orange-50' : 'text-gray-700'}`}
                  >
                    #{t.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ランキングリスト */}
        {!rankingTag ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-bold text-sm">タグを選ぶとランキングが表示されます</p>
            {!isReadOnly && <p className="text-gray-300 font-bold text-xs mt-1">ドラッグして順位を自分で設定できます</p>}
          </div>
        ) : rankingLoading && rankingPosts.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
            ))}
          </div>
        ) : rankingPosts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold text-sm">#{rankingTag} が付いた記録がありません</p>
          </div>
        ) : (
          <>
            {!isReadOnly && (
              <p className="text-[11px] text-gray-400 font-bold ml-1 mb-3">
                ドラッグして順位を変更 → 保存ボタンで確定
              </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rankingPosts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 mb-6">
                  {rankingPosts.map((post, i) => (
                    <SortableRow
                      key={post.id}
                      post={post}
                      index={i}
                      isReadOnly={isReadOnly}
                      medals={medals}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {!isReadOnly && (
              <button
                onClick={handleSave}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                  rankingSaved
                    ? 'bg-green-500 text-white shadow-green-200'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                }`}
              >
                {rankingSaved ? (
                  <><span>✓</span>保存しました！</>
                ) : (
                  <><Save size={18} />このランキングを保存</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
