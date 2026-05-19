'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, getDay, isToday, addDays, startOfWeek, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import useSWR from 'swr';
import { getPosts } from '@/lib/api/posts';

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
          
          <button 
            onClick={() => setIsMonthPickerOpen(true)}
            className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
          >
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
            <span className="text-[10px] text-gray-400">▼</span>
          </button>

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
            {daysInMonth.map((date) => {
              const dayPosts = posts.filter(p => isSameDay(new Date(p.visited_at), date));
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const hasImage = isCurrentMonth && dayPosts.length > 0 && !!dayPosts[0].image_url;
              const dIndex = getDay(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    if (!isCurrentMonth) {
                      setCurrentDate(startOfMonth(date));
                    }
                  }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all overflow-hidden ${
                    isSelected 
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 z-10' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-[15px] font-black z-10 ${
                    isSelected
                      ? 'text-white'
                      : !isCurrentMonth
                        ? 'text-gray-200'
                        : dIndex === 0
                          ? 'text-red-400'
                          : dIndex === 6
                            ? 'text-blue-500'
                            : 'text-gray-800'
                  }`} style={hasImage && !isSelected ? { textShadow: '0 1px 4px rgba(255,255,255,0.9), 0 0 10px white' } : {}}>
                    {format(date, 'd')}
                  </span>
                  
                  {/* Indicators */}
                  <div className="mt-0.5 flex gap-0.5 h-1 z-10">
                    {dayPosts.length > 0 && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#e35688]'} shadow-[0_0_4px_white]`} />
                    )}
                  </div>

                  {/* Thumbnail Image */}
                  {hasImage && (
                    <div className="absolute inset-0 -z-10">
                       <Image src={dayPosts[0].image_url!} alt="" fill className="object-cover" />
                       <div className={`absolute inset-0 ${isSelected ? 'bg-orange-500/40' : 'bg-white/20'}`} />
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
