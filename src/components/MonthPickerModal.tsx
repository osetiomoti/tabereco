'use client';

import { useState, useRef, useEffect, UIEvent } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onSelect: (newDate: Date) => void;
};

export function MonthPickerModal({ isOpen, onClose, currentDate, onSelect }: Props) {
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const ITEM_HEIGHT = 40; // 40px per item
  const years = Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(currentDate.getFullYear());
      setSelectedMonth(currentDate.getMonth());
      
      // Initial scroll position
      setTimeout(() => {
        if (yearRef.current) {
          const yIndex = years.indexOf(currentDate.getFullYear());
          yearRef.current.scrollTop = yIndex * ITEM_HEIGHT;
        }
        if (monthRef.current) {
          monthRef.current.scrollTop = currentDate.getMonth() * ITEM_HEIGHT;
        }
      }, 50);
    }
  }, [isOpen, currentDate, years]);

  const handleYearScroll = (e: UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT);
    const validIndex = Math.max(0, Math.min(index, years.length - 1));
    setSelectedYear(years[validIndex]);
  };

  const handleMonthScroll = (e: UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT);
    const validIndex = Math.max(0, Math.min(index, months.length - 1));
    setSelectedMonth(months[validIndex]);
  };

  const handleApply = () => {
    onSelect(new Date(selectedYear, selectedMonth, 1));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <h3 className="text-center font-black text-gray-900 mb-6">年月を選択</h3>
        
        <div className="relative flex h-[200px] overflow-hidden rounded-2xl bg-gray-50/50">
          {/* Selection Highlight bar in the center */}
          <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-gray-100 rounded-xl pointer-events-none" />

          {/* Years Wheel */}
          <div 
            ref={yearRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory hide-scrollbar scroll-smooth"
            onScroll={handleYearScroll}
          >
            <div className="h-[80px]" /> {/* Top padding */}
            {years.map(y => (
              <div 
                key={y} 
                className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-colors ${selectedYear === y ? 'text-gray-900' : 'text-gray-300'}`}
              >
                {y}年
              </div>
            ))}
            <div className="h-[80px]" /> {/* Bottom padding */}
          </div>

          {/* Months Wheel */}
          <div 
            ref={monthRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory hide-scrollbar scroll-smooth"
            onScroll={handleMonthScroll}
          >
            <div className="h-[80px]" /> {/* Top padding */}
            {months.map(m => (
              <div 
                key={m} 
                className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-colors ${selectedMonth === m ? 'text-gray-900' : 'text-gray-300'}`}
              >
                {m + 1}月
              </div>
            ))}
            <div className="h-[80px]" /> {/* Bottom padding */}
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-colors"
          >
            キャンセル
          </button>
          <button 
            type="button" 
            onClick={handleApply}
            className="flex-1 py-3.5 bg-[#de7287] hover:bg-[#c96175] text-white font-bold rounded-2xl shadow-lg shadow-[#de7287]/30 transition-all"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
}
