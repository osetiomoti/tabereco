'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  
  // ソート：評価が高い順、同点なら新しい順（簡易的にidなどを想定しますがここではそのまま）
  displayPosts = [...displayPosts].sort((a, b) => b.rating - a.rating);

  return (
    <div className="px-6 py-6">
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
      <h2 className="text-[14px] font-black text-gray-700 mb-4">評価の分布 {selectedBin && <span className="text-orange-500 text-[12px] ml-2">( {selectedBin} 選択中 )</span>}</h2>
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

      {/* Grid of Rated Posts */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-black text-gray-700">評価した投稿</h2>
        <span className="text-gray-400 font-bold text-[12px] bg-gray-100 px-2 py-0.5 rounded-full">{displayPosts.length}件</span>
      </div>
      
      {displayPosts.length === 0 ? (
        <div className="py-12 text-center text-gray-400 font-bold text-[12px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
          該当する記録がありません
        </div>
      ) : (
        <div className="-mx-6 px-6">
          <div className="grid grid-cols-3 gap-0.5 pb-4">
            {displayPosts.map(post => (
              <Link href={`/posts/${post.id}`} key={post.id} className="relative aspect-square bg-gray-100 group overflow-hidden touch-manipulation">
                {post.image_url ? (
                  <Image src={post.image_url} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50"><span className="text-2xl opacity-50">🍽️</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                  <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                  {post.user?.name && <span className="text-orange-300 font-black text-[8px] drop-shadow-md truncate mt-0.5">by {post.user.name}</span>}
                </div>
                {post.rating && (
                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-orange-500 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm scale-75 origin-top-left">
                    <span className="text-[10px] font-black">★</span>
                    <span className="text-[10px] font-black">{post.rating.toFixed(1)}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RatingsPage() {
  return (
    <main className="w-full max-w-md mx-auto bg-white min-h-screen pb-24 shadow-sm border-x border-gray-100">
      <Header title="評価の分布" showBackButton hideSettings />
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
