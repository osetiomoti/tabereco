'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deletePost } from '@/lib/api/posts';
import { Trash2, Loader2 } from 'lucide-react';

type Props = {
  postId: string;
  imageUrl: string;
};

export function DeleteButton({ postId, imageUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      await deletePost(postId, imageUrl);
      router.push('/posts');
      router.refresh();
    } catch {
      alert('削除に失敗しました');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-black transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-sm ${
        confirm
          ? 'bg-red-600 text-white shadow-red-200'
          : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
      }`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      {confirm ? '本当に削除する' : '削除'}
    </button>
  );
}
