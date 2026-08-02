'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { getUserTags, deleteTag, updateTagOrder } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import Link from 'next/link';

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

// ─── Sortable Tag Row ──────────────────────────────────────────────────────
function SortableTagRow({ tag, onDelete }: { tag: Tag; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
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
      className={`flex items-center justify-between px-4 py-4 bg-white rounded-2xl border border-gray-100 transition-all select-none relative ${
        isDragging ? 'shadow-lg border-pink-200' : 'shadow-sm hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-300 font-bold text-lg">#</span>
        <span className="text-gray-700 font-bold">{tag.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onDelete(tag.id)}
          className="p-2 text-pink-200 hover:text-pink-400 hover:bg-pink-50 rounded-xl transition-all z-10"
        >
          <Trash2 size={18} />
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
    </div>
  );
}

const LS_KEY = 'tags_order';

export function TagManagementUI({ initialTags }: { initialTags?: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags || []);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(!initialTags);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const applyStoredOrder = useCallback((raw: Tag[]): Tag[] => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return raw;
      const order = JSON.parse(saved) as string[];
      return [...raw].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
    } catch {
      return raw;
    }
  }, []);

  useEffect(() => {
    if (!initialTags) loadTags();
    else setTags(applyStoredOrder(initialTags));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTags]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const data = await getUserTags();
      setTags(applyStoredOrder(data));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save order to API in the background (fire-and-forget)
  const saveOrder = useCallback((ordered: Tag[]) => {
    updateTagOrder(ordered.map((t, i) => ({ id: t.id, sort_order: i }))).catch(console.error);
  }, []);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setIsActionLoading(true);
    try {
      const { createTag } = await import('@/lib/api/posts');
      await createTag(newTagName.trim());
      setNewTagName('');
      await loadTags();
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('このタグを削除してもよろしいですか？')) return;
    setIsActionLoading(true);
    try {
      await deleteTag(id);
      setTags(prev => {
        const next = prev.filter(t => t.id !== id);
        localStorage.setItem(LS_KEY, JSON.stringify(next.map(t => t.id)));
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // dnd-kit sensors — same config as friends/groups page
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setTags(prev => {
        const oldIdx = prev.findIndex(t => t.id === active.id);
        const newIdx = prev.findIndex(t => t.id === over.id);
        const newOrder = arrayMove(prev, oldIdx, newIdx);
        // Persist order to localStorage immediately (no freeze)
        localStorage.setItem(LS_KEY, JSON.stringify(newOrder.map(t => t.id)));
        // Save to API in background
        saveOrder(newOrder);
        return newOrder;
      });
    },
    [saveOrder]
  );

  return (
    <div className="w-full max-w-xl mx-auto min-h-screen bg-[#fcfcfc] flex flex-col">
      {/* Header */}
      <div className="px-6 py-8 flex items-center gap-4">
        <Link href="/dev" className="text-pink-400 flex items-center gap-0.5 text-sm font-bold">
          <ChevronLeft size={18} />
          設定に戻る
        </Link>
        <h1 className="text-xl font-black text-gray-900">タグ管理</h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Add New Tag Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-400 mb-4 ml-1">新しいタグを追加</label>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 font-bold">#</span>
              <input
                type="text"
                placeholder="タグ名を入力"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="w-full bg-[#fdfdfd] border border-gray-100 rounded-2xl py-4 pl-10 pr-4 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all"
              />
            </div>
            <button
              onClick={handleAddTag}
              disabled={isActionLoading || !newTagName.trim()}
              className="px-8 py-4 bg-pink-200 hover:bg-pink-300 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-pink-100"
            >
              追加
            </button>
          </div>
        </div>

        {/* Tags List */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">
              登録済みタグ ({tags.length}件)
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gray-300 font-black">
              ドラッグで並び替え
            </span>
          </div>

          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="text-pink-200 animate-spin" size={32} />
              </div>
            ) : tags.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm italic">タグがありません</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {tags.map((tag) => (
                    <SortableTagRow key={tag.id} tag={tag} onDelete={handleDeleteTag} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
