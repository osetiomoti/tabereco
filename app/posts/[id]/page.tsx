import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { StarDisplay } from '@/components/StarRating';
import { DeleteButton } from '@/components/DeleteButton';
import { ShareButton } from '@/components/ShareButton';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Store, Calendar, Pencil, MapPin, Hash, Globe, Lock } from 'lucide-react';
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from('posts').select('title').eq('id', params.id).single();
  return { title: data ? `${data.title} | モグレコ` : 'モグレコ' };
}

export default async function PostDetailPage({ params }: Props) {
  const supabase = createClient();

  const [{ data: post }, { data: { user } }] = await Promise.all([
    supabase.from('posts').select('*, tags(id, name)').eq('id', params.id).single(),
    supabase.auth.getUser(),
  ]);

  if (!post) notFound();

  const isOwner = user?.id === post.user_id;

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto pb-24 animate-fade-in bg-white min-h-screen">
        {/* 戻るリンクと公開設定バッジ */}
        <div className="px-4 py-4 flex items-center justify-between sticky top-14 z-40 bg-white/90 backdrop-blur-md">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors"
          >
            <ChevronLeft size={18} />
            戻る
          </Link>

          {isOwner && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              post.is_public ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'
            }`}>
              {post.is_public ? <Globe size={11} /> : <Lock size={11} />}
              {post.is_public ? 'Public' : 'Private'}
            </div>
          )}
        </div>

        {/* ヒーロー画像またはバッジのみ */}
        {post.image_url ? (
          <div className="relative w-full aspect-square sm:aspect-[16/10] bg-gray-50 overflow-hidden">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            {/* ステータスバッジ */}
            <div className="absolute bottom-4 left-4">
              <span className={`px-5 py-2 rounded-2xl text-[11px] font-black shadow-xl backdrop-blur-xl ${
                post.status === 'visited' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                {post.status === 'visited' ? '行った' : '行きたい'}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-4">
            <span className={`inline-block px-5 py-2 rounded-2xl text-[11px] font-black shadow-sm ${
              post.status === 'visited' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
            }`}>
              {post.status === 'visited' ? '行った' : '行きたい'}
            </span>
          </div>
        )}

        {/* 詳細情報 */}
        <div className="px-6 pt-8 space-y-8">
          {/* タイトルと評価 */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
              {post.title || `${post.store_name}での記録`}
            </h1>
            <div className="flex items-center gap-3 bg-gray-50 inline-flex px-4 py-2 rounded-2xl border border-gray-100">
              <StarDisplay rating={post.rating} size="lg" />
              <span className="text-gray-900 text-sm font-black">{post.rating}.0</span>
            </div>
          </div>

          {/* メタ情報カード */}
          <div className="grid grid-cols-1 gap-4">
            {post.store_name && (
              <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                  <Store size={22} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Shop Name</span>
                  <span className="text-base text-gray-900 font-bold">{post.store_name}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                <Calendar size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Date</span>
                <span className="text-base text-gray-900 font-bold">{formatDate(post.visited_at)}</span>
              </div>
            </div>
            {post.address && (
              <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <div className="p-3 rounded-2xl bg-green-50 text-green-600">
                  <MapPin size={22} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Address</span>
                  <span className="text-sm text-gray-900 font-bold leading-relaxed">{post.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {post.tags.map((tag: any) => (
                <span key={tag.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 hover:bg-white hover:text-orange-500 hover:border-orange-200 transition-all shadow-sm">
                  <Hash size={14} className="opacity-50" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* コメント */}
          {post.comment && (
            <div className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-7 relative overflow-hidden group shadow-inner">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 opacity-30" />
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap font-medium">{post.comment}</p>
            </div>
          )}

          {/* 操作ボタン - スマホで押しやすいように下部に固定配置するイメージ */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100">
            {isOwner && (
              <>
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-900 text-white text-base font-black hover:bg-black transition-all shadow-lg shadow-gray-200"
                >
                  <Pencil size={20} />
                  編集する
                </Link>
                <DeleteButton postId={post.id} imageUrl={post.image_url} />
              </>
            )}
            {/* シェアボタン */}
            {(post.is_public || isOwner) && (
              <div className="flex-none">
                <ShareButton post={post} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
