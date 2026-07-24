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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const startXRef = useRef<number | null>(null);
  const totalImages = images.length;

  if (totalImages === 0) return null;
  if (totalImages === 1) {
    return (
      <>
        <div className="relative w-full aspect-square cursor-pointer" onClick={() => setIsFullscreen(true)}>
          <Image src={images[0]} alt={alt} fill className="object-cover" priority />
        </div>

        {/* Fullscreen Modal (Single Image) */}
        {isFullscreen && (
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-200" onClick={() => setIsFullscreen(false)}>
            <div className="absolute top-4 right-4 z-10">
              <button
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 w-full h-full p-4 flex items-center justify-center overflow-hidden touch-pan-x touch-pan-y" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={alt} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        )}
      </>
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
      className="relative w-full aspect-square overflow-hidden select-none cursor-pointer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => setIsFullscreen(true)}
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
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {current < totalImages - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
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
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10 pointer-events-none">
        {current + 1} / {totalImages}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white text-sm font-bold">
              {current + 1} / {totalImages}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div 
            className="flex-1 relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${current * 100}%)`, width: `${totalImages * 100}%` }}
            >
              {images.map((src, i) => (
                <div key={i} className="relative flex-shrink-0 h-full flex items-center justify-center" style={{ width: `${100 / totalImages}%` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${alt} ${i + 1}`} className="w-full max-h-full object-contain" />
                </div>
              ))}
            </div>

            {current > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hidden sm:flex"
              >
                <ChevronLeft size={28} />
              </button>
            )}
            {current < totalImages - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hidden sm:flex"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
