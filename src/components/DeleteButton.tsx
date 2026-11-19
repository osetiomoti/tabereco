'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyPostUpdated } from '@/lib/revalidate';
import { deletePost } from '@/lib/api/posts';
import { Trash2, Loader2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
      notifyPostUpdated({ action: 'delete', postId });
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

      <ConfirmDialog
        isOpen={showModal}
        message="削除しますか？"
        danger
        loading={loading}
        onCancel={() => setShowModal(false)}
        onOk={handleDelete}
      />
    </>
  );
}
