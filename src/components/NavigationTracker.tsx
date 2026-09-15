'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordNavigation } from '@/lib/navigationHistory';

export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    recordNavigation(fullPath);
  }, [pathname, searchParams]);

  return null;
}
