import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { StarDisplay } from '@/components/StarRating';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Store, Calendar, MapPin, Hash, Quote } from 'lucide-react';
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase.from('posts').select('title, store_name').eq('id', params.id).single();
  if (!post) return { title: '見つかりませんでした | モグレコ' };
  return { 
    title: `${post.title} ${post.store_name ? `@ ${post.store_name}` : ''} | モグレコ`,
    description: 'モグレコでシェアされた食事の記録です。'
  };
}

export default async function SharedPostPage({ params }: Props) {
  const supabase = createClient();

  // RLS により、非公開かつ自分以外の投稿は取得できない（null になる）
  const { data: post } = await supabase
    .from('posts')
    .select('*, tags(id, name)')
    .eq('id', params.id)
    .single();

  if (!post) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-[#1a1a1a] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#222]">
            <Quote size={32} className="text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">この投稿は見つからないか、非公開です</h1>
          <p className="text-gray-500 text-sm">URLが正しいか、公開設定になっているかご確認ください。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto pb-20 animate-fade-in">
        {/* ヒーロー画像 */}
        <div className="relative w-full aspect-[4/3] bg-[#1a1a1a]">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        {/* コンテンツ */}
        <div className="px-5 -mt-10 relative z-10 space-y-8">
          {/* タイトルセクション */}
          <div className="bg-[#141414]/80 backdrop-blur-2xl border border-[#222] rounded-3xl p-6 shadow-2xl">
            <h1 className="text-3xl font-black text-white leading-tight mb-3">{post.title}</h1>
            <div className="flex items-center gap-3">
              <StarDisplay rating={post.rating} size="lg" />
              <span className="text-orange-500 font-black text-xl italic">{post.rating}.0</span>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="grid grid-cols-1 gap-4">
            {post.store_name && (
              <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Store size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-[10px]">Restaurant</p>
                  <p className="text-gray-100 font-bold">{post.store_name}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Date</p>
                <p className="text-gray-100 font-bold">{formatDate(post.visited_at)}</p>
              </div>
            </div>

            {post.address && (
              <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Address</p>
                  <p className="text-gray-100 font-bold text-sm">{post.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: any) => (
                <span key={tag.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs font-bold text-gray-400">
                  <Hash size={14} className="text-orange-500/60" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* コメント */}
          {post.comment && (
            <div className="relative p-6 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#222] rounded-[2rem] overflow-hidden">
              <Quote size={40} className="absolute -top-2 -right-2 text-white/5 rotate-12" />
              <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                {post.comment}
              </p>
            </div>
          )}

          {/* フッター */}
          <div className="text-center pt-8 border-t border-[#222]">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-4">Powered by</p>
            <div className="flex items-center justify-center gap-2 grayscale opacity-50">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-black">
                <UtensilsCrossed size={14} />
              </div>
              <span className="font-bold text-white tracking-tighter">MoguReco</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// アイコンのインポート不足を補完
import { UtensilsCrossed } from 'lucide-react';
