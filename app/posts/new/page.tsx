import { Header } from '@/components/Header';
import { PostForm } from '@/components/PostForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新規投稿 | モグレコ',
};

export default function NewPostPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* 戻るリンク */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          一覧に戻る
        </Link>

        <h1 className="text-xl font-bold text-white mb-6">食事を記録する</h1>

        <PostForm />
      </main>
    </>
  );
}
