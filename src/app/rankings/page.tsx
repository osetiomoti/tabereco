'use client';

import { useState, useCallback, useRef } from 'react';
import { Trophy, SlidersHorizontal, Crown, GripVertical, ChevronLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import useSWR, { mutate } from 'swr';
import { FilterModal } from '@/components/FilterModal';
import { getImageUrl } from '@/lib/image';

// dnd-kit
import {
  DndContext,
  closestCenter,
  MouseSensor,
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

// ─── Types ──────────────────────────────────────────────────────────────────
type RankingPost = {
  id: string;
  title: string;
  store_name: string | null;
  image_url: string | null;
  image_urls: string[];
  rating: number | null;
  visited_at: string | null;
};

type UserRanking = {
  id: string;
  name: string;
  avatar_url: string | null;
  isMe: boolean;
  postCount: number;
  isKing: boolean;
  posts: RankingPost[];
};

type TagInfo = {
  name: string;
  post_count: number;
  user_count: number;
};

// ─── Medal helper ───────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'];

function getRankDisplay(index: number) {
  if (index < 3) return { emoji: MEDALS[index], text: null };
  return { emoji: null, text: `${index + 1}` };
}

// ─── Sortable Row (自分のランキング用) ───────────────────────────────────────
function SortableRow({ post, index, onNavigate }: {
  post: RankingPost;
  index: number;
  onNavigate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const rank = getRankDisplay(index);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl p-3 transition-all select-none ${
        isDragging
          ? 'bg-pink-50 border-2 border-pink-200 shadow-xl scale-[1.02]'
          : index === 0
          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm'
          : 'bg-white border border-gray-100 shadow-sm'
      }`}
    >
      {/* 順位バッジ */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {rank.emoji ? (
          <span className={`leading-none ${index === 0 ? 'text-2xl' : 'text-xl'}`}>{rank.emoji}</span>
        ) : (
          <span className="text-[13px] font-black text-gray-300">{rank.text}</span>
        )}
      </div>

      {/* サムネイル */}
      <button
        type="button"
        onClick={() => onNavigate(post.id)}
        className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100 active:scale-95 transition-transform"
      >
        {(post.image_urls?.[0] || post.image_url) ? (
          <Image
            src={getImageUrl(post.image_urls?.[0] || post.image_url!)}
            alt={post.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
        )}
      </button>

      {/* テキスト */}
      <button
        type="button"
        onClick={() => onNavigate(post.id)}
        className="flex-1 min-w-0 text-left"
      >
        <p className={`font-black text-sm text-gray-900 truncate ${index === 0 ? 'text-amber-800' : ''}`}>
          {post.title || post.store_name || '無題'}
        </p>
        {post.store_name && post.title && (
          <p className="text-xs text-gray-400 font-bold truncate">{post.store_name}</p>
        )}
        {post.rating != null && (
          <span className="text-[11px] font-black text-[var(--color-primary)]">
            {'★'.repeat(Math.min(5, Math.floor(post.rating)))}
            <span className="text-gray-300">{'★'.repeat(5 - Math.min(5, Math.floor(post.rating)))}</span>
          </span>
        )}
      </button>

      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-3 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors touch-none"
        style={{ touchAction: 'none' }}
      >
        <GripVertical size={18} />
      </div>
    </div>
  );
}

// ─── Read-only Row (他ユーザー用) ─────────────────────────────────────────────
function ReadOnlyRow({ post, index, onNavigate }: {
  post: RankingPost;
  index: number;
  onNavigate: (id: string) => void;
}) {
  const rank = getRankDisplay(index);

  return (
    <button
      type="button"
      onClick={() => onNavigate(post.id)}
      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
        index === 0
          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
          : 'bg-white border border-gray-100'
      }`}
    >
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {rank.emoji ? (
          <span className={index === 0 ? 'text-2xl' : 'text-xl'}>{rank.emoji}</span>
        ) : (
          <span className="text-[13px] font-black text-gray-300">{rank.text}</span>
        )}
      </div>

      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100">
        {(post.image_urls?.[0] || post.image_url) ? (
          <Image
            src={getImageUrl(post.image_urls?.[0] || post.image_url!)}
            alt={post.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-black text-sm text-gray-900 truncate ${index === 0 ? 'text-amber-800' : ''}`}>
          {post.title || post.store_name || '無題'}
        </p>
        {post.store_name && post.title && (
          <p className="text-xs text-gray-400 font-bold truncate">{post.store_name}</p>
        )}
        {post.rating != null && (
          <span className="text-[11px] font-black text-[var(--color-primary)]">
            {'★'.repeat(Math.min(5, Math.floor(post.rating)))}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── User Panel ────────────────────────────────────────────────────────────
function UserPanel({
  userRanking,
  tag,
  onNavigate,
  onReorder,
}: {
  userRanking: UserRanking;
  tag: string;
  onNavigate: (id: string) => void;
  onReorder: (userId: string, posts: RankingPost[]) => void;
}) {
  const [localPosts, setLocalPosts] = useState<RankingPost[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const posts = localPosts ?? userRanking.posts;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = localPosts ?? userRanking.posts;
    const oldIdx = current.findIndex(p => p.id === active.id);
    const newIdx = current.findIndex(p => p.id === over.id);
    const reordered = arrayMove(current, oldIdx, newIdx);
    setLocalPosts(reordered);
    setSaveError(false);

    // 即時保存
    setSaving(true);
    try {
      const res = await fetch('/api/rankings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, orderedPostIds: reordered.map(p => p.id) }),
      });
      if (!res.ok) throw new Error('save failed');
      onReorder(userRanking.id, reordered);
      mutate((key: any) => typeof key === 'string' && key.startsWith('/api/rankings'));
    } catch {
      setSaveError(true);
      setLocalPosts(current); // 元に戻す
    } finally {
      setSaving(false);
    }
  }, [localPosts, userRanking.posts, userRanking.id, tag, onReorder]);

  return (
    <div className="flex-shrink-0 w-[calc(100vw-48px)] max-w-[340px] bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
      {/* パネルヘッダー */}
      <div className={`px-4 py-3 border-b ${userRanking.isMe ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-light)]' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 relative flex-shrink-0">
            {userRanking.avatar_url ? (
              <Image src={getImageUrl(userRanking.avatar_url)} alt={userRanking.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {userRanking.isKing && (
                <Crown size={13} className="text-amber-500 flex-shrink-0" fill="currentColor" />
              )}
              <span className="font-black text-[14px] text-gray-900 truncate">{userRanking.name}</span>
              {userRanking.isMe && (
                <span className="text-[10px] font-black text-[var(--color-primary)] bg-[var(--color-primary-50)] border border-[var(--color-primary-light)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                  自分
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400 font-bold">{userRanking.postCount}件の記録</span>
              {saving && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Loader2 size={10} className="animate-spin" /> 保存中...
                </span>
              )}
              {saveError && (
                <span className="text-[10px] text-red-500 font-bold">保存失敗</span>
              )}
            </div>
          </div>
        </div>
        {userRanking.isMe && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[var(--color-primary)] font-bold flex items-center gap-1">
              {isEditing ? (
                <>
                  <GripVertical size={10} />
                  ドラッグで並び替え可能
                </>
              ) : (
                '※ 並び替えは編集モードで可能'
              )}
            </p>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                isEditing
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-white text-[var(--color-primary)] border border-[var(--color-primary-light)]'
              }`}
            >
              {isEditing ? '完了' : '並び替え'}
            </button>
          </div>
        )}
      </div>

      {/* ランキングリスト */}
      <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
        {posts.length === 0 ? (
          <div className="py-8 text-center text-gray-300 text-sm font-bold">記録なし</div>
        ) : userRanking.isMe && isEditing ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={posts.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {posts.map((post, i) => (
                <SortableRow
                  key={post.id}
                  post={post}
                  index={i}
                  onNavigate={onNavigate}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          posts.map((post, i) => (
            <ReadOnlyRow
              key={post.id}
              post={post}
              index={i}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tag Selector ──────────────────────────────────────────────────────────
function TagSelectorView({
  tags,
  isLoading,
  tagScope,
  onScopeChange,
  onSelect,
}: {
  tags: TagInfo[];
  isLoading: boolean;
  tagScope: 'all' | 'mine';
  onScopeChange: (scope: 'all' | 'mine') => void;
  onSelect: (tag: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="px-4 py-4 space-y-4">
      {/* スコープ切り替えトグル（ともだち全員 / 自分のタグのみ） */}
      <div className="flex bg-gray-200/70 p-1 rounded-2xl border border-black/5 shadow-inner">
        <button
          type="button"
          onClick={() => onScopeChange('all')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tagScope === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>👥</span>
          <span>ともだち全員</span>
        </button>
        <button
          type="button"
          onClick={() => onScopeChange('mine')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tagScope === 'mine'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>👤</span>
          <span>自分のタグのみ</span>
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-gray-400 font-bold">
          {tagScope === 'mine' ? 'あなたの投稿についたタグ一覧' : 'ともだち全員の投稿数が多い順'}
        </p>
        {!isLoading && (
          <span className="text-[11px] font-bold text-gray-400">
            {tags.length}件
          </span>
        )}
      </div>

      {/* 検索入力欄 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="タグを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-100 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary-light)] sm:text-sm transition-all shadow-sm"
        />
      </div>

      {/* ローディング表示 */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="py-16 text-center">
          <Trophy size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">
            {tagScope === 'mine' ? '登録されている自分のタグがありません' : 'タグがありません'}
          </p>
          <p className="text-gray-300 text-sm mt-1">投稿にタグをつけてランキングを楽しもう！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTags.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8 font-bold">一致するタグがありません</p>
          ) : (
            filteredTags.map((tag, i) => (
              <button
                key={tag.name}
                onClick={() => onSelect(tag.name)}
                className="w-full flex items-center justify-between px-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary-50)] active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-black text-gray-300 w-6 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="text-left">
                    <p className="font-black text-gray-900 text-[15px]">#{tag.name}</p>
                    <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                      {tagScope === 'mine' ? `タグ使用 ${tag.post_count}回` : `${tag.user_count}人 · タグ使用 ${tag.post_count}回`}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function RankingsPage() {
  const router = useRouter();

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagScope, setTagScope] = useState<'all' | 'mine'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rankingFilters, setRankingFilters] = useState<any>({
    status: 'all',
    period: 'none',
    sort_order: 'created_desc',
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

  // タグ一覧を取得
  const { data: tagsData, isLoading: tagsLoading } = useSWR(
    `/api/rankings/tags?scope=${tagScope}${rankingFilters.registrant_id ? `&registrantId=${rankingFilters.registrant_id}` : ''}`,
    (url: string) => fetch(url).then(r => r.json()).then(j => (j.data ?? []) as TagInfo[]),
    { dedupingInterval: 60_000, revalidateOnFocus: false }
  );
  const tags = tagsData ?? [];

  // 選択タグのランキングデータを取得
  const { data: rankingData, isLoading: rankingLoading } = useSWR(
    selectedTag ? `/api/rankings?tag=${encodeURIComponent(selectedTag)}&mode=all` : null,
    (url: string) => fetch(url).then(r => r.json()).then(j => j.data as { users: UserRanking[] } | null),
    { dedupingInterval: 30_000, revalidateOnFocus: false }
  );

  const allUsers = rankingData?.users ?? [];

  // フィルターを適用してユーザーごとの投稿を絞り込む
  const filteredUsers = allUsers
    .filter(user => {
      // 投稿者フィルター
      if (rankingFilters.registrant_id && rankingFilters.registrant_id !== 'all') {
        if (user.id !== rankingFilters.registrant_id) return false;
      }
      return true;
    })
    .map(user => {
      let filtered = [...user.posts];

      // 状態フィルター（visited / want_to_go はランキング対象外なのでスキップ）
      // 評価フィルター
    if (rankingFilters.rating_min != null) {
      filtered = filtered.filter(p => p.rating != null && p.rating >= rankingFilters.rating_min);
    }
    // 訪問日フィルター
    if (rankingFilters.period && rankingFilters.period !== 'none') {
      const now = new Date();
      const getStartDate = () => {
        switch (rankingFilters.period) {
          case 'this_month': return new Date(now.getFullYear(), now.getMonth(), 1);
          case 'last_3_months': return new Date(now.getFullYear(), now.getMonth() - 3, 1);
          case 'this_year': return new Date(now.getFullYear(), 0, 1);
          case 'last_year': return new Date(now.getFullYear() - 1, 0, 1);
          default: return null;
        }
      };
      const getEndDate = () => {
        if (rankingFilters.period === 'last_year') return new Date(now.getFullYear() - 1, 11, 31);
        return null;
      };
      const start = getStartDate();
      const end = getEndDate();
      if (start || end) {
        filtered = filtered.filter(p => {
          if (!p.visited_at) return false;
          const d = new Date(p.visited_at);
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });
      }
    }

    return { ...user, posts: filtered };
  }).filter(u => u.posts.length > 0);

  // 王判定を再計算（フィルター後）
  const maxCount = filteredUsers.length > 0 ? Math.max(...filteredUsers.map(u => u.postCount)) : 0;
  const kings = filteredUsers.filter(u => u.postCount === maxCount && maxCount > 0);

  const handleNavigate = useCallback((postId: string) => {
    router.push(`/posts/${postId}`);
  }, [router]);

  const handleReorder = useCallback((userId: string, posts: RankingPost[]) => {
    // SWRキャッシュを無効化して再取得
    mutate((key: any) => typeof key === 'string' && key.startsWith('/api/rankings'));
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const panelWidth = el.firstElementChild?.clientWidth ?? 300;
    const gap = 12;
    const index = Math.round(el.scrollLeft / (panelWidth + gap));
    setActiveUserIndex(index);
  }, []);

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setActiveUserIndex(0);
    setRankingFilters({ status: 'all', period: 'none', sort_order: 'created_desc' });
  };

  const handleBackToTags = () => {
    setSelectedTag(null);
    setActiveUserIndex(0);
  };

  const activeFilterCount = [
    rankingFilters.rating_min != null,
    rankingFilters.period && rankingFilters.period !== 'none',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-[100px]">
      {selectedTag ? (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 h-14">
          <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between relative">
            <button
              onClick={handleBackToTags}
              className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-900" />
            </button>
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none px-24">
              <h1 className="font-bold text-gray-900 text-[16px] truncate">#{selectedTag}</h1>
            </div>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
            >
              <SlidersHorizontal size={18} className="text-gray-600" />
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </header>
      ) : (
        <Header title="ランキング">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <SlidersHorizontal size={18} className="text-gray-600" />
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </Header>
      )}

      {!selectedTag ? (
        /* ── タグ選択画面 ── */
        <TagSelectorView
          tags={tags}
          isLoading={tagsLoading}
          tagScope={tagScope}
          onScopeChange={setTagScope}
          onSelect={handleTagSelect}
        />
      ) : (
        /* ── ランキング表示画面 ── */
        <>
          {rankingLoading ? (
            <div className="px-4 py-8 flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-gray-300" />
              <p className="text-gray-400 text-sm font-bold">読み込み中...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Trophy size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">#{selectedTag} のランキングデータがありません</p>
            </div>
          ) : (
            <>
              {/* ○○王バナー */}
              {kings.length > 0 && (
                <div className="mx-4 mt-4 mb-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Crown size={18} className="text-amber-500 flex-shrink-0" fill="currentColor" />
                    <span className="text-[13px] font-black text-amber-700">
                      #{selectedTag}王
                    </span>
                    <span className="text-[13px] font-bold text-amber-600">
                      {kings.map(k => k.name).join(' · ')}
                      <span className="text-amber-500 ml-1">（{kings[0].postCount}件）</span>
                    </span>
                  </div>
                </div>
              )}

              {/* ユーザー横スクロール */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto px-4 pb-4 pt-2"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
              >
                {filteredUsers.map(userRanking => (
                  <div key={userRanking.id} style={{ scrollSnapAlign: 'start' }}>
                    <UserPanel
                      userRanking={userRanking}
                      tag={selectedTag}
                      onNavigate={handleNavigate}
                      onReorder={handleReorder}
                    />
                  </div>
                ))}
              </div>

              {/* スクロールインジケーター */}
              {filteredUsers.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-4">
                  {filteredUsers.map((u, i) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        const el = scrollRef.current;
                        if (!el) return;
                        const panelWidth = el.firstElementChild?.clientWidth ?? 300;
                        el.scrollTo({ left: i * (panelWidth + 12), behavior: 'smooth' });
                        setActiveUserIndex(i);
                      }}
                      className={`rounded-full transition-all ${
                        i === activeUserIndex
                          ? 'w-6 h-2'
                          : 'w-2 h-2 bg-gray-200'
                      }`}
                      style={i === activeUserIndex ? { background: 'var(--color-primary)' } : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* フィルターモーダル（タグ欄なし） */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(f) => setRankingFilters(f)}
        initialFilters={rankingFilters}
        hideStatus={true}
        hideTags={true}
      />
    </div>
  );
}
