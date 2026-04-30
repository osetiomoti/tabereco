'use client';

export function PostCardSkeleton({ layout = 'vertical' }: { layout?: 'vertical' | 'horizontal' | 'compact' }) {
  if (layout === 'horizontal') {
    return (
      <div className="group block mb-4">
        <div className="relative flex bg-white rounded-[2rem] p-4 border border-gray-100 shadow-sm animate-pulse">
          {/* 左側: 写真プレースホルダー */}
          <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] bg-gray-100" />
          
          {/* 右側: 情報 */}
          <div className="flex-1 ml-5 py-1 flex flex-col justify-between min-w-0">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded-md w-3/4" />
              <div className="h-3 bg-gray-100 rounded-md w-1/2" />
              <div className="h-3 bg-gray-50 rounded-md w-1/3" />
            </div>
            
            <div className="flex items-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-2 h-2 rounded-full bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className="block h-full animate-pulse">
        <div className="h-full rounded-[2rem] overflow-hidden bg-white border border-gray-100 shadow-sm">
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-100" />
          <div className="p-4 flex flex-col h-[100px] justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-full" />
              <div className="h-4 bg-gray-200 rounded-md w-2/3" />
            </div>
            <div className="h-3 bg-gray-100 rounded-md w-1/2 mt-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Vertical (Feed) Layout Skeleton
  return (
    <div className="bg-white mb-6 pb-8 border-b-8 border-gray-50/50 animate-pulse">
      {/* Header: User Info */}
      <div className="px-4 flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-100" />
          <div className="w-24 h-4 bg-gray-200 rounded-md" />
        </div>
        <div className="w-20 h-4 bg-gray-100 rounded-md" />
      </div>

      {/* Title / Store Name */}
      <div className="px-4 mb-4 space-y-2">
        <div className="h-5 bg-gray-200 rounded-md w-3/4" />
        <div className="h-4 bg-gray-100 rounded-md w-1/2" />
      </div>

      {/* Image Placeholder */}
      <div className="relative bg-gray-50 aspect-[4/5] w-full mt-1" />

      {/* Details Below Image */}
      <div className="px-4 mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-6 bg-gray-200 rounded-md" />
        </div>
        <div className="h-16 bg-gray-50 rounded-xl w-full" />
        <div className="flex gap-2">
          <div className="w-16 h-6 bg-gray-100 rounded-md" />
          <div className="w-20 h-6 bg-gray-100 rounded-md" />
        </div>
      </div>
    </div>
  );
}
