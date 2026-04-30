import { Star, StarHalf } from 'lucide-react';

const STARS = [1, 2, 3, 4, 5];

// ─── 表示専用 ─────────────────────────────────

type DisplayProps = {
  rating: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export function StarDisplay({ rating, size = 'md' }: DisplayProps) {
  const sizeMap = { xs: 12, sm: 14, md: 18, lg: 24 };
  const iconSize = sizeMap[size];
  
  return (
    <div className="flex gap-0.5 items-center">
      {STARS.map((s) => {
        const isFull = s <= rating;
        const isHalf = !isFull && (s - 0.5) <= rating;
        
        return (
          <div key={s} className="relative">
            {isHalf ? (
              <StarHalf size={iconSize} className="text-yellow-400 fill-yellow-400" />
            ) : isFull ? (
              <Star size={iconSize} className="text-yellow-400 fill-yellow-400" />
            ) : (
              <Star size={iconSize} className="text-gray-200" />
            )}
          </div>
        );
      })}
      {rating > 0 && (
        <span className="ml-1.5 text-[11px] font-black text-gray-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── 入力可能 ─────────────────────────────────

type InputProps = {
  value: number;
  onChange: (rating: number) => void;
};

export function StarInput({ value, onChange }: InputProps) {
  return (
    <div className="flex gap-1.5">
      {STARS.map((s) => {
        const isFull = s <= value;
        const isHalf = !isFull && (s - 0.5) <= value;
        
        return (
          <div key={s} className="flex group relative">
            {/* Left half (0.5) */}
            <button
              type="button"
              onClick={() => onChange(s - 0.5)}
              className={`w-5 h-10 flex items-center justify-end overflow-hidden transition-all active:scale-90`}
            >
              <Star 
                size={32} 
                className={`min-w-[40px] -translate-x-[0px] ${
                  isFull || isHalf ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                }`} 
              />
            </button>
            {/* Right half (1.0) */}
            <button
              type="button"
              onClick={() => onChange(s)}
              className={`w-5 h-10 flex items-center justify-start overflow-hidden transition-all active:scale-90`}
            >
              <Star 
                size={32} 
                className={`min-w-[40px] -translate-x-[20px] ${
                  isFull ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                }`} 
              />
            </button>
          </div>
        );
      })}
      <div className="ml-2 flex items-center">
        <span className="text-2xl font-black text-[#ff6b95] min-w-[3rem] text-center">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
