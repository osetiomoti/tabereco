'use client';

import { PostForm } from '@/components/PostForm';
import { UtensilsCrossed, Info } from 'lucide-react';

export default function DevPostFormPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-10 text-center">
          <span className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-black tracking-widest uppercase mb-4 shadow-sm border border-orange-100">
            Validation Sandbox
          </span>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Post Form Testing</h2>
          <p className="text-gray-400 mt-2 text-sm font-bold">店名必須・食事名任意の新しいバリデーション確認用</p>
        </div>

        {/* Info Card */}
        <div className="mb-8 p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
            <Info size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-gray-900">新ルールの検証ポイント</h3>
            <ul className="text-xs text-gray-500 font-bold space-y-1 ml-4 list-disc">
              <li>店名を空にして保存すると「店名を入力してください」と表示されるか</li>
              <li>食事名を空にして保存すると「(店名) での記録」として保存処理が走るか</li>
              <li>必須マーク (*) が店名に移動しているか</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 shadow-2xl shadow-gray-200/50 border border-gray-50">
          <PostForm />
        </div>

        <div className="mt-12 text-center">
           <UtensilsCrossed className="mx-auto text-gray-100 mb-4" size={40} />
           <p className="text-gray-300 text-xs font-bold leading-relaxed">
             ※ 開発用ページのため、実際の保存（DB書き込み）には認証が必要ですが、<br/>
             フロントエンドのバリデーションとタイトル補完ロジックの確認が可能です。
           </p>
        </div>
      </div>
    </div>
  );
}
