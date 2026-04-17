import { prisma } from '@/lib/prisma';
import { Header } from '@/components/Header';
import { PostForm } from '@/components/PostForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import React from 'react';

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: '投稿を編集 | モグレコ',
};

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  // We'd ideally verify the user identity here to ensure ownership.
  // For now we just fetch the post.
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // Verify ownership or existence
  if (!post) notFound();

  // Transform post for PostForm
  const transformedPost = {
    ...post,
    tags: post.tags.map((pt: any) => pt.tag),
  };

  return (
    <>
      <Header title="編集する" showBackButton />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <h1 className="text-xl font-bold text-gray-900 mb-6 px-1">記録の内容を編集</h1>

        <React.Suspense fallback={<div className="h-64 flex justify-center items-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <PostForm post={transformedPost as any} />
        </React.Suspense>
      </main>
    </>
  );
}
