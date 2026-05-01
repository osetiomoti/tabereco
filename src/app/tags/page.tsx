'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { getUserTags, deleteTag, updateTagName, updateTagOrder, createTag } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import { Tag as TagIcon, Check, AlertCircle, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const data = await getUserTags();
      setTags(data);
    } catch (err) {
      console.error(err);
      setError('タグの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async () => {
    const trimmed = newTagName.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (tags.some(t => t.name === trimmed)) {
      alert('同じ名前のタグが既に存在します');
      return;
    }
    try {
      const res = await createTag(trimmed);
      setTags(prev => [...prev, res]);
      setNewTagName('');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('追加に失敗しました');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`タグ「#${name}」を削除しますか？\n(投稿からは外れますが、投稿自体は消えません)`)) return;
    try {
      await deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました');
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim().replace(/^#/, '');
    if (!trimmed) return setEditingId(null);
    if (tags.some(t => t.name === trimmed && t.id !== id)) {
      alert('同じ名前のタグが既に存在します');
      return;
    }
    try {
      await updateTagName(id, trimmed);
      setTags(prev => prev.map(t => t.id === id ? { ...t, name: trimmed } : t));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('更新に失敗しました');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tags.length) return;

    const newTags = [...tags];
    [newTags[index], newTags[newIndex]] = [newTags[newIndex], newTags[index]];
    setTags(newTags);

    setSavingOrder(true);
    try {
      await updateTagOrder(newTags.map((t, i) => ({ id: t.id, sort_order: i })));
    } catch (err) {
      console.error(err);
      loadTags();
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="bg-[#fcfcfc] min-h-[100dvh] pb-32">
      <Header />
      <main className="max-w-xl mx-auto px-5 py-8 animate-fade-in">
        <header className="flex items-center justify-between mb-8">
          <Link href="/settings" className="text-gray-400 font-bold text-sm tracking-tight flex items-center gap-1 hover:text-orange-500 transition-colors">
            <span className="text-xl leading-none -mt-0.5">‹</span> 戻る
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            タグ管理
          </h1>
          <div className="w-12" /> {/* Spacer */}
        </header>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-center gap-2 text-red-500 mb-6 font-bold text-sm">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* 新しいタグを追加 */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 mb-8">
          <p className="text-gray-400 text-[11px] font-black mb-4 ml-1 tracking-widest uppercase">新しいタグを作成</p>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-300 group-focus-within:text-orange-400 text-lg transition-colors">#</div>
            <input 
              type="text" 
              placeholder="タグ名を入力" 
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full bg-gray-50 border-none py-4 pl-12 pr-28 rounded-2xl text-[15px] font-bold text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
            <button 
              onClick={handleAdd}
              disabled={!newTagName.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white font-black text-sm px-6 py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-30 disabled:hover:bg-orange-500 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
            >
              追加
            </button>
          </div>
        </div>

        {/* 登録済みタグ一覧 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <span className="text-gray-400 text-[11px] font-black tracking-widest uppercase">登録済みタグ ({tags.length}件)</span>
             {savingOrder && <span className="text-orange-500 text-[10px] font-black animate-pulse">保存中...</span>}
          </div>
          
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="text-orange-500 animate-spin" />
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TagIcon size={24} className="text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold text-sm">タグがありません</p>
              </div>
            ) : (
              tags.map((tag, index) => (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-gray-300 font-black text-lg select-none">#</span>
                    {editingId === tag.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveEdit(tag.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(tag.id)}
                        autoFocus
                        className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-[15px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                      />
                    ) : (
                      <span
                        className="text-gray-700 font-bold text-[15px] cursor-pointer hover:text-orange-500 transition-colors tracking-tight"
                        onClick={() => handleStartEdit(tag)}
                      >
                        {tag.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    {editingId === tag.id ? (
                      <button
                        onClick={() => handleSaveEdit(tag.id)}
                        className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors"
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0 || savingOrder}
                            className="p-1 text-gray-200 hover:text-orange-400 disabled:opacity-0 transition-all hover:scale-125"
                          >
                            <ChevronUp size={20} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === tags.length - 1 || savingOrder}
                            className="p-1 text-gray-200 hover:text-orange-400 disabled:opacity-0 transition-all hover:scale-125"
                          >
                            <ChevronDown size={20} strokeWidth={3} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDelete(tag.id, tag.name)}
                          className="w-10 h-10 rounded-xl text-red-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                        >
                          <Trash2 size={20} strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
