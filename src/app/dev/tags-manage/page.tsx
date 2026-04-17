'use client';

import { TagManagementUI } from '@/components/TagManagementUI';
import type { Tag } from '@/lib/types';

// 画像1に基づいたモックデータ
const MOCK_TAGS: Tag[] = [
  { id: '1', user_id: 'dev', name: '海', sort_order: 0, created_at: '' },
  { id: '2', user_id: 'dev', name: '旅行', sort_order: 1, created_at: '' },
  { id: '3', user_id: 'dev', name: '食べ物', sort_order: 2, created_at: '' },
  { id: '4', user_id: 'dev', name: '自然', sort_order: 3, created_at: '' },
  { id: '5', user_id: 'dev', name: 'アート', sort_order: 4, created_at: '' },
  { id: '6', user_id: 'dev', name: '季節', sort_order: 5, created_at: '' },
  { id: '7', user_id: 'dev', name: 'スポーツ', sort_order: 6, created_at: '' },
  { id: '8', user_id: 'dev', name: 'アウトドア', sort_order: 7, created_at: '' },
];

export default function DevTagsManagePage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-10 text-center">
          <span className="inline-block px-4 py-1.5 bg-pink-50 text-pink-500 rounded-full text-xs font-black tracking-widest uppercase mb-4">
            Development Sandbox
          </span>
          <h2 className="text-3xl font-black text-gray-900">Tag Management Test</h2>
          <p className="text-gray-400 mt-2 text-sm font-bold">画像1のデザイン再現と操作テスト用</p>
        </div>

        <TagManagementUI initialTags={MOCK_TAGS} />
      </div>
    </div>
  );
}
