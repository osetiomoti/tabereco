'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Star } from 'lucide-react';

interface RatingBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export default function RatingsPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [data, setData] = useState<{
    avgRating: number | null;
    ratingDistribution: RatingBin[];
    userName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = userId ? `/api/profiles/${userId}` : '/api/profiles/me';
    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const d = json.data;
          setData({
            avgRating: d.avgRating ?? d.data?.avgRating ?? null,
            ratingDistribution: d.ratingDistribution ?? d.data?.ratingDistribution ?? [],
            userName: d.user?.name ?? d.name ?? 'あなた',
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

  return (
    <main className="w-full max-w-md mx-auto bg-white min-h-screen pb-24 shadow-sm border-x border-gray-100">
      <Header title="評価の分布" showBackButton hideSettings />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-gray-400 font-bold">データが見つかりませんでした</div>
      ) : (
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
          <h2 className="text-[14px] font-black text-gray-700 mb-4">評価の分布</h2>
          <div className="space-y-3">
            {data.ratingDistribution.map((bin, i) => {
              const pct = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
              return (
                <div key={bin.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    <span className="text-[12px] font-bold text-gray-500">{bin.min}〜{bin.max}</span>
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-xl overflow-hidden relative">
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

          {/* Empty state */}
          {data.ratingDistribution.every(b => b.count === 0) && (
            <div className="mt-6 py-8 text-center text-gray-300 font-bold">
              まだ評価データがありません
            </div>
          )}
        </div>
      )}
    </main>
  );
}
