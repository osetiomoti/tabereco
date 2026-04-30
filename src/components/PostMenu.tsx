'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export function PostMenu({ postId }: { postId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <MoreHorizontal size={20} className="text-gray-900" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <Link
            href={`/posts/${postId}/edit`}
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Pencil size={16} className="text-gray-400" />
            <span className="font-bold">編集する</span>
          </Link>
          {/* Add other options if needed, like Share or Delete (though Delete is inside Edit) */}
        </div>
      )}
    </div>
  );
}
