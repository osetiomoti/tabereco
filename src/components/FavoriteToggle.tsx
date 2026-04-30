'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';

export function FavoriteToggle({ postId, initialValue }: { postId: string, initialValue: boolean }) {
  const [isFavorite, setIsFavorite] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !isFavorite }),
      });
      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
        isFavorite 
        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' 
        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}
    >
      <Heart size={20} className={isFavorite ? 'fill-white' : ''} />
    </button>
  );
}
