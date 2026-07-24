'use client';

import { useState } from 'react';
import { Star, CheckCircle2, X, Utensils } from 'lucide-react';
import { useToast } from '@/components/Toast';

type Props = {
  postId: string;
  storeName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function VisitedModal({ postId, storeName, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'visited',
          rating: rating || undefined,
          comment: comment || undefined,
          visited_at: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        showToast(`${storeName}に行った記録を保存しました 🎉`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast('保存に失敗しました', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const starLabels = ['', 'ひどい', 'いまいち', 'まあまあ', 'おいしい', '最高！'];

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-[2rem] pb-8 pt-6 px-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
            <Utensils size={20} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-gray-900">行ってきた！</h2>
            <p className="text-[12px] text-gray-400 font-bold truncate max-w-[220px]">
              {storeName}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-5">
          <p className="text-[12px] font-black text-gray-700 mb-3">評価（任意）</p>
          <div className="flex gap-2 justify-center mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s === rating ? 0 : s)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={36}
                  className={`transition-all duration-150 ${
                    s <= (hoverRating || rating)
                      ? 'fill-orange-400 text-orange-400'
                      : 'fill-gray-100 text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {(hoverRating || rating) > 0 && (
            <p className="text-center text-[13px] font-black text-orange-500 animate-in fade-in">
              {starLabels[hoverRating || rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <p className="text-[12px] font-black text-gray-700 mb-2">ひとこと（任意）</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="おいしかった！また来たい..."
            rows={3}
            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm text-gray-800 font-medium placeholder:text-gray-300 focus:ring-2 focus:ring-orange-100 outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black text-[15px] rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 size={20} />
              記録を保存する
            </>
          )}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-3 py-3 text-gray-400 font-bold text-[13px] hover:text-gray-600 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
