'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Star, MessageSquare, Image as ImageIcon, Trash2, Check, Loader2 } from 'lucide-react';
import { StarInput } from '@/components/StarRating';
import { ImageUpload } from '@/components/ImageUpload';
import { useUpload } from '@/hooks/useUpload';

type VisitedModalProps = {
  isOpen?: boolean;
  onClose: () => void;
  postId: string;
  storeName?: string;
  postTitle?: string;
  initialData?: {
    rating?: number | null;
    comment?: string | null;
    imageUrl?: string | null;
    imageUrls?: string[];
    visitedAt?: string | null;
    isMarked?: boolean;
  };
  onSuccess?: (result: any) => void;
  onDeleted?: () => void;
};

export function VisitedModal({
  isOpen = true,
  onClose,
  postId,
  storeName,
  postTitle,
  initialData,
  onSuccess,
  onDeleted,
}: VisitedModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [images, setImages] = useState<(File | string)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { uploadFile } = useUpload();

  // 初期値の同期
  useEffect(() => {
    if (isOpen) {
      setRating(initialData?.rating ?? null);
      setComment(initialData?.comment ?? '');
      
      if (initialData?.visitedAt) {
        const d = new Date(initialData.visitedAt);
        if (!isNaN(d.getTime())) {
          setVisitedAt(d.toISOString().split('T')[0]);
        } else {
          setVisitedAt(new Date().toISOString().split('T')[0]);
        }
      } else {
        setVisitedAt(new Date().toISOString().split('T')[0]);
      }

      const existingImages = initialData?.imageUrls && initialData.imageUrls.length > 0
        ? initialData.imageUrls
        : (initialData?.imageUrl ? [initialData.imageUrl] : []);
      setImages(existingImages);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const displayName = storeName || postTitle || 'このお店';

  // 保存処理
  const handleSave = async (skipDetails = false) => {
    setIsSubmitting(true);
    try {
      let finalImageUrls: string[] = [];

      if (!skipDetails) {
        // 画像のアップロード
        const uploadPromises = images.map(async (item, idx) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item instanceof File) {
            setUploadStatusText(`画像をアップロード中 (${idx + 1}/${images.length})...`);
            const url = await uploadFile(item, 'posts');
            return url;
          }
          return null;
        });

        const uploadedResults = await Promise.all(uploadPromises);
        finalImageUrls = uploadedResults.filter(Boolean) as string[];
      }

      setUploadStatusText('保存中...');

      const payload = skipDetails
        ? {
            rating: rating ?? undefined,
            visited_at: visitedAt || new Date().toISOString().split('T')[0],
          }
        : {
            rating: rating ?? null,
            comment: comment.trim() || null,
            image_url: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
            image_urls: finalImageUrls,
            visited_at: visitedAt || null,
          };

      const res = await fetch(`/api/posts/${postId}/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '保存に失敗しました');
      }

      if (onSuccess) {
        onSuccess(json);
      }
      onClose();
    } catch (e: any) {
      alert(e.message || '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
      setUploadStatusText('');
    }
  };

  // 行った記録の解除
  const handleDelete = async () => {
    if (!confirm('「行った」記録を取り消しますか？')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // 空bodyでトグル削除
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (onDeleted) onDeleted();
        onClose();
      } else {
        alert(json.error || '取り消しに失敗しました');
      }
    } catch (e: any) {
      alert(e.message || '通信エラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="flex flex-col min-w-0 pr-3">
            <span className="text-[10px] font-black tracking-wider text-orange-500 uppercase">
              {initialData?.isMarked ? '行った記録の編集' : '行った！を記録'}
            </span>
            <h2 className="text-base font-black text-gray-900 truncate">
              {displayName}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 1. 星評価 */}
          <div className="bg-orange-50/60 border border-orange-100/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-black text-gray-600 flex items-center gap-1">
              <Star size={14} className="text-orange-400 fill-orange-400" />
              あなたの評価 (任意)
            </span>
            <div className="py-1">
              <StarInput value={rating} onChange={(r) => setRating(r)} />
            </div>
            {rating && (
              <span className="text-[11px] font-black text-orange-500">
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* 2. 訪問日 */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-black text-gray-600 flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              訪問日
            </label>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all"
            />
          </div>

          {/* 3. 写真のアップロード */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-black text-gray-600 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-gray-400" />
              写真を追加 (最大5枚・任意)
            </label>
            <ImageUpload
              items={images}
              onChange={setImages}
              maxFiles={5}
            />
          </div>

          {/* 4. メモ・コメント */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-black text-gray-600 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-gray-400" />
              感想・メモ (任意)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="美味しかったメニューや雰囲気の感想、次回頼みたいものなど..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/80 flex flex-col gap-2">
          {uploadStatusText && (
            <div className="text-center text-xs font-bold text-orange-500 flex items-center justify-center gap-2 py-1">
              <Loader2 size={14} className="animate-spin" />
              {uploadStatusText}
            </div>
          )}

          <div className="flex items-center gap-2">
            {initialData?.isMarked && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="px-3 py-3 rounded-2xl bg-rose-50 text-rose-500 font-black text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                title="行った記録を取り消す"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting || isDeleting}
              className="flex-1 py-3 px-3 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-xs transition-colors"
            >
              あとで入力
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting || isDeleting}
              className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  記録を保存
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
