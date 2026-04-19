'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { getPosts } from '@/lib/api/posts';
import type { Post } from '@/lib/types';
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getPosts({});
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const startPadding = Array.from({ length: getDay(daysInMonth[0]) });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const selectedPosts = posts.filter(p => isSameDay(new Date(p.visited_at), selectedDate));

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Header title="マイカレンダー" />
      
      <main className="max-w-2xl mx-auto animate-in fade-in duration-700">
        {/* 1. Monthly Switcher */}
        <div className="flex items-center justify-center py-6 gap-8">
          <button onClick={prevMonth} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm bg-white/50 border border-gray-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm bg-white/50 border border-gray-100">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 2. Calendar Grid */}
        <div className="bg-white mx-4 rounded-[2.5rem] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="grid grid-cols-7 mb-4">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-300'}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {startPadding.map((_, i) => <div key={`pad-${i}`} />)}
            {daysInMonth.map((date) => {
              const dayPosts = posts.filter(p => isSameDay(new Date(p.visited_at), date));
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSelected ? 'ring-2 ring-orange-500 z-10' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-bold ${
                    isSelected ? 'text-orange-600' : isTodayDate ? 'text-orange-500' : 'text-gray-900'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  
                  {/* Thumbnail / Indicators */}
                  <div className="mt-0.5 flex gap-0.5 h-1">
                    {dayPosts.length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-orange-400" />
                    )}
                  </div>

                  {/* Thumbnail Image (Premium feel if available) */}
                  {dayPosts.length > 0 && dayPosts[0].image_url && (
                    <div className="absolute inset-0.5 rounded-lg overflow-hidden -z-10 opacity-20">
                       <Image src={dayPosts[0].image_url} alt="" fill className="object-cover" />
                    </div>
                  )}
                  {dayPosts.length > 0 && dayPosts[0].image_url && isSelected && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden border border-orange-500">
                       <Image src={dayPosts[0].image_url} alt="" fill className="object-cover" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Date Details (Screenshot style) */}
        <section className="mt-10">
          <div className="bg-[#a68c7e] text-white px-6 py-4 text-sm font-black flex items-center gap-3">
            <CalendarIcon size={18} />
            {format(selectedDate, 'yyyy年 M月 d日 EEEE', { locale: ja })}
          </div>

          <div className="p-8 bg-white/50 backdrop-blur-sm border-b border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
            {selectedPosts.length > 0 ? (
              <div className="w-full space-y-4">
                {selectedPosts.map(post => (
                  <Link 
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:translate-x-1 transition-all"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {post.image_url ? (
                        <Image src={post.image_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <UtensilsCrossed size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 line-clamp-1">{post.title}</h3>
                      <p className="text-xs text-gray-400 font-bold">{post.store_name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                  <UtensilsCrossed size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 font-bold">この日は記録がまだありません</p>
                  <p className="text-xs text-gray-300 font-bold">行ったお店を記録しよう！</p>
                </div>
              </>
            )}

            <Link
              href={`/posts/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
              className="mt-4 px-8 py-3.5 bg-[#5d4d44] text-white rounded-2xl font-black text-sm shadow-xl shadow-gray-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={18} strokeWidth={3} />
              記録を追加する
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
