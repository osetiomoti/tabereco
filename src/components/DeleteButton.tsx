'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { deletePost } from '@/lib/api/posts';
import { Trash2, Loader2 } from 'lucide-react';

type Props = {
  postId: string;
};

export function DeleteButton({ postId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deletePost(postId);
      mutate((key: any) => typeof key === 'string' && (key.includes('/api/posts') || key.includes('/api/timeline')));
      router.push('/posts');
      router.refresh();
    } catch {
      alert('削除に失敗しました');
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="w-full py-3.5 flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-[2rem] text-sm font-black hover:bg-red-50 transition-all active:scale-[0.98]"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        この記録を削除
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && setShowModal(false)} />
          <div className="relative w-full max-w-[280px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <p className="text-[15px] font-black text-gray-800">削除しますか？</p>
            </div>
            <div className="flex border-t border-gray-100 h-14">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 text-[14px] font-black text-blue-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 text-[14px] font-black text-red-500 hover:bg-gray-50 transition-colors"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
