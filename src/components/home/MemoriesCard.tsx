'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Sparkles, Star, MapPin, ChevronRight, Clock } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';
import { getImageUrl } from '@/lib/image';

type Props = {
  posts: Post[];
};

type MemoryMatch = {
  post: Post;
  badge: string;
  diffText: string;
  visitedDateStr: string;
};

export function MemoriesCard({ posts }: Props) {
  const { appType } = useAppType();
  const isTabireco = appType === 'tabireco';

  const memory = useMemo<MemoryMatch | null>(() => {
    if (!posts || posts.length === 0) return null;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed
    const curDay = now.getDate();

    let exactMatch: MemoryMatch | null = null;
    let approxMatch: MemoryMatch | null = null;
    let monthMatch: MemoryMatch | null = null;

    for (const p of posts) {
      const dateVal = p.visited_at ? new Date(p.visited_at) : new Date(p.created_at);
      if (isNaN(dateVal.getTime())) continue;

      const pYear = dateVal.getFullYear();
      const pMonth = dateVal.getMonth();
      const pDay = dateVal.getDate();

      const yearDiff = curYear - pYear;
      const dateFormatted = `${pYear}年${pMonth + 1}月${pDay}日`;

      // 1. Exact anniversary (1 or more years ago, same month & day)
      if (yearDiff >= 1 && pMonth === curMonth && pDay === curDay) {
        exactMatch = {
          post: p,
          badge: `${yearDiff}年前の今日`,
          diffText: dateFormatted,
          visitedDateStr: dateFormatted,
        };
        break; // Best possible match
      }

      // 2. Around this time last year (1 year ago, same month, within 4 days)
      if (yearDiff >= 1 && pMonth === curMonth && Math.abs(pDay - curDay) <= 4 && !approxMatch) {
        approxMatch = {
          post: p,
          badge: yearDiff === 1 ? '去年の今頃' : `${yearDiff}年前の今頃`,
          diffText: dateFormatted,
          visitedDateStr: dateFormatted,
        };
      }

      // 3. One month ago today
      if (yearDiff === 0 && curMonth - pMonth === 1 && pDay === curDay && !monthMatch) {
        monthMatch = {
          post: p,
          badge: '1ヶ月前の今日',
          diffText: dateFormatted,
          visitedDateStr: dateFormatted,
        };
      }
    }

    return exactMatch || approxMatch || monthMatch;
  }, [posts]);

  if (!memory) return null;

  const { post, badge, diffText } = memory;
  const imageSrc = post.image_url || post.image_urls?.[0];

  const sectionTitle = isTabireco ? '旅の思い出' : 'あの日のごちそう';
  const subtitle = isTabireco ? 'あの日の旅路を振り返る' : 'あの日の美味しさを振り返る';

  return (
    <section className="px-4 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
          isTabireco ? 'bg-emerald-500' : 'bg-rose-500'
        }`}>
          <Sparkles size={13} />
        </div>
        <h2 className="text-[15px] font-black text-gray-800">{sectionTitle}</h2>
        <span className="text-[10px] text-gray-400 font-bold ml-1">{subtitle}</span>
      </div>

      <Link
        href={`/posts/${post.id}`}
        className="block group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-[1.5px] shadow-md active:scale-[0.99] transition-all"
      >
        <div className="relative bg-white rounded-[23px] overflow-hidden">
          <div className="relative aspect-[16/9] w-full bg-gray-100 overflow-hidden">
            {imageSrc ? (
              <img
                src={getImageUrl(imageSrc)}
                alt={post.store_name || post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                <span className="text-4xl">📸</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* バッジ */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm">
              <Clock size={11} className="text-amber-300" />
              <span className="text-[11px] font-black tracking-wide text-amber-300">{badge}</span>
              <span className="text-[10px] text-white/80 font-bold">({diffText})</span>
            </div>

            {/* 評価 */}
            {post.rating && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white rounded-full px-2.5 py-1 border border-white/20">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-black">{post.rating.toFixed(1)}</span>
              </div>
            )}

            {/* 下部情報 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="text-[17px] font-black leading-tight drop-shadow-md truncate">
                {post.store_name || post.title}
              </h3>
              {post.address && (
                <p className="flex items-center gap-1 text-[11px] text-white/80 font-bold drop-shadow-sm mt-0.5 truncate">
                  <MapPin size={11} className="shrink-0 text-orange-300" />
                  {post.address}
                </p>
              )}
            </div>
          </div>

          {/* コメント抜粋 */}
          {post.comment && (
            <div className="px-4 py-2.5 bg-white flex items-center justify-between border-t border-gray-50">
              <p className="text-[11px] text-gray-500 font-medium truncate flex-1 pr-2">
                💬 {post.comment}
              </p>
              <div className="flex items-center text-[11px] font-bold text-orange-500 shrink-0">
                <span>振り返る</span>
                <ChevronRight size={14} />
              </div>
            </div>
          )}
        </div>
      </Link>
    </section>
  );
}
