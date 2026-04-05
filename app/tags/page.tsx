'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { getUserTags, deleteTag, updateTagName } from '@/lib/api/posts';
import type { Tag } from '@/lib/types';
import { Tag as TagIcon, X, Check, Edit2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`タグ「#${name}` + '」を削除しますか？\n(投稿からは外れますが、投稿自体は消えません)')) return;
    try {
      await deleteTag(id);
      setTags(tags.filter(t => t.id !== id));
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
    const trimmed = editName.trim();
    if (!trimmed) return setEditingId(null);
    if (tags.some(t => t.name === trimmed && t.id !== id)) {
      alert('同じ名前のタグが既に存在します');
      return;
    }

    try {
      await updateTagName(id, trimmed);
      setTags(tags.map(t => t.id === id ? { ...t, name: trimmed } : t));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('更新に失敗しました');
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100">
              <TagIcon size={24} strokeWidth={3} />
            </div>
            タグ管理
          </h1>
          <p className="text-gray-400 font-bold mt-2 text-sm leading-relaxed">
            登録済みのタグを編集・削除できます。追加は新規投稿画面から行ってください。
          </p>
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-center justify-center text-red-500 gap-2 mb-6">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {loading ? (
             <div className="text-center py-10 opacity-50"><div className="w-8 h-8 mx-auto border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : tags.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
              <TagIcon size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">まだタグがありません</p>
              <p className="text-gray-400 text-[10px] mt-1">投稿画面からタグを追加してみてください</p>
            </div>
          ) : (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex-1 flex items-center gap-3">
                  <div className="text-orange-500/50">#</div>
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleSaveEdit(tag.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(tag.id)}
                      autoFocus
                      className="flex-1 bg-gray-50 border border-orange-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full"
                    />
                  ) : (
                    <span className="text-gray-900 font-bold text-base cursor-pointer" onClick={() => handleStartEdit(tag)}>
                      {tag.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {editingId === tag.id ? (
                    <button onClick={() => handleSaveEdit(tag.id)} className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center shadow-sm">
                      <Check size={16} strokeWidth={3} />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => handleStartEdit(tag)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:text-orange-500 flex items-center justify-center transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(tag.id, tag.name)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
