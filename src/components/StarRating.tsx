import { Star } from 'lucide-react';

const STARS = [1, 2, 3, 4, 5];

// ─── カスタム星コンポーネント ──────────────────

function StarIcon({ fill, half, size }: { fill: boolean; half?: boolean; size: number }) {
  if (half) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background (Empty) */}
        <Star size={size} className="text-gray-200 absolute inset-0" />
        {/* Foreground (Half Filled) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
          <Star size={size} className="text-yellow-400 fill-yellow-400" />
        </div>
      </div>
    );
  }
  return (
    <Star 
      size={size} 
      className={`${fill ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
    />
  );
}

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
          <StarIcon key={s} fill={isFull} half={isHalf} size={iconSize} />
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
    <div className="flex gap-1">
      {STARS.map((s) => {
        const isFull = s <= value;
        const isHalf = !isFull && (s - 0.5) <= value;
        
        return (
          <div key={s} className="flex relative">
            {/* Left half (0.5) */}
            <button
              type="button"
              onClick={() => onChange(s - 0.5)}
              className="w-5 h-10 overflow-hidden transition-all active:scale-90"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <Star 
                  size={32} 
                  className={`${isFull || isHalf ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                />
              </div>
            </button>
            {/* Right half (1.0) */}
            <button
              type="button"
              onClick={() => onChange(s)}
              className="w-5 h-10 overflow-hidden transition-all active:scale-90"
            >
              <div className="w-10 h-10 flex items-center justify-center -translate-x-5">
                <Star 
                  size={32} 
                  className={`${isFull ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                />
              </div>
            </button>
          </div>
        );
      })}
      <div className="ml-2 flex items-center">
        <span className="text-3xl font-black text-[#ff6b95] min-w-[3.5rem] text-center drop-shadow-sm">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
