'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  subTitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * 統一空状態コンポーネント（futariba 準拠）
 */
export default function EmptyState({
  icon,
  emoji,
  title,
  subTitle,
  onAction,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="relative mb-4 flex justify-center items-center">
        {emoji ? (
          <div className="text-5xl animate-bounce-slow drop-shadow-sm select-none">
            {emoji}
          </div>
        ) : icon ? (
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
            {icon}
          </div>
        ) : null}
      </div>

      <h3 className="text-base font-extrabold text-gray-800 mb-1">{title}</h3>
      {subTitle && (
        <p className="text-xs font-medium text-gray-400 mb-6 max-w-[260px] leading-relaxed">
          {subTitle}
        </p>
      )}

      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-soft transition-transform active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

