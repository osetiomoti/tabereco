'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Map, Trophy, ChevronDown, ChevronUp, Check, Sparkles } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';

type Props = {
  posts: Post[];
};

type RegionGroup = {
  name: string;
  prefectures: string[];
};

const REGIONS: RegionGroup[] = [
  { name: '北海道', prefectures: ['北海道'] },
  { name: '東北', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { name: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { name: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { name: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { name: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];

const ALL_PREFECTURES = REGIONS.flatMap(r => r.prefectures);

export function PrefectureMapWidget({ posts }: Props) {
  const { appType } = useAppType();
  const isTabireco = appType === 'tabireco';
  const [isExpanded, setIsExpanded] = useState(false);

  // Count visits per prefecture from visited posts address
  const { visitedCounts, totalVisitedPrefs } = useMemo(() => {
    const counts: Record<string, number> = {};

    posts.forEach(p => {
      if (!p.address) return;
      for (const pref of ALL_PREFECTURES) {
        if (p.address.includes(pref)) {
          counts[pref] = (counts[pref] || 0) + 1;
          break;
        }
      }
    });

    return {
      visitedCounts: counts,
      totalVisitedPrefs: Object.keys(counts).length,
    };
  }, [posts]);

  const percentage = Math.round((totalVisitedPrefs / 47) * 100);

  const title = isTabireco ? '日本全国旅マップ' : '全国グルメ制覇マップ';
  const subtitle = isTabireco ? '全国47都道府県の旅・名所・温泉を巡ろう！' : '全国47都道府県の美味しいお店を開拓！';
  const metricLabel = isTabireco ? '踏破' : '制覇';

  const themeGradient = isTabireco
    ? 'from-emerald-500 to-teal-600'
    : 'from-orange-500 to-rose-500';

  return (
    <section className="px-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
          isTabireco ? 'bg-emerald-500' : 'bg-orange-500'
        }`}>
          <Map size={13} />
        </div>
        <h2 className="text-[15px] font-black text-gray-800">{title}</h2>
        <span className="text-[10px] text-gray-400 font-bold ml-1">{metricLabel}: {totalVisitedPrefs}/47</span>
      </div>

      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
        {/* 進捗ゲージ */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Trophy size={16} className={isTabireco ? 'text-emerald-500' : 'text-amber-500'} />
              <span className="text-[14px] font-black text-gray-800">
                {metricLabel}率: <strong className="text-[18px]">{percentage}%</strong>
              </span>
            </div>
            <span className="text-[11px] font-bold text-gray-500">
              {totalVisitedPrefs} / 47 都道府県
            </span>
          </div>

          <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${themeGradient} transition-all duration-1000`}
              style={{ width: `${Math.max(percentage > 0 ? 5 : 0, percentage)}%` }}
            />
          </div>
        </div>

        {/* 8大地方の達成状況 */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {REGIONS.map(region => {
            const regionVisitedCount = region.prefectures.filter(p => visitedCounts[p] > 0).length;
            const isAllVisited = regionVisitedCount === region.prefectures.length;
            const hasAnyVisited = regionVisitedCount > 0;

            return (
              <div
                key={region.name}
                className={`p-2 rounded-xl text-center border transition-all ${
                  isAllVisited
                    ? isTabireco
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                    : hasAnyVisited
                    ? 'bg-gray-50 border-gray-200 text-gray-800'
                    : 'bg-gray-50/50 border-gray-100 text-gray-400'
                }`}
              >
                <p className="text-[10px] font-bold truncate leading-tight">{region.name}</p>
                <p className="text-[11px] font-black mt-0.5">
                  {regionVisitedCount}/{region.prefectures.length}
                </p>
              </div>
            );
          })}
        </div>

        {/* 都道府県一覧アコーディオン */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              {REGIONS.map(region => (
                <div key={region.name}>
                  <div className="text-[11px] font-black text-gray-500 mb-1.5">{region.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {region.prefectures.map(pref => {
                      const count = visitedCounts[pref] || 0;
                      const isVisited = count > 0;
                      const shortName = pref.replace(/[都道府県]$/, '');

                      return (
                        <Link
                          key={pref}
                          href={`/posts?keyword=${encodeURIComponent(shortName)}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                            isVisited
                              ? isTabireco
                                ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                : 'bg-orange-500 text-white shadow-sm hover:bg-orange-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {isVisited && <Check size={10} strokeWidth={3} />}
                          <span>{shortName}</span>
                          {count > 1 && <span className="opacity-80 text-[8px]">({count})</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 展開トグルボタン */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <span>{isExpanded ? '都道府県リストを閉じる' : '47都道府県の制覇状況をすべて見る'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </section>
  );
}
