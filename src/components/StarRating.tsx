import { Star, Minus, Plus } from 'lucide-react';

const STARS = [1, 2, 3, 4, 5];

// ─── 星コンポーネント（0.1刻みの塗り率対応） ──────────────────

function StarIcon({ fillPercent, size }: { fillPercent: number; size: number }) {
  const clampedPct = Math.max(0, Math.min(100, Math.round(fillPercent * 100)));
  if (clampedPct === 0) {
    return <Star size={size} className="text-gray-200" />;
  }
  if (clampedPct >= 100) {
    return <Star size={size} className="text-yellow-400 fill-yellow-400" />;
  }
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Star size={size} className="text-gray-200 absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${clampedPct}%` }}>
        <Star size={size} className="text-yellow-400 fill-yellow-400" />
      </div>
    </div>
  );
}

// ─── 表示専用（0.1刻み） ─────────────────────────────────

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
        const fillPercent = Math.max(0, Math.min(1, rating - (s - 1)));
        return (
          <StarIcon key={s} fillPercent={fillPercent} size={iconSize} />
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

// ─── 入力可能（星クリック=0.5刻み、±ボタン=0.1刻み） ─────────────────────────────────

type InputProps = {
  value: number;
  onChange: (rating: number) => void;
};

export function StarInput({ value, onChange }: InputProps) {
  const clamp = (v: number) => Math.round(Math.max(0.5, Math.min(5, v)) * 10) / 10;

  return (
    <div className="flex items-center gap-3">
      {/* Stars: click for 0.5 step */}
      <div className="flex gap-1">
        {STARS.map((s) => {
          const isFull = s <= value;
          const isHalf = !isFull && (s - 0.5) <= value;

          return (
            <div key={s} className="flex relative">
              {/* Left half → 0.5 */}
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
              {/* Right half → 1.0 */}
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
      </div>

      {/* − 0.1 */}
      <button
        type="button"
        onClick={() => onChange(clamp(value - 0.1))}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 transition-all shrink-0"
      >
        <Minus size={14} strokeWidth={3} className="text-gray-500" />
      </button>

      {/* Score */}
      <span className="text-3xl font-black text-[#ff6b95] min-w-[3.5rem] text-center drop-shadow-sm">
        {value.toFixed(1)}
      </span>

      {/* + 0.1 */}
      <button
        type="button"
        onClick={() => onChange(clamp(value + 0.1))}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 transition-all shrink-0"
      >
        <Plus size={14} strokeWidth={3} className="text-gray-500" />
      </button>
    </div>
  );
}
