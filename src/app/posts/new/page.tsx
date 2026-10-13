import { Header } from '@/components/Header';
import { PostForm } from '@/components/PostForm';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '新規投稿 | モグレコ',
};

export default function NewPostPage() {
  return (
    <>
      <Header title="新規投稿" showBackButton hideSettings />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-32 w-full min-w-0 overflow-x-hidden">
        <h1 className="text-base font-black text-gray-800 mb-4 px-1">食事を記録する</h1>

        <React.Suspense fallback={<div className="h-64 flex justify-center items-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <PostForm />
        </React.Suspense>
      </main>
    </>
  );
}
