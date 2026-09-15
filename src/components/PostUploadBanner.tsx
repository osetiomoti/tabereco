'use client';

import React from 'react';
import Link from 'next/link';
import { usePostUpload } from '@/contexts/PostUploadContext';
import { Loader2, CheckCircle2, AlertCircle, RotateCcw, X, Utensils, ChevronRight } from 'lucide-react';

export function PostUploadBanner() {
  const {
    status,
    progress,
    message,
    storeName,
    thumbnailUrl,
    error,
    createdPostId,
    retryPostUpload,
    dismissBanner,
  } = usePostUpload();

  if (status === 'idle') {
    return null;
  }

  const isUploading = status === 'compressing' || status === 'uploading' || status === 'saving';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div
      className="fixed top-3 left-3 right-3 max-w-md mx-auto z-[9999] pointer-events-auto transition-all duration-300 animate-in slide-in-from-top-3 fade-in duration-300"
      style={{
        filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.15))',
      }}
    >
      <div className={`rounded-2xl border backdrop-blur-xl p-3.5 transition-colors ${
        isSuccess
          ? 'bg-white/95 border-emerald-200'
          : isError
          ? 'bg-white/95 border-rose-200'
          : 'bg-white/95 border-orange-100/80'
      }`}>
        {/* 上部: サムネイル、テキスト情報、アクション */}
        <div className="flex items-center gap-3">
          {/* サムネイル画像 */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-100 shadow-sm relative">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Utensils size={18} className="text-orange-400" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
            )}
          </div>

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-black text-gray-900 truncate leading-tight">
              {storeName || '新しい記録'}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isUploading && (
                <>
                  <Loader2 size={12} className="text-orange-500 animate-spin flex-shrink-0" />
                  <span className="text-[11px] font-bold text-gray-500 truncate">{message}</span>
                </>
              )}
              {isSuccess && (
                <>
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] font-black text-emerald-600 truncate">{message}</span>
                </>
              )}
              {isError && (
                <>
                  <AlertCircle size={13} className="text-rose-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-rose-500 truncate">{error || message}</span>
                </>
              )}
            </div>
          </div>

          {/* 右側アクション */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isUploading && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                {progress}%
              </span>
            )}
            {isSuccess && createdPostId && (
              <Link
                href={`/posts/${createdPostId}`}
                onClick={dismissBanner}
                className="flex items-center gap-0.5 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95 transition-all"
              >
                詳細 <ChevronRight size={12} />
              </Link>
            )}
            {isError && (
              <button
                type="button"
                onClick={retryPostUpload}
                className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-95 transition-all"
              >
                <RotateCcw size={11} />
                再試行
              </button>
            )}
            <button
              type="button"
              onClick={dismissBanner}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-0.5"
              aria-label="閉じる"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2.5">
          <div
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              isSuccess
                ? 'bg-emerald-500'
                : isError
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-orange-400 via-rose-500 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
