'use client';

const STARS = [1, 2, 3, 4, 5];

// ─── 表示専用 ─────────────────────────────────

type DisplayProps = {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
};

export function StarDisplay({ rating, size = 'md' }: DisplayProps) {
  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }[size];
  return (
    <div className="flex gap-0.5">
      {STARS.map((s) => (
        <span key={s} className={`${sizeClass} ${s <= rating ? 'text-yellow-500' : 'text-gray-200'}`}>
          ★
        </span>
      ))}
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
    <div className="flex gap-2">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-4xl transition-all duration-200 hover:scale-110 active:scale-90 ${
            s <= value ? 'text-yellow-500 drop-shadow-sm' : 'text-gray-200 hover:text-gray-400'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
