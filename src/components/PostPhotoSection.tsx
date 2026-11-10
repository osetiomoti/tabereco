'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { formatDate } from '@/lib/utils';
import { ImageCarousel } from './ImageCarousel';
import { FavoriteToggle } from './FavoriteToggle';
import { User, X, ChevronLeft, ChevronRight, ExternalLink, Images, Calendar } from 'lucide-react';
import type { StorePhotoItem } from '@/app/api/posts/[id]/store-photos/route';

type Props = {
  postId: string;
  postTitle: string;
  postImages: string[];
  postStatus: string;
  staticMapUrl: string | null;
  isOwner: boolean;
  isFavorite: boolean;
};

export function PostPhotoSection({
  postId,
  postTitle,
  postImages,
  postStatus,
  staticMapUrl,
  isOwner,
  isFavorite,
}: Props) {
  const [activeTab, setActiveTab] = useState<'this_post' | 'all_photos'>('this_post');
  const [photos, setPhotos] = useState<StorePhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // 初回マウント時またはタブ切り替え時に「みんなの写真」データを取得
  useEffect(() => {
    let isMounted = true;
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts/${postId}/store-photos`, { cache: 'no-store' });
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setPhotos(json.data.photos || []);
        }
      } catch (err) {
        console.error('[PostPhotoSection] Fetch photos error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setHasFetched(true);
        }
      }
    };

    fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  // 拡大モーダル時のスワイプ操作
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || selectedPhotoIndex === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -40 && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else if (diff > 40 && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
    touchStartXRef.current = null;
  };

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <div className="w-full bg-white">
      {/* 1. タブ切り替えバー */}
      <div className="flex items-center border-b border-gray-100 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('this_post')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === 'this_post'
              ? 'text-orange-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>この投稿</span>
          <span
            className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'this_post'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {postImages.length}
          </span>
          {activeTab === 'this_post' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_photos')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === 'all_photos'
              ? 'text-orange-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>みんなの写真</span>
          <span
            className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'all_photos'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {hasFetched ? photos.length : '...'}
          </span>
          {activeTab === 'all_photos' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
          )}
        </button>
      </div>

      {/* 2. 「この投稿」タブ表示 */}
      {activeTab === 'this_post' && (
        <>
          {postImages.length > 0 ? (
            <div className="relative">
              <ImageCarousel images={postImages} alt={postTitle} />
              {/* お気に入りボタン: 画像右上（自分の投稿のみ） */}
              {isOwner && (
                <div className="absolute top-3 right-3 z-20">
                  <FavoriteToggle postId={postId} initialValue={isFavorite} />
                </div>
              )}
            </div>
          ) : postStatus === 'want_to_go' ? (
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
              {isOwner && (
                <div className="absolute top-3 right-3 z-20">
                  <FavoriteToggle postId={postId} initialValue={isFavorite} />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center text-gray-300 gap-2 relative">
              <span className="text-5xl">🍽️</span>
              <span className="text-sm font-bold">写真なし</span>
              {isOwner && (
                <div className="absolute top-3 right-3 z-20">
                  <FavoriteToggle postId={postId} initialValue={isFavorite} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 3. 「みんなの写真」タブ表示 */}
      {activeTab === 'all_photos' && (
        <div className="w-full bg-gray-50 min-h-[300px]">
          {loading && !hasFetched ? (
            <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 text-gray-400">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">写真を読み込み中...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="w-full aspect-square flex flex-col items-center justify-center text-gray-400 gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                <Images size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">みんなの写真はまだありません</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-[240px]">
                  フレンドや同じグループのメンバーがこの店舗の写真を追加すると、ここに表示されます。
                </p>
              </div>
            </div>
          ) : (
            <div className="p-1">
              <div className="grid grid-cols-3 gap-1">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="relative aspect-square w-full bg-gray-100 overflow-hidden rounded-md group hover:opacity-90 active:scale-95 transition-all focus:outline-none"
                  >
                    <Image
                      src={getImageUrl(photo.url)}
                      alt={photo.author.name || '店舗写真'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 150px"
                    />
                    {/* 投稿者アバターバッジ（左下） */}
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-10">
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-white bg-gray-200 shadow-sm flex items-center justify-center">
                        {photo.author.avatar_url ? (
                          <Image
                            src={getImageUrl(photo.author.avatar_url)}
                            alt={photo.author.name}
                            width={20}
                            height={20}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <User size={12} className="text-gray-500" />
                        )}
                      </div>
                      {photo.isMe && (
                        <span className="bg-orange-600/90 backdrop-blur-xs text-white text-[9px] font-black px-1 rounded-sm shadow-xs">
                          自分
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 写真拡大表示モーダル */}
      {selectedPhoto && selectedPhotoIndex !== null && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col justify-between"
          onClick={() => setSelectedPhotoIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 上部ヘッダー（投稿者情報・閉じるボタン） */}
          <div
            className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm flex items-center justify-between z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center border border-white/20">
                {selectedPhoto.author.avatar_url ? (
                  <Image
                    src={getImageUrl(selectedPhoto.author.avatar_url)}
                    alt={selectedPhoto.author.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User size={16} className="text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {selectedPhoto.author.name}
                  {selectedPhoto.isMe && (
                    <span className="ml-1.5 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black">
                      自分
                    </span>
                  )}
                </p>
                {selectedPhoto.visited_at && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-300 mt-0.5">
                    <Calendar size={11} />
                    <span>{formatDate(selectedPhoto.visited_at)} 訪問</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 中央写真エリア */}
          <div
            className="relative flex-1 flex items-center justify-center p-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 前へボタン */}
            {selectedPhotoIndex > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(selectedPhotoIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all backdrop-blur-xs"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* 写真本体 */}
            <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center">
              <Image
                src={getImageUrl(selectedPhoto.url)}
                alt={selectedPhoto.author.name || '拡大写真'}
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>

            {/* 次へボタン */}
            {selectedPhotoIndex < photos.length - 1 && (
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(selectedPhotoIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all backdrop-blur-xs"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* 下部フッター（コメント・元の投稿への導線・インデックス） */}
          <div
            className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm z-30 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPhoto.comment && (
              <p className="text-white text-xs leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">
                {selectedPhoto.comment}
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-xs font-medium text-gray-400">
                {selectedPhotoIndex + 1} / {photos.length}
              </span>

              {selectedPhoto.postId && (
                <Link
                  href={`/posts/${selectedPhoto.postId}`}
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold bg-white/10 px-3 py-1.5 rounded-full transition-colors"
                >
                  <span>この投稿を見る</span>
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
