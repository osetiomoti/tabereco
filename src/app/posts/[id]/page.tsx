import { prisma } from '@/lib/prisma';
import { Header } from '@/components/Header';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, ChevronDown, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { PostMenu } from '@/components/PostMenu';
import { FavoriteToggle } from '@/components/FavoriteToggle';
import { StarDisplay } from '@/components/StarRating';
import { ImageCarousel } from '@/components/ImageCarousel';
import { CommentsSection, RatingAndActions } from '@/components/PostSocial';

type Props = { params: Promise<{ id: string }> };

/** サーバー側でログイン中のユーザーIDを取得（JWTデコードのみ・検証なし） */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const cognitoSub: string = payload.sub;
    if (!cognitoSub) return null;
    const user = await prisma.user.findUnique({ where: { cognito_sub: cognitoSub }, select: { id: true } });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

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
  
  const [post, currentUserId] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        user: true,
      },
    }),
    getCurrentUserId(),
  ]);

  if (!post) notFound();

  const isOwner = currentUserId !== null && currentUserId === post.user_id;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasCoords = post.latitude !== null && post.longitude !== null;
  const staticMapUrl = hasCoords && apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${post.latitude},${post.longitude}&zoom=16&size=600x300&markers=color:0xf43f5e%7C${post.latitude},${post.longitude}&key=${apiKey}`
    : null;

  // Collect all images: image_urls array, falling back to image_url
  const allImages: string[] = post.image_urls && post.image_urls.length > 0
    ? post.image_urls
    : (post.image_url ? [post.image_url] : []);

  return (
    <main className="w-full max-w-md mx-auto bg-white min-h-screen pb-32 shadow-sm border-x border-gray-50 relative">
      {/* 1. Header */}
      <Header title={post.store_name || post.title || ''} showBackButton hideSettings>
        <div className="flex items-center gap-2">
          {allImages.length === 0 && (
            <FavoriteToggle postId={post.id} initialValue={post.is_favorite} />
          )}
          <PostMenu postId={post.id} postUserId={post.user_id} isOwner={isOwner} />
        </div>
      </Header>

      {/* 2. 画像カルーセルエリア */}
      {allImages.length > 0 ? (
        <div className="relative">
          <ImageCarousel images={allImages} alt={post.store_name || post.title || ''} />
          {/* お気に入りボタン: 画像右上 */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteToggle postId={post.id} initialValue={post.is_favorite} />
          </div>
        </div>
      ) : post.status === 'want_to_go' ? (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center relative">
          {staticMapUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={staticMapUrl} alt="Map" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <span className="text-gray-600 font-bold text-sm bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
                  画像が登録されていません
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">📍</span>
              <p className="text-sm font-bold text-gray-500">画像が登録されていません</p>
            </div>
          )}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteToggle postId={post.id} initialValue={post.is_favorite} />
          </div>
        </div>
      ) : (
        <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center text-gray-300 gap-2 relative">
          <span className="text-5xl">🍽️</span>
          <span className="text-sm font-bold">写真なし</span>
          <div className="absolute top-3 right-3 z-20">
            <FavoriteToggle postId={post.id} initialValue={post.is_favorite} />
          </div>
        </div>
      )}

      {/* ドットインジケーター（ImageCarousel内蔵なので削除済み） */}

      {/* 3. ユーザー情報と評価 */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            <User size={18} />
          </div>
          <span className="text-sm text-gray-800">{post.user?.name || 'ゲスト'}</span>
        </div>
        {post.status !== 'want_to_go' && post.rating != null && (
          <div className="flex items-center gap-1.5">
            <StarDisplay rating={post.rating} size="md" />
            <ChevronDown size={14} className="text-gray-400 font-bold ml-0.5" />
          </div>
        )}
      </div>

      {/* 4. 訪問日、メモ、タグ */}
      <div className="divide-y divide-gray-100/50">
        {post.visited_at && (
          <div className="px-5 py-4 flex justify-between items-center bg-gray-50/20">
             <div className="flex items-center gap-5">
               <span className="font-bold text-[15px] text-gray-900 tracking-widest">訪問日</span>
               <span className="text-gray-500 text-[13.5px]">{formatDate(post.visited_at.toISOString())}</span>
             </div>
          </div>
        )}

        {(post.price_min != null || post.price_max != null) && (
          <div className="px-5 py-4 flex justify-between items-center bg-gray-50/20">
             <div className="flex items-center gap-5">
               <span className="font-bold text-[15px] text-gray-900 tracking-widest">値段帯</span>
               <span className="text-gray-500 text-[13.5px] font-bold">
                 {post.price_min != null ? `¥${post.price_min.toLocaleString()}` : ''}
                 〜
                 {post.price_max != null ? `¥${post.price_max.toLocaleString()}` : ''}
               </span>
             </div>
          </div>
        )}
        
        <div className="px-5 py-4 bg-gray-50/20">
           <div className="flex justify-between items-center mb-3">
             <span className="font-bold text-[15px] text-gray-900 tracking-widest">メモ</span>
           </div>
           <p className="text-gray-500 text-[13.5px] leading-relaxed w-[95%]">
             {post.comment || '食べたメニューやおすすめメニュー、お店での体験を記録してみよう。(500文字以内)'}
           </p>
        </div>

        <div className="px-5 py-4 bg-gray-50/20">
           <div className="flex justify-between items-center">
             <span className="font-bold text-[15px] text-gray-900 tracking-widest">タグ</span>
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

      {/* 5. 店舗情報 */}
      <div className="mt-2">
        <div className="bg-[#a68c7e] text-white px-5 py-3 font-bold text-sm tracking-widest">
           店舗情報
        </div>
        
        {hasCoords ? (
          <Link
            href={`/map?lat=${post.latitude}&lng=${post.longitude}&postId=${post.id}`}
            className="w-full block overflow-hidden group hover:opacity-90 transition-opacity border-b border-gray-100"
          >
            <div className="relative w-full" style={{ paddingBottom: '50%' }}>
              {staticMapUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={staticMapUrl} 
                  alt={post.store_name || "店舗位置"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#e3e8da] flex flex-col justify-center items-center">
                  <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(circle at center, #bcd8b1 0%, #e3e8da 100%)' }}></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white/90 backdrop-blur-sm text-[#4d7f55] border border-green-200 font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-1.5 whitespace-nowrap">
                       <MapPin size={14} className="fill-[#9ecea5] text-green-700" />
                       {post.store_name || "店舗位置"}
                    </div>
                    <p className="mt-2 font-black text-gray-600 tracking-widest text-[#5d7f55] text-xl opacity-60">店舗マップ</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                <MapPin size={11} className="fill-white text-black" />
                <span>アプリ内マップで開く</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="w-full aspect-[2/1] relative bg-[#f9f9f9] overflow-hidden flex flex-col justify-center items-center border-b border-gray-200/50">
             <div className="flex flex-col items-center text-center px-4">
               <MapPin className="text-gray-300 mb-1.5" size={28} />
               <p className="text-[11px] font-black text-gray-400">位置情報が登録されていません</p>
               {post.address && (
                 <p className="text-[9px] font-medium text-gray-400 mt-1 max-w-[80%] truncate">{post.address}</p>
               )}
             </div>
          </div>
        )}

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
          <div className="px-5 pt-6 pb-6 flex items-start gap-4">
            <MapPin className="text-[#5d4037] mt-0.5 min-w-[20px] fill-[#5d4037] text-white" size={24} />
            <span className="text-gray-500 font-medium tracking-wide text-sm leading-relaxed pt-1">{post.address}</span>
          </div>
        )}
      </div>

      {/* 6. 行動・評価 */}
      <RatingAndActions postId={post.id} isOwner={isOwner} ownerRating={post.rating} ownerVisitCount={post.visit_count} />

      {/* 7. コメント */}
      <CommentsSection
        postId={post.id}
        postOwnerId={post.user_id}
        currentUserId={currentUserId}
      />

    </main>
  );
}

