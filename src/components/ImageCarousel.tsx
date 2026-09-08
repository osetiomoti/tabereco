'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { getImageUrl } from '@/lib/image';

type Props = {
  images: string[];
  alt?: string;
};

export function ImageCarousel({ images, alt = '' }: Props) {
  const resolvedImages = images.map(getImageUrl);
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const startXRef = useRef<number | null>(null);
  const totalImages = resolvedImages.length;

  // Pinch-to-zoom state for fullscreen
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const lastDistRef = useRef<number | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);

  // Reset zoom when image changes or modal closes
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [current, isFullscreen]);

  if (totalImages === 0) return null;

  const prev = () => setCurrent(c => (c - 1 + totalImages) % totalImages);
  const next = () => setCurrent(c => (c + 1) % totalImages);

  // Fullscreen touch handlers (with pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startXRef.current = e.touches[0].clientX;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isPinchingRef.current = false;
    } else if (e.touches.length === 2) {
      isPinchingRef.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.sqrt(dx * dx + dy * dy);
      startXRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastDistRef.current;
      lastDistRef.current = dist;
      setScale(s => Math.min(5, Math.max(1, s * delta)));
    } else if (e.touches.length === 1 && scale > 1 && lastTouchRef.current) {
      e.preventDefault();
      const mx = e.touches[0].clientX - lastTouchRef.current.x;
      const my = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTranslateX(x => x + mx);
      setTranslateY(y => y + my);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPinchingRef.current && startXRef.current !== null && scale <= 1) {
      const dx = e.changedTouches[0].clientX - startXRef.current;
      if (dx < -40) next();
      else if (dx > 40) prev();
    }
    if (e.touches.length < 2) {
      lastDistRef.current = null;
      isPinchingRef.current = false;
    }
    if (scale <= 1) {
      setTranslateX(0);
      setTranslateY(0);
    }
  };

  // Simple touch handler for non-fullscreen (swipe only)
  const handleSimpleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleSimpleTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    startXRef.current = null;
  };

  return (
    <>
      {/* Main carousel - object-contain to show full image without cropping */}
      <div
        className="relative w-full bg-black overflow-hidden select-none"
        onTouchStart={handleSimpleTouchStart}
        onTouchEnd={handleSimpleTouchEnd}
      >
        {/* Sliding strip: each image is 100vw wide, strip is totalImages * 100vw */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {resolvedImages.map((src, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 flex items-center justify-center"
              onClick={() => setIsFullscreen(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="w-full max-h-[70vh] object-contain cursor-zoom-in"
                style={{ display: 'block' }}
              />
            </div>
          ))}
        </div>

        {/* Prev / Next buttons */}
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

        {/* Zoom / fullscreen button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full z-10 flex items-center gap-1.5 hover:bg-black/70 transition-colors"
        >
          <ZoomIn size={12} />
          拡大
        </button>

        {/* Dots indicator */}
        {totalImages > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/20 backdrop-blur-sm rounded-full z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${i === current ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {/* Page count */}
        {totalImages > 1 && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10 pointer-events-none">
            {current + 1} / {totalImages}
          </div>
        )}
      </div>

      {/* Fullscreen Modal with pinch-to-zoom */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex justify-between items-center p-4 z-10 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0">
            {totalImages > 1 ? (
              <div className="text-white text-sm font-bold">
                {current + 1} / {totalImages}
              </div>
            ) : <div />}
            <button
              onClick={() => setIsFullscreen(false)}
              className="ml-auto w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* Image area */}
          <div
            className="flex-1 relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: scale > 1 ? 'none' : 'pan-x' }}
          >
            {/* Single image shown at a time in fullscreen, transformed for zoom/pan */}
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
                transition: isPinchingRef.current ? 'none' : 'transform 0.1s ease-out',
              }}
              onDoubleClick={() => {
                if (scale > 1) { setScale(1); setTranslateX(0); setTranslateY(0); }
                else { setScale(2); }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedImages[current]}
                alt={`${alt} ${current + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' }}
              />
            </div>

            {/* Prev/Next in fullscreen (only when not zoomed) */}
            {current > 0 && scale <= 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all"
              >
                <ChevronLeft size={28} />
              </button>
            )}
            {current < totalImages - 1 && scale <= 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all"
              >
                <ChevronRight size={28} />
              </button>
            )}

            {/* Hint text */}
            {scale <= 1 && totalImages > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white/70 text-[11px] font-medium px-3 py-1.5 rounded-full pointer-events-none">
                スワイプで切替 · ダブルタップで拡大
              </div>
            )}
            {scale <= 1 && totalImages === 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white/70 text-[11px] font-medium px-3 py-1.5 rounded-full pointer-events-none">
                ダブルタップまたはピンチで拡大
              </div>
            )}
            {scale > 1 && (
              <button
                onClick={() => { setScale(1); setTranslateX(0); setTranslateY(0); }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white text-[12px] font-bold px-4 py-2 rounded-full"
              >
                元のサイズに戻す
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
