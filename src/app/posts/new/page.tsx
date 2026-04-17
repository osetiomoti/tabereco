import { Header } from '@/components/Header';
import { PostForm } from '@/components/PostForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '新規投稿 | モグレコ',
};

export default function NewPostPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-[120px]">
        {/* 戻るリンク */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          一覧に戻る
        </Link>

        <h1 className="text-xl font-bold text-white mb-6">食事を記録する</h1>

        <React.Suspense fallback={<div className="h-64 flex justify-center items-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <PostForm />
        </React.Suspense>
      </main>
    </>
  );
}
