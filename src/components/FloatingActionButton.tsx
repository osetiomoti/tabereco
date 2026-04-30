'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export function FloatingActionButton() {
  return (
    <Link
      href="/posts/new"
      className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-[#ff6b95] to-[#ff9a8b] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#ff6b95]/30 hover:scale-105 active:scale-95 transition-all z-40 group"
    >
      <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
    </Link>
  );
}
