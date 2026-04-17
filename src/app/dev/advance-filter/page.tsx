'use client';

import { useState } from 'react';
import { FilterModal } from '@/components/FilterModal';
import { Search, SlidersHorizontal, Hash, Calendar, Heart } from 'lucide-react';
import type { Tag } from '@/lib/types';

// 画像2に基づいたモックタグデータ
const MOCK_TAGS: Tag[] = [
  { id: '1', user_id: 'dev', name: '海', sort_order: 0, created_at: '' },
  { id: '2', user_id: 'dev', name: '旅行', sort_order: 1, created_at: '' },
  { id: '3', user_id: 'dev', name: '食べ物', sort_order: 2, created_at: '' },
  { id: '4', user_id: 'dev', name: '自然', sort_order: 3, created_at: '' },
  { id: '5', user_id: 'dev', name: 'アート', sort_order: 4, created_at: '' },
  { id: '6', user_id: 'dev', name: '季節', sort_order: 5, created_at: '' },
];

export default function DevAdvanceFilterPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>(null);

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center pt-8">
          <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
            UI Sandbox
          </span>
          <h1 className="text-2xl font-black text-gray-900 mt-4 leading-tight">Advanced Filtering</h1>
          <p className="text-gray-400 text-sm font-bold mt-2">タグ候補選択・追加機能の検証用</p>
        </header>

        {/* Fake Search Bar to trigger modal */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              readOnly
              placeholder="絞り込み条件を探す..."
              className="w-full bg-white border border-gray-100 py-4.5 pl-14 pr-6 rounded-[2rem] shadow-sm text-gray-900 placeholder:text-gray-300 cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            />
            <button 
              onClick={() => setIsModalOpen(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Results Area */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">適用中のフィルタ</h3>
            
            {!appliedFilters ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                  <SlidersHorizontal size={32} />
                </div>
                <p className="text-gray-300 text-sm font-bold">まだフィルタが適用されていません</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <FilterInfo icon={<Hash size={14} />} label="タグ" value={appliedFilters.tag || '(未指定)'} color="pink" />
                  <FilterInfo icon={<Calendar size={14} />} label="期間" value={appliedFilters.period} color="orange" />
                  <FilterInfo icon={<Heart size={14} />} label="お気に入り" value={appliedFilters.is_favorite ? 'ON' : 'OFF'} color="red" />
                  <FilterInfo icon={<SlidersHorizontal size={14} />} label="状態" value={appliedFilters.status} color="blue" />
                </div>
                
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <pre className="text-[10px] text-gray-400 font-mono overflow-auto leading-relaxed">
                    {JSON.stringify(appliedFilters, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-pink-50/50 rounded-[2rem] border border-pink-100">
          <p className="text-xs text-pink-700 font-bold leading-relaxed">
            💡 タグセクションでチップを選択したり、「タグを選択して追加」から検索できるかご確認ください。
          </p>
        </div>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={(filters) => setAppliedFilters(filters)}
        initialFilters={appliedFilters}
        initialTags={MOCK_TAGS}
      />
    </div>
  );
}

function FilterInfo({ icon, label, value, color }: any) {
  const colors: any = {
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <div className={`p-3 rounded-2xl border ${colors[color]} flex flex-col gap-1`}>
      <span className="text-[9px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-xs font-black truncate">{value}</span>
    </div>
  );
}
