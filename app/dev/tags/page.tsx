'use client';

import { useState } from 'react';
import { TagSelector } from '@/components/TagSelector';
import { Tag as TagIcon, Plus, X } from 'lucide-react';

export default function DevTagsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(['グルメ', 'ラーメン']);

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 pt-12 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100/50">
        <h1 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
            <TagIcon size={24} />
          </div>
          UI 開発用ページ
        </h1>

        <div className="space-y-6">
          <section>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">
              現在の選択タグ
            </label>
            <div className="flex flex-wrap gap-2.5 p-5 bg-gray-50 rounded-3xl border border-dashed border-gray-200 min-h-[100px] content-start">
              {tags.length > 0 ? (
                tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-sm font-bold shadow-sm border border-gray-100 animate-in zoom-in">
                    #{t}
                    <X size={14} className="text-gray-300 cursor-pointer hover:text-red-500" onClick={() => setTags(prev => prev.filter(x => x !== t))} />
                  </span>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic ml-1">タグが選択されていません</p>
              )}
            </div>
          </section>

          <button
            onClick={() => setIsOpen(true)}
            className="w-full py-4.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={24} strokeWidth={3} />
            タグセレクターを開く
          </button>
        </div>

        <div className="mt-12 p-5 bg-blue-50/50 border border-blue-100 rounded-3xl">
          <h3 className="text-sm font-bold text-blue-900 mb-2">💡 テスト項目</h3>
          <ul className="text-xs text-blue-700/80 space-y-2 list-disc ml-4 font-medium">
            <li>画像通りのボトムシートデザインになっているか</li>
            <li>チップを選択して「決定」で反映されるか</li>
            <li>「タグ検索」で候補が絞り込まれるか</li>
            <li>存在しないタグを打つと「新規作成」が現れるか</li>
          </ul>
        </div>
      </div>

      <TagSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        selectedTags={tags}
        onSelect={setTags}
      />
    </div>
  );
}
