'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, UtensilsCrossed, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, getDay, isToday, addDays, startOfWeek, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import useSWR from 'swr';
import { getPosts } from '@/lib/api/posts';
import { getImageUrl } from '@/lib/image';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const { data: postsData, isLoading: loading } = useSWR('/api/posts', () => getPosts(), {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const posts = postsData || [];

  // 安全に月を切り替え、選択日を切り替え先の月の適切な日に調整する
  const changeMonthSafe = (targetMonth: Date) => {
    const targetDay = selectedDate.getDate();
    const lastDay = endOfMonth(targetMonth).getDate();
    const newDate = new Date(targetMonth);
    newDate.setDate(Math.min(targetDay, lastDay));
    setSelectedDate(newDate);
    setCurrentDate(targetMonth);
  };

  const nextMonth = () => changeMonthSafe(addMonths(currentDate, 1));
  const prevMonth = () => changeMonthSafe(subMonths(currentDate, 1));

  // 常に42日分（6週間）のカレンダーを表示する
  const monthStart = startOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const daysInMonth = Array.from({ length: 42 }).map((_, i) => addDays(calendarStart, i));

  const selectedPosts = posts.filter(p => p.visited_at && isSameDay(new Date(p.visited_at), selectedDate));

  return (
    <div className="min-h-screen bg-white pb-32 font-sans">
      
      {/* 1. Header with Gradient */}
      <div className="bg-gradient-to-r from-pink-400 via-pink-400 to-orange-300 rounded-b-[2rem] pt-10 pb-5 px-4 shadow-sm relative z-10">
        {/* 表示切替ピル */}
        <div className="flex bg-black/15 p-0.5 rounded-xl backdrop-blur-sm w-fit mx-auto mb-4 border border-white/20">
          <Link
            href="/stats"
            className="px-3 py-1 text-[11px] font-black rounded-[9px] text-white/80 hover:text-white transition-all duration-200"
          >
            グラフ
          </Link>
          <div className="px-3 py-1 text-[11px] font-black rounded-[9px] bg-white text-gray-900 shadow-xs">
            カレンダー
          </div>
        </div>

        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={prevMonth} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={() => setIsMonthPickerOpen(true)}
            className="text-xl font-bold text-white tracking-wide flex items-center gap-1 active:scale-95 transition-all"
          >
            {format(currentDate, 'yyyy年M月', { locale: ja })}
            <ChevronDown size={16} className="opacity-80 ml-1" />
          </button>

          <button onClick={nextMonth} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <main className="max-w-2xl mx-auto animate-in fade-in duration-700">
        
        {/* 2. Calendar Grid */}
        <div className="bg-white">
          <div className="grid grid-cols-7 border-b border-gray-100 pb-2 pt-4">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <div key={d} className={`text-center text-[12px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-600'}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-gray-100">
            {daysInMonth.map((date) => {
              const dayPosts = posts.filter(p => p.visited_at && isSameDay(new Date(p.visited_at), date));
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const firstImg = dayPosts[0]?.image_urls?.[0] || dayPosts[0]?.image_url;
              const hasImage = isCurrentMonth && dayPosts.length > 0 && !!firstImg;
              const dIndex = getDay(date);

              // 曜日ごとの色
              let textColorClass = 'text-gray-800';
              if (dIndex === 0) textColorClass = 'text-red-500';
              if (dIndex === 6) textColorClass = 'text-blue-500';
              if (!isCurrentMonth) textColorClass = 'text-transparent'; // 前後の月は日付を隠す（画像の通り）

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    if (!isCurrentMonth) {
                      setCurrentDate(startOfMonth(date));
                    }
                  }}
                  className={`relative aspect-[3/4] flex flex-col items-center justify-between py-2 border-r border-b border-gray-100 transition-all ${!isCurrentMonth ? 'pointer-events-none' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                >
                  {/* Thumbnail Image */}
                  {hasImage && isCurrentMonth && (
                    <div className="absolute inset-1 rounded-2xl overflow-hidden z-0 shadow-sm border border-black/5">
                       <Image src={getImageUrl(firstImg)} alt="" fill className="object-cover opacity-90" />
                       <div className="absolute inset-0 bg-white/30" />
                    </div>
                  )}

                  {/* Date Number */}
                  {isCurrentMonth && (
                    <div className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-full mt-1 ${isSelected ? 'bg-pink-400 text-white' : ''}`}>
                      <span className={`text-[14px] font-bold ${isSelected ? 'text-white' : textColorClass}`} style={hasImage && !isSelected ? { textShadow: '0 0 10px white, 0 0 10px white' } : {}}>
                        {format(date, 'd')}
                      </span>
                    </div>
                  )}
                  
                  {/* Indicator Dot */}
                  <div className="relative z-10 h-3 flex items-center justify-center mb-1">
                    {dayPosts.length > 0 && isCurrentMonth && (
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_2px_white]" />
                    )}
                  </div>
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
            {loading ? (
              <div className="text-gray-400 font-bold text-sm">読み込み中...</div>
            ) : selectedPosts.length > 0 ? (
              <div className="w-full space-y-4">
                {selectedPosts.map(post => (
                  <Link 
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:translate-x-1 transition-all"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {post.image_url ? (
                        <Image src={getImageUrl(post.image_url)} alt="" fill className="object-cover" />
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

      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        currentDate={currentDate}
        onSelect={(newDate) => {
          changeMonthSafe(newDate);
        }}
      />
    </div>
  );
}
