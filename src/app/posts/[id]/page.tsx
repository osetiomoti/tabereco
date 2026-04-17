import { prisma } from '@/lib/prisma';
import { Header } from '@/components/Header';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, ChevronDown, Camera, Pencil, MapPin, MoreHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import { DeleteButton } from '@/components/DeleteButton';
import { ShareButton } from '@/components/ShareButton';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true, store_name: true },
  });
  return { title: post ? `${post.title || post.store_name} | モグレコ` : 'モグレコ' };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      user: true,
    },
  });

  if (!post) notFound();

  return (
    <main className="w-full max-w-md mx-auto bg-white min-h-screen pb-32 shadow-sm border-x border-gray-50 relative">
      {/* 1. Updated Global Header for SubPage */}
      <Header title={post.store_name || post.title} showBackButton>
        <Link 
          href={`/posts/${post.id}/edit`} 
          className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <MoreHorizontal size={20} className="text-gray-900" />
        </Link>
      </Header>

      {/* 2. 画像エリア */}
      {post.image_url && (
        <div className="relative w-full aspect-square">
          <Image
            src={post.image_url}
            alt={post.title || ''}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* 3. 写真追加とインジケーター */}
      <div className="bg-gray-50 flex items-center justify-between pr-4 relative">
        <Link href={`/posts/${post.id}/edit`} className="relative z-10 w-[80px] h-[80px] bg-white border-y border-r border-gray-100 flex flex-col items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
          <Camera size={26} className="text-gray-600 mb-1" strokeWidth={1.5} />
          <span className="text-[10px] text-gray-500 font-bold tracking-tight">写真追加</span>
        </Link>
        {post.image_url && (
          <div className="flex-1 flex justify-center items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#5d4037]"></div>
          </div>
        )}
        <div className="w-[80px]"></div> {/* spacer for centering */}
      </div>

      {/* 4. ユーザー情報と評価 */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            <User size={18} />
          </div>
          <span className="text-sm text-gray-800">{post.user?.name || 'ゲスト'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-500">
          <div className="flex text-lg tracking-widest gap-0.5">
            {'★★★★★'.split('').map((star, i) => (
               <span key={i} className={i < Math.floor(post.rating) ? 'text-orange-500' : 'text-orange-200'}>★</span>
            ))}
          </div>
          <span className="text-gray-900 font-black text-sm ml-1">{post.rating.toFixed(1)}</span>
          <ChevronDown size={14} className="text-gray-600 font-bold ml-0.5" />
        </div>
      </div>

      {/* 5. 訪問日、メモ、タグ */}
      <div className="divide-y divide-gray-100/50">
        <div className="px-5 py-4 flex justify-between items-center bg-gray-50/20">
           <div className="flex items-center gap-5">
             <span className="font-bold text-[15px] text-gray-900 tracking-widest">訪問日</span>
             <span className="text-gray-500 text-[13.5px]">{formatDate(post.visited_at.toISOString())}</span>
           </div>
           <Link href={`/posts/${post.id}/edit`}><Pencil size={18} strokeWidth={1.5} className="text-gray-500 hover:text-orange-500 transition-colors" /></Link>
        </div>
        
        <div className="px-5 py-4 bg-gray-50/20">
           <div className="flex justify-between items-center mb-3">
             <span className="font-bold text-[15px] text-gray-900 tracking-widest">メモ</span>
             <Link href={`/posts/${post.id}/edit`}><Pencil size={18} strokeWidth={1.5} className="text-gray-500 hover:text-orange-500 transition-colors" /></Link>
           </div>
           <p className="text-gray-500 text-[13.5px] leading-relaxed w-[95%]">
             {post.comment || '食べたメニューやおすすめメニュー、お店での体験を記録してみよう。(500文字以内)'}
           </p>
        </div>

        <div className="px-5 py-4 bg-gray-50/20">
           <div className="flex justify-between items-center">
             <span className="font-bold text-[15px] text-gray-900 tracking-widest">タグ</span>
             <Link href={`/posts/${post.id}/edit`}><Pencil size={18} strokeWidth={1.5} className="text-gray-500 hover:text-orange-500 transition-colors" /></Link>
           </div>
           {post.tags && post.tags.length > 0 && (
             <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((t: any) => (
                  <span key={t.tag.id} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md font-medium">#{t.tag.name}</span>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* 6. 店舗情報 */}
      <div className="mt-2">
        <div className="bg-[#a68c7e] text-white px-5 py-3 font-bold text-sm tracking-widest">
           店舗情報
        </div>
        
        <div className="w-full aspect-[2/1] relative bg-[#e3e8da] overflow-hidden flex flex-col justify-center items-center group cursor-pointer hover:opacity-90 transition-opacity">
           {/* 簡易的なマップモック表現 */}
           <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(circle at center, #bcd8b1 0%, #e3e8da 100%)' }}></div>
           
           {/* ピンと住所 */}
           <div className="relative z-10 flex flex-col items-center">
             <div className="bg-white/90 backdrop-blur-sm text-[#4d7f55] border border-green-200 font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-1.5 whitespace-nowrap">
                <MapPin size={14} className="fill-[#9ecea5] text-green-700" />
                {post.store_name || "店舗位置"}
             </div>
             <p className="mt-2 font-black text-gray-600 tracking-widest text-[#5d7f55] text-xl opacity-60">岩田町</p>
           </div>

           <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-70">
              <span className="font-xl font-bold">🍎</span><span className="font-bold text-[11px] font-sans">マップ</span>
           </div>
           <div className="absolute bottom-2 left-20 opacity-60">
             <span className="text-[10px] underline">法律に基づく情報</span>
           </div>
        </div>

        <div className="bg-[#f9f9f9] px-4 py-5 flex justify-center border-b border-gray-200/50">
           <a 
             href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.store_name + ' ' + (post.address || ''))}`}
             target="_blank"
             rel="noreferrer"
             className="w-full sm:w-[85%] mx-auto py-3.5 border border-[#5d4037] text-[#5d4037] rounded-md text-[13px] tracking-wide flex justify-center items-center bg-white shadow-sm hover:bg-[#5d4037] hover:text-white transition-all"
           >
             <span className="font-black mr-1">Google</span> の店舗詳細ページを見る
           </a>
        </div>
        
        {post.address && (
          <div className="px-5 pt-6 pb-20 flex items-start gap-4">
            <MapPin className="text-[#5d4037] mt-0.5 min-w-[20px] fill-[#5d4037] text-white" size={24} />
            <span className="text-gray-500 font-medium tracking-wide text-sm leading-relaxed pt-1">{post.address}</span>
          </div>
        )}
      </div>

      {/* Delete / View Actions hidden logically at the bottom if needed but edit is via pencil */}
      <div className="px-5 mt-4 mb-20">
         <DeleteButton postId={post.id} />
      </div>

    </main>
  );
}
