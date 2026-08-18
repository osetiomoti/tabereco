'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export function FloatingActionButton() {
  return (
    <Link
      href="/posts/new"
      className="fixed bottom-24 right-6 w-16 h-16 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all z-40 group"
      style={{
        background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primary-hover))',
        boxShadow: '0 20px 25px -5px var(--color-primary-shadow), 0 8px 10px -6px var(--color-primary-shadow)'
      }}
    >
      <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
    </Link>
  );
}
