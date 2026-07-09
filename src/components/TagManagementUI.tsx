'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, GripVertical, Plus, ChevronLeft, Loader2 } from 'lucide-react';
import { getUserTags, deleteTag, updateTagOrder } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import Link from 'next/link';

export function TagManagementUI({ initialTags }: { initialTags?: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags || []);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(!initialTags);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialTags) {
      loadTags();
    }
  }, [initialTags]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const data = await getUserTags();
      setTags(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Drag & Drop handlers ──
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndexRef.current = index;
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    const newTags = [...tags];
    const [moved] = newTags.splice(dragIndexRef.current, 1);
    newTags.splice(index, 0, moved);
    dragIndexRef.current = index;
    setTags(newTags);
  };

  const handleDragEnd = async () => {
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
    // Save order
    try {
      await updateTagOrder(tags.map((t, i) => ({ id: t.id, sort_order: i })));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Touch Drag Support ──
  const touchStartY = useRef<number>(0);
  const touchDragIndex = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    touchDragIndex.current = index;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchDragIndex.current === null) return;
    const touch = e.touches[0];
    const elements = document.querySelectorAll('[data-tag-item]');
    elements.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom && i !== touchDragIndex.current) {
        const newTags = [...tags];
        const [moved] = newTags.splice(touchDragIndex.current!, 1);
        newTags.splice(i, 0, moved);
        touchDragIndex.current = i;
        setTags(newTags);
      }
    });
  };

  const handleTouchEnd = async () => {
    touchDragIndex.current = null;
    try {
      await updateTagOrder(tags.map((t, i) => ({ id: t.id, sort_order: i })));
    } catch (e) {
      console.error(e);
    }
  };

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

        {/* Tags List Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">
              登録済みタグ ({tags.length}件)
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gray-300 font-black">
              ドラッグで並び替え
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="text-pink-200 animate-spin" size={32} />
              </div>
            ) : tags.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm italic">タグがありません</div>
            ) : (
              tags.map((tag, index) => (
                <div
                  key={tag.id}
                  data-tag-item
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="flex items-center justify-between px-6 py-5 group hover:bg-gray-50/50 transition-colors cursor-grab active:cursor-grabbing active:bg-pink-50/30 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-300 font-bold text-lg">#</span>
                    <span className="text-gray-700 font-bold">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-2 text-pink-200 hover:text-pink-400 hover:bg-pink-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                    <div className="p-2 text-gray-300 touch-none">
                      <GripVertical size={20} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
