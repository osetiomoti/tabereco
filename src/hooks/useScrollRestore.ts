'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SCROLL_DEBOUNCE_MS = 200;

export function useScrollRestore(key: string) {
  const pathname = usePathname();
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load and apply saved scroll position on mount
  useEffect(() => {
    // Only attempt to restore once on mount for the specific route
    const savedPos = sessionStorage.getItem(`scroll_${key}`);
    if (savedPos) {
      // Use requestAnimationFrame and slight delay to ensure DOM is ready
      const restore = () => {
        window.scrollTo({
          top: parseInt(savedPos, 10),
          behavior: 'instant'
        });
      };
      
      // Try restoring immediately, and then again after a short delay
      // to handle cases where data fetches or layout shifts occur
      requestAnimationFrame(restore);
      const timer = setTimeout(restore, 100);
      const timer2 = setTimeout(restore, 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [key]);

  // Save scroll position when it changes
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        sessionStorage.setItem(`scroll_${key}`, window.scrollY.toString());
      }, SCROLL_DEBOUNCE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [key]);
}
