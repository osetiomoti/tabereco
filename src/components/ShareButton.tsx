'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';

type Props = {
  post: Post;
  onShare?: () => void;
};

export function ShareButton({ post, onShare }: Props) {
  const { appType } = useAppType();
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/share/${post.id}`;
  const getShareText = () => {
    return `${post.store_name ? `@${post.store_name}` : ''} で「${post.title}」を${appType === 'tabereco' ? '食べました' : '記録しました'}！評価: ${post.rating} 皿をつぶやいています。 #食べレコ #${appType === 'tabereco' ? 'グルメ' : '旅'}`;
  };

  const shareData = {
    title: `${post.title} | 食べレコ`,
    text: getShareText(),
    url: shareUrl,
  };

  const handleShare = async () => {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        onShare?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-gray-100 text-sm font-black text-gray-900 shadow-sm hover:border-orange-200 hover:bg-gray-50 transition-all active:scale-95"
    >
      {copied ? (
        <>
          <Check size={20} className="text-green-500" />
          コピーしました
        </>
      ) : (
        <>
          <Share2 size={20} className="text-orange-500" />
          シェアする
        </>
      )}
    </button>
  );
}
