'use client';

import { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  cancelLabel?: string;
  okLabel?: string;
  onCancel: () => void;
  onOk: () => void | Promise<void>;
  danger?: boolean;
  loading?: boolean;
}

/**
 * iOS 風の統一確認ダイアログ（futariba 準拠）
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  cancelLabel = 'キャンセル',
  okLabel = 'OK',
  onCancel,
  onOk,
  danger = true,
  loading = false,
}: ConfirmDialogProps) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // ESC キーでキャンセル
  useEffect(() => {
    if (!isOpen || loading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, loading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-8 animate-fade-in">
      {/* オーバーレイ背景 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* ダイアログカード */}
      <div className="relative w-full max-w-[280px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        {/* テキスト領域 */}
        <div className="px-5 pt-6 pb-5 text-center">
          {title && (
            <p className="font-extrabold text-gray-900 text-[16px] mb-1.5 leading-snug">
              {title}
            </p>
          )}
          <p className="text-gray-600 text-[13px] leading-relaxed">
            {message}
          </p>
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-gray-100" />

        {/* ボタン領域 */}
        <div className="flex h-12">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 text-[15px] font-bold text-gray-500 active:bg-gray-50 hover:bg-gray-50 transition-colors border-r border-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onOk}
            className={`flex-1 text-[15px] font-black active:bg-gray-50 hover:bg-gray-50 transition-colors disabled:opacity-50 ${
              danger ? 'text-red-500' : 'text-primary-500'
            }`}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              okLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

