import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { PostForm } from '@/components/PostForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export const metadata: Metadata = {
  title: '投稿を編集 | モグレコ',
};

export default async function EditPostPage({ params }: Props) {
  const supabase = createClient();

  const [{ data: post }, { data: { user } }] = await Promise.all([
    supabase.from('posts').select('*, tags(*)').eq('id', params.id).single(),
    supabase.auth.getUser(),
  ]);

  // 存在しないか、自分の投稿でなければ404
  if (!post || post.user_id !== user?.id) notFound();

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <Link
          href={`/posts/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          詳細に戻る
        </Link>

        <h1 className="text-xl font-bold text-white mb-6">投稿を編集</h1>

        <PostForm post={post} />
      </main>
    </>
  );
}
