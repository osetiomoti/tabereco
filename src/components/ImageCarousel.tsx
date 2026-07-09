'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  alt?: string;
};

export function ImageCarousel({ images, alt = '' }: Props) {
  const [current, setCurrent] = useState(0);
  const startXRef = useRef<number | null>(null);
  const totalImages = images.length;

  if (totalImages === 0) return null;
  if (totalImages === 1) {
    return (
      <div className="relative w-full aspect-square">
        <Image src={images[0]} alt={alt} fill className="object-cover" priority />
      </div>
    );
  }

  const prev = () => setCurrent(c => (c - 1 + totalImages) % totalImages);
  const next = () => setCurrent(c => (c + 1) % totalImages);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    startXRef.current = null;
  };

  return (
    <div
      className="relative w-full aspect-square overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)`, width: `${totalImages * 100}%` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative flex-shrink-0" style={{ width: `${100 / totalImages}%` }}>
            <Image src={src} alt={`${alt} ${i + 1}`} fill className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>

      {/* Prev / Next buttons (only on non-touch for desktop) */}
      {current > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {current < totalImages - 1 && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Dots indicator */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all ${
              i === current ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Page count */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10">
        {current + 1} / {totalImages}
      </div>
    </div>
  );
}
