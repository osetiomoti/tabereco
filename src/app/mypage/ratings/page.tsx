'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Star, Check, Plus, Minus, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { mutate } from 'swr';

interface RatingBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

interface RatedPost {
  id: string;
  title: string;
  image_url: string | null;
  rating: number;
  user: { name: string } | null;
}

function RatingsContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [data, setData] = useState<{
    avgRating: number | null;
    ratingDistribution: RatingBin[];
    userName: string;
    ratedPosts: RatedPost[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

  // 一括編集ステート
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [delta, setDelta] = useState<number>(0.1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const url = userId ? `/api/profiles/${userId}` : '/api/profiles/me';
    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const d = json.data;
          setData({
            avgRating: d.avgRating ?? null,
            ratingDistribution: d.ratingDistribution ?? [],
            userName: d.user?.name ?? d.name ?? 'あなた',
            ratedPosts: d.ratedPosts ?? [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const maxCount = data ? Math.max(...data.ratingDistribution.map(b => b.count), 1) : 1;

  const starColors = [
    'from-red-400 to-red-500',
    'from-orange-400 to-orange-500',
    'from-yellow-400 to-yellow-500',
    'from-lime-400 to-green-500',
    'from-emerald-400 to-teal-500',
  ];

  const renderStars = (rating: number, max = 5) => {
    return Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(rating) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}
      />
    ));
  };

  const handleBinClick = (label: string) => {
    if (selectedBin === label) {
      setSelectedBin(null);
    } else {
      setSelectedBin(label);
    }
  };

  const toggleSelectPost = useCallback((postId: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-gray-400 font-bold">データが見つかりませんでした</div>;
  }

  let displayPosts = data.ratedPosts;
  if (selectedBin) {
    const bin = data.ratingDistribution.find(b => b.label === selectedBin);
    if (bin) {
      displayPosts = displayPosts.filter(p => 
        bin.max === 5 ? p.rating >= bin.min && p.rating <= bin.max : p.rating >= bin.min && p.rating < bin.max
      );
    }
  }
  
  // ソート：評価が高い順
  displayPosts = [...displayPosts].sort((a, b) => b.rating - a.rating);

  const handleSelectAll = () => {
    if (selectedPostIds.size === displayPosts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(displayPosts.map(p => p.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedPostIds.size === 0 || delta === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts/bulk-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postIds: Array.from(selectedPostIds),
          delta,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '一括更新に失敗しました');
      }

      // ローカルデータを即時更新
      const updatedPosts = data.ratedPosts.map(p => {
        if (selectedPostIds.has(p.id)) {
          const newRating = Math.max(0.1, Math.min(5.0, Number((p.rating + delta).toFixed(1))));
          return { ...p, rating: newRating };
        }
        return p;
      });

      const allRatings = updatedPosts.map(p => p.rating);
      const newAvg = allRatings.length > 0
        ? Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length * 10) / 10
        : null;

      const newDistribution = [0, 1, 2, 3, 4].map(bin => ({
        label: `${bin}〜${bin + 1}`,
        min: bin,
        max: bin + 1,
        count: allRatings.filter(r => (bin === 4 ? r >= bin && r <= bin + 1 : r >= bin && r < bin + 1)).length,
      }));

      setData({
        ...data,
        ratedPosts: updatedPosts,
        avgRating: newAvg,
        ratingDistribution: newDistribution,
      });

      // SWR キャッシュ無効化
      mutate((key: any) => typeof key === 'string' && (
        key.includes('/api/profiles') ||
        key.includes('/api/timeline') ||
        key.includes('/api/posts') ||
        key.includes('/api/rankings')
      ));

      setToastMessage(`${selectedPostIds.size}件の評価を更新しました！`);
      setTimeout(() => setToastMessage(null), 3500);

      setSelectedPostIds(new Set());
      setIsBulkMode(false);
    } catch (err: any) {
      alert(err?.message || '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`px-6 py-6 ${isBulkMode ? 'pb-80' : 'pb-28'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur text-white text-xs font-black px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles size={14} className="text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Average Rating Card */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 mb-8 text-center border border-orange-100">
        <p className="text-[12px] font-bold text-orange-400 tracking-wider mb-2">
          {data.userName}の平均評価
        </p>
        {data.avgRating !== null ? (
          <>
            <p className="text-[56px] font-black text-orange-500 leading-none mb-2">
              {data.avgRating.toFixed(1)}
            </p>
            <div className="flex items-center justify-center gap-1 mb-1">
              {renderStars(data.avgRating)}
            </div>
          </>
        ) : (
          <p className="text-[20px] font-bold text-gray-400 py-4">評価データなし</p>
        )}
      </div>

      {/* Distribution Chart */}
      <h2 className="text-[14px] font-black text-gray-700 mb-4">
        評価の分布 {selectedBin && <span className="text-orange-500 text-[12px] ml-2">( {selectedBin} 選択中 )</span>}
      </h2>
      <div className="space-y-3 mb-8">
        {data.ratingDistribution.map((bin, i) => {
          const pct = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
          const isSelected = selectedBin === bin.label;
          const isFaded = selectedBin !== null && !isSelected;
          
          return (
            <div 
              key={bin.label} 
              className={`flex items-center gap-3 cursor-pointer transition-all ${isFaded ? 'opacity-40' : 'opacity-100'} hover:opacity-80`}
              onClick={() => handleBinClick(bin.label)}
            >
              <div className="flex items-center gap-1 w-16 shrink-0">
                <span className="text-[12px] font-bold text-gray-500">{bin.min}〜{bin.max}</span>
              </div>
              <div className={`flex-1 h-8 bg-gray-100 rounded-xl overflow-hidden relative ${isSelected ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}>
                <div
                  className={`h-full bg-gradient-to-r ${starColors[i]} rounded-xl transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(pct, bin.count > 0 ? 4 : 0)}%` }}
                />
                {bin.count > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-gray-600">
                    {bin.count}件
                  </span>
                )}
              </div>
              <div className="w-8 text-right">
                <span className="text-[11px] font-black text-gray-400">{bin.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for chart */}
      {data.ratingDistribution.every(b => b.count === 0) && (
        <div className="mt-6 mb-8 py-8 text-center text-gray-300 font-bold">
          まだ評価データがありません
        </div>
      )}

      {/* Grid Header & Action Button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-black text-gray-700">評価した投稿</h2>
          <span className="text-gray-400 font-bold text-[12px] bg-gray-100 px-2 py-0.5 rounded-full">
            {displayPosts.length}件
          </span>
        </div>

        {/* 自分の評価画面の場合のみ一括評価変更ボタンを表示 */}
        {!userId && displayPosts.length > 0 && (
          <button
            onClick={() => {
              setIsBulkMode(prev => !prev);
              setSelectedPostIds(new Set());
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
              isBulkMode
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 active:scale-95'
            }`}
          >
            {isBulkMode ? 'キャンセル' : '一括評価変更'}
          </button>
        )}
      </div>
      
      {displayPosts.length === 0 ? (
        <div className="py-12 text-center text-gray-400 font-bold text-[12px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
          該当する記録がありません
        </div>
      ) : (
        <div className="-mx-6 px-6">
          <div className="grid grid-cols-3 gap-1 pb-4">
            {displayPosts.map(post => {
              const isSelected = selectedPostIds.has(post.id);
              const previewRating = isSelected
                ? Math.max(0.1, Math.min(5.0, Number((post.rating + delta).toFixed(1))))
                : post.rating;

              const cardContent = (
                <div
                  className={`relative aspect-square bg-gray-100 group overflow-hidden touch-manipulation transition-all ${
                    isBulkMode ? 'cursor-pointer select-none' : ''
                  } ${
                    isSelected ? 'ring-2 ring-orange-500 ring-offset-2 rounded-xl z-10' : ''
                  }`}
                  onClick={isBulkMode ? () => toggleSelectPost(post.id) : undefined}
                >
                  {post.image_url ? (
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className={`object-cover transition-transform duration-500 ${
                        isBulkMode ? '' : 'group-hover:scale-110'
                      } ${isSelected ? 'brightness-95' : ''}`}
                      sizes="33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                      <span className="text-2xl opacity-50">🍽️</span>
                    </div>
                  )}

                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />

                  {/* Checkbox indicator in bulk mode */}
                  {isBulkMode && (
                    <div className="absolute top-2 right-2 z-20">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white scale-105'
                            : 'bg-white/80 backdrop-blur-sm text-transparent border border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Check size={14} strokeWidth={3} className={isSelected ? 'block' : 'hidden'} />
                      </div>
                    </div>
                  )}

                  {/* Post title and author */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                    <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">
                      {post.title}
                    </span>
                    {post.user?.name && (
                      <span className="text-orange-300 font-black text-[8px] drop-shadow-md truncate mt-0.5">
                        by {post.user.name}
                      </span>
                    )}
                  </div>

                  {/* Rating Tag */}
                  {post.rating != null && (
                    <div
                      className={`absolute top-1.5 left-1.5 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm transition-all z-20 ${
                        isSelected && delta !== 0
                          ? 'bg-orange-500 text-white scale-90 origin-top-left font-black'
                          : 'bg-white/90 backdrop-blur-sm text-orange-500 scale-75 origin-top-left font-black'
                      }`}
                    >
                      <span className="text-[10px]">★</span>
                      <span className="text-[10px]">{post.rating.toFixed(1)}</span>
                      {isSelected && delta !== 0 && (
                        <>
                          <ArrowRight size={9} className="stroke-[3] mx-0.5" />
                          <span className="text-[10px] font-black underline">{previewRating.toFixed(1)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );

              if (isBulkMode) {
                return <div key={post.id}>{cardContent}</div>;
              }

              return (
                <Link href={`/posts/${post.id}`} key={post.id} className="block">
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bulk Edit Control Toolbar */}
      {isBulkMode && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+12px)] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-orange-100 p-3.5 z-[55] animate-in slide-in-from-bottom-5 duration-300">
          {/* Header of Toolbar */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-700">
                選択中: <span className="text-orange-500 text-sm font-black">{selectedPostIds.size}</span>件
              </span>
              <button
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-gray-500 hover:text-orange-500 transition-colors bg-gray-100 px-2 py-0.5 rounded-full"
              >
                {selectedPostIds.size === displayPosts.length ? '全解除' : '全選択'}
              </button>
            </div>
            <button
              onClick={() => {
                setIsBulkMode(false);
                setSelectedPostIds(new Set());
              }}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-600 px-1 py-0.5 transition-colors"
            >
              閉じる
            </button>
          </div>

          {/* Delta Adjuster */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-500">変更する評価数（増減）</span>
              <span
                className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                  delta > 0
                    ? 'bg-orange-50 text-orange-600'
                    : delta < 0
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[-0.5, -0.1, 0.1, 0.5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDelta(Number((delta + d).toFixed(1)))}
                  className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                    d > 0
                      ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-95'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'
                  }`}
                >
                  {d > 0 ? `+${d}` : `${d}`}
                </button>
              ))}
            </div>

            {/* Stepper + Reset */}
            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setDelta(d => Number((d - 0.1).toFixed(1)))}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 active:scale-90"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setDelta(0.1)}
                className="text-[10px] text-gray-400 font-bold hover:underline"
              >
                +0.1 にリセット
              </button>
              <button
                type="button"
                onClick={() => setDelta(d => Number((d + 0.1).toFixed(1)))}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 active:scale-90"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleBulkUpdate}
            disabled={selectedPostIds.size === 0 || delta === 0 || isSubmitting}
            className={`w-full py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md ${
              selectedPostIds.size === 0 || delta === 0 || isSubmitting
                ? 'bg-gray-300 shadow-none cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 shadow-orange-500/25 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                {selectedPostIds.size > 0
                  ? `${selectedPostIds.size}件の評価を ${delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} 一括更新`
                  : '投稿を選択してください'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RatingsPage() {
  return (
    <main className="w-full max-w-md mx-auto bg-white min-h-screen pb-24 shadow-sm border-x border-gray-100">
      <Header title="評価の分布" showBackButton backUrl="/mypage" hideSettings />
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      }>
        <RatingsContent />
      </Suspense>
    </main>
  );
}
