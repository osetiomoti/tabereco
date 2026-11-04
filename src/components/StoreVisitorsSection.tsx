'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/image';
import { User, Star, Calendar, Pencil, Lock, Plus, BookmarkCheck, ChevronRight, X } from 'lucide-react';
import { StarDisplay } from './StarRating';
import { VisitedModal } from './VisitedModal';
import { VisitChoiceModal } from './VisitChoiceModal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildNewPostUrlFromStore } from '@/lib/storeUtils';

type VisitorUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  rating: number | null;
  comment: string | null;
  image_url: string | null;
  image_urls: string[];
  visited_at: string | null;
  visit_count: number;
  isAuthor: boolean;
  postId: string;
  visitedId?: string;
  isMe: boolean;
  is_restricted: boolean;
};

type StoreVisitorsSectionProps = {
  postId: string;
  post?: any;
  storeName?: string | null;
  currentUserId: string | null;
  isOwner: boolean;
  onDataChanged?: () => void;
};

export function StoreVisitorsSection({
  postId,
  post,
  storeName,
  currentUserId,
  isOwner,
  onDataChanged,
}: StoreVisitorsSectionProps) {
  const router = useRouter();
  const [visitors, setVisitors] = useState<VisitorUser[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [isMarked, setIsMarked] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [myComment, setMyComment] = useState<string | null>(null);
  const [myImageUrl, setMyImageUrl] = useState<string | null>(null);
  const [myImageUrls, setMyImageUrls] = useState<string[]>([]);
  const [myVisitedAt, setMyVisitedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isVisitedModalOpen, setIsVisitedModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchVisitors = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/visited`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setVisitorCount(json.data.count || 0);
        setVisitors(json.data.users || []);
        setIsMarked(json.data.isMarked || false);
        setMyRating(json.data.myRating ?? null);
        setMyComment(json.data.myComment ?? null);
        setMyImageUrl(json.data.myImageUrl ?? null);
        setMyImageUrls(json.data.myImageUrls ?? []);
        setMyVisitedAt(json.data.myVisitedAt ?? null);
      }
    } catch (e) {
      console.error('[StoreVisitorsSection] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleQuickVisit = async () => {
    const res = await fetch(`/api/posts/${postId}/visited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMarked: true }),
    });
    if (res.ok) {
      setIsChoiceModalOpen(false);
      await fetchVisitors();
      onDataChanged?.();
    }
  };

  const handleSuccess = () => {
    setIsVisitedModalOpen(false);
    fetchVisitors();
    onDataChanged?.();
  };

  return (
    <div className="mt-3 bg-white">
      {/* セクションヘッダー */}
      <div className="bg-gradient-to-r from-[#8c7365] to-[#a68c7e] text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <BookmarkCheck size={18} className="text-orange-200" />
          <h2 className="font-bold text-sm tracking-wider">同じ店に行った人の記録</h2>
          <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-black px-2 py-0.5 rounded-full">
            👤 {visitorCount}人
          </span>
        </div>
        {currentUserId && !isOwner && !isMarked && (
          <button
            onClick={() => setIsChoiceModalOpen(true)}
            className="text-[11px] font-bold bg-white text-[#8c7365] hover:bg-orange-50 px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 transition-transform active:scale-95"
          >
            <Plus size={12} />
            自分も記録
          </button>
        )}
      </div>

      {/* 訪問者一覧リスト */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="px-5 py-8 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-[13px] font-medium">
            まだこの店舗への訪問記録はありません
          </div>
        ) : (
          visitors.map((v) => {
            const displayImages = v.image_urls && v.image_urls.length > 0
              ? v.image_urls
              : (v.image_url ? [v.image_url] : []);

            return (
              <div
                key={v.id}
                className={`p-4 transition-colors ${
                  v.isMe ? 'bg-orange-50/40' : 'bg-white hover:bg-gray-50/60'
                }`}
              >
                {/* ユーザーヘッダー */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link href={`/mypage?userId=${v.id}`} className="relative flex-shrink-0 group">
                      <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200 group-hover:border-orange-300 transition-colors">
                        {v.avatar_url ? (
                          <Image
                            src={getImageUrl(v.avatar_url)}
                            alt={v.name}
                            width={36}
                            height={36}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <User size={18} className="text-gray-400" />
                        )}
                      </div>
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/mypage?userId=${v.id}`}
                          className="text-[13px] font-black text-gray-900 truncate hover:text-orange-600 transition-colors"
                        >
                          {v.name}
                        </Link>
                        {v.isAuthor ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded">
                            投稿主
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.2 rounded">
                            行った
                          </span>
                        )}
                        {v.isMe && (
                          <span className="text-[10px] font-black bg-orange-500 text-white px-1.5 py-0.2 rounded-full">
                            あなた
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        {v.visited_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(v.visited_at)}
                          </span>
                        )}
                        {v.visit_count > 1 && (
                          <span className="font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                            {v.visit_count}回訪問
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 評価 & 編集ボタン */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.rating != null && (
                      <div className="flex items-center gap-1 bg-white border border-orange-100 px-2 py-0.5 rounded-lg shadow-2xs">
                        <Star size={13} className="text-orange-400 fill-orange-400" />
                        <span className="text-[12px] font-black text-gray-800">
                          {v.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {v.isMe && (
                      <button
                        onClick={() => {
                          if (v.postId) {
                            router.push(`/posts/${v.postId}/edit`);
                          } else {
                            setIsVisitedModalOpen(true);
                          }
                        }}
                        className="text-[11px] font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
                      >
                        <Pencil size={11} />
                        編集
                      </button>
                    )}
                  </div>
                </div>

                {/* プライバシーマスク表示 */}
                {v.is_restricted ? (
                  <div className="mt-2 py-2 px-3 bg-gray-100/80 rounded-xl flex items-center gap-2 text-gray-400 text-[12px]">
                    <Lock size={13} />
                    <span>身内限定の記録（詳細は非公開です）</span>
                  </div>
                ) : (
                  <>
                    {/* コメント */}
                    {v.comment && (
                      <p className="mt-2 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap pl-11">
                        {v.comment}
                      </p>
                    )}

                    {/* 写真一覧 */}
                    {displayImages.length > 0 && (
                      <div className="mt-2.5 pl-11 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {displayImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewImage(img)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 hover:opacity-90 active:scale-95 transition-all"
                          >
                            <Image
                              src={getImageUrl(img)}
                              alt="訪問写真"
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 拡大写真プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
          <div
            className="relative max-w-lg max-h-[80vh] w-full aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getImageUrl(previewImage)}
              alt="拡大写真"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* 記録方法の選択モーダル */}
      {isChoiceModalOpen && (
        <VisitChoiceModal
          isOpen={isChoiceModalOpen}
          storeName={post?.store_name || post?.title || storeName || undefined}
          onClose={() => setIsChoiceModalOpen(false)}
          onDetailRecord={() => {
            setIsChoiceModalOpen(false);
            const target = post || { id: postId, store_name: storeName };
            router.push(buildNewPostUrlFromStore(target));
          }}
          onQuickVisit={handleQuickVisit}
        />
      )}

      {/* 詳細記録モーダル */}
      {isVisitedModalOpen && (
        <VisitedModal
          isOpen={isVisitedModalOpen}
          postId={postId}
          onClose={() => setIsVisitedModalOpen(false)}
          initialData={{
            rating: myRating,
            comment: myComment,
            imageUrl: myImageUrl,
            imageUrls: myImageUrls,
            visitedAt: myVisitedAt,
            isMarked: isMarked,
          }}
          onSuccess={handleSuccess}
          onDeleted={handleSuccess}
        />
      )}
    </div>
  );
}
