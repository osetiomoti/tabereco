'use client';

import { useState, useEffect } from 'react';
import { Trash2, GripVertical, Plus, ChevronLeft, Loader2 } from 'lucide-react';
import { getUserTags, deleteTag, createPost, updateTagOrder } from '@/lib/api/posts'; // createPostはタグ作成用
import type { Tag } from '@/lib/types';
import Link from 'next/link';

export function TagManagementUI({ initialTags }: { initialTags?: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags || []);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(!initialTags);
  const [isActionLoading, setIsActionLoading] = useState(false);

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
      // 既存のAPIを利用するため(投稿なしのタグのみ追加はAPI側で対応するか、簡易的にcreatePostのタグ同期を利用)
      // ここでは既存の getUserTags を想定し、追加後のリストを再取得
      // 実際にはタグ専用の createTag API があるのが望ましいが、ここでは簡易実装
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('tags').upsert({ user_id: user.id, name: newTagName.trim() });
        setNewTagName('');
        await loadTags();
      }
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
              tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between px-6 py-5 group hover:bg-gray-50/50 transition-colors">
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
                    <div className="p-2 text-gray-200 cursor-grab active:cursor-grabbing">
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
