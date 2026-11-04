'use client';

import { useState } from 'react';
import { X, BookmarkCheck, ClipboardList, Loader2 } from 'lucide-react';

type VisitChoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Opens the VisitedModal for detailed record entry */
  onDetailRecord: () => void;
  /** Immediately registers as "visited only" via API */
  onQuickVisit: () => Promise<void>;
  storeName?: string;
};

export function VisitChoiceModal({
  isOpen,
  onClose,
  onDetailRecord,
  onQuickVisit,
  storeName,
}: VisitChoiceModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickVisit = async () => {
    setLoading(true);
    try {
      await onQuickVisit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-[2rem] px-5 pt-5 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-orange-400 tracking-widest uppercase mb-0.5">
              行った記録
            </p>
            <h2 className="text-[16px] font-black text-gray-900 leading-tight">
              {storeName ? `${storeName}` : '記録方法を選んでください'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Choice buttons */}
        <div className="flex flex-col gap-3">
          {/* Detailed record */}
          <button
            onClick={() => { onClose(); onDetailRecord(); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-200">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[14px] text-gray-900 mb-0.5">詳細を記録する</p>
              <p className="text-[11px] font-medium text-gray-500 leading-snug">
                タグ・写真・評価・金額・メモなどをしっかり記録できます
              </p>
            </div>
            <div className="text-orange-400 text-[11px] font-bold flex-shrink-0">おすすめ</div>
          </button>

          {/* Quick register */}
          <button
            onClick={handleQuickVisit}
            disabled={loading}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all text-left disabled:opacity-60"
          >
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              {loading ? (
                <Loader2 size={20} className="text-gray-400 animate-spin" />
              ) : (
                <BookmarkCheck size={20} className="text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[14px] text-gray-900 mb-0.5">行ったのみ記録</p>
              <p className="text-[11px] font-medium text-gray-500 leading-snug">
                詳細入力なしですぐに「行った」に追加します
              </p>
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-[10px] text-gray-400 font-medium mt-4">
          あとから詳細を追記・編集することもできます
        </p>
      </div>
    </div>
  );
}
