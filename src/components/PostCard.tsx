'use client';

import type { Post } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, CheckCircle2, Calendar, Hash, User, MoreHorizontal, Star, MapPin, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Props = { 
  post: Post;
  layout?: 'vertical' | 'horizontal' | 'compact';
};

export function PostCard({ post, layout = 'vertical' }: Props) {
  const router = useRouter();
  if (layout === 'horizontal') {
    return (
      <Link href={`/posts/${post.id}`} className="group block mb-4">
        <div className="relative flex bg-white rounded-[2rem] p-4 border border-gray-100/60 shadow-sm hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98]">
          {/* 左側: 写真 */}
          {post.image_url ? (
            <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] overflow-hidden bg-gray-50 shadow-inner">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="128px"
              />
            </div>
          ) : (
            <div className="relative w-24 h-24 sm:w-28 sm:w-28 flex-shrink-0 rounded-[1.5rem] overflow-hidden bg-orange-50 flex items-center justify-center shadow-inner border border-orange-100/50">
              <span className="text-4xl opacity-50">🍽️</span>
            </div>
          )}

          {/* 右側: 情報 */}
          <div className="flex-1 ml-5 py-1 flex flex-col justify-between min-w-0">
            <div className="space-y-1.5 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-black text-gray-900 group-hover:text-orange-500 transition-colors leading-none truncate">
                  {post.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[11px] font-bold truncate max-w-[140px] opacity-70">
                  {post.store_name || '場所未指定'}
                </span>
                <span className="text-[10px] opacity-30">•</span>
                <span className="text-[10px] font-medium bg-gray-50 px-2 py-0.5 rounded-full">
                  {post.visited_at ? formatDate(typeof post.visited_at === 'string' ? post.visited_at : (post.visited_at as Date).toISOString()) : ''}
                </span>
              </div>
              {/* グループ表示 (Horizontal) */}
              {((post as any).__group_name || (post as any).__is_mine) && (
                <div className="flex items-center mt-1">
                  {(post as any).__is_mine ? (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 flex items-center gap-1 px-1.5 py-0.5 rounded-md">
                      👤 自分
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 flex items-center gap-1 px-1.5 py-0.5 rounded-md truncate max-w-[150px]">
                      👥 {(post as any).__group_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden relative">
                  <div 
                    className={`absolute inset-0 bg-yellow-400 transition-all duration-500 ${s <= (post.rating || 0) ? 'w-full' : 'w-0'}`} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 右側アクション */}
          <div className="flex flex-col justify-between items-end ml-2">
            <div className={`p-2 rounded-full transition-all ${post.is_favorite ? 'bg-pink-50 text-pink-500' : 'text-gray-100'}`}>
              <Heart size={20} className={post.is_favorite ? 'fill-pink-500' : ''} />
            </div>
            
            {post.status === 'visited' && (
              <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200 animate-in zoom-in">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  if (layout === 'compact') {
    return (
      <Link href={`/posts/${post.id}`} className="group block h-full">
        <div className="h-full rounded-[2rem] overflow-hidden bg-white border border-gray-100 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
            {post.image_url ? (
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, 260px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <span className="text-5xl opacity-40">🍽️</span>
              </div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {post.is_favorite && (
                <div className="bg-pink-500 text-white p-1.5 rounded-full shadow-lg">
                  <Heart size={14} className="fill-white" />
                </div>
              )}
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm border border-black/5">
              <Star size={12} className="fill-orange-500 text-orange-500" />
              <span className="text-gray-900 text-[11px] font-black">{post.rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>

          <div className="p-4 flex flex-col h-[100px]">
            <h3 className="font-extrabold text-gray-900 text-[14px] leading-snug mb-1 group-hover:text-orange-500 transition-colors line-clamp-2">
              {post.title}
            </h3>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded-md">
                {post.visited_at ? formatDate(typeof post.visited_at === 'string' ? post.visited_at : (post.visited_at as Date).toISOString()).replace(/-/g, '/') : ''}
              </span>
              {/* グループ表示 */}
              {((post as any).__group_name || (post as any).__is_mine) && (
                <div className="flex items-center justify-end">
                  {(post as any).__is_mine ? (
                    <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">👤 自分</span>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-0.5 truncate max-w-[80px]">
                      👥 {(post as any).__group_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // フィード型レイアウト (リニューアル版)
  const images = post.image_urls && post.image_urls.length > 0 ? post.image_urls : (post.image_url ? [post.image_url] : []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setCurrentImageIndex(newIndex);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Favorite clicked');
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!window.confirm('この記録を削除してもよろしいですか？（この操作は取り消せません）')) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('削除に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました。');
    }
  };

  // 確実に日付をパースして表示する
  let formattedDate = '';
  if (post.visited_at) {
    if (typeof post.visited_at === 'string') {
      formattedDate = post.visited_at.split('T')[0];
    } else if ((post.visited_at as any) instanceof Date) {
      formattedDate = (post.visited_at as any).toISOString().split('T')[0];
    }
  }

  // 自分自身の投稿かどうか（グループ投稿等で__is_mineがfalseになっている場合を除く）
  const isMine = (post as any).__is_mine !== false;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !post.is_favorite }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white mb-2 pb-4 border-b border-gray-100">
      <Link href={`/posts/${post.id}`} className="block group">
        {/* Header: User Info */}
        <div className="px-4 flex items-center justify-between mb-3 mt-3">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/mypage?userId=${post.user_id}`);
            }}
          >
            {post.user?.avatar_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative shadow-sm border border-gray-50">
                <Image src={post.user.avatar_url} alt={post.user.name || 'User'} fill className="object-cover" sizes="32px" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                <User size={16} />
              </div>
            )}
            <span className="font-bold text-gray-700 text-sm">{post.user?.name || '名無しさん'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Image Area (Compact Aspect) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-50">
          {images.length > 0 ? (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {images.map((img, idx) => (
                <div key={idx} className="relative w-full h-full flex-shrink-0 snap-center">
                  <Image
                    src={img}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-orange-50">
              <span className="text-4xl opacity-30">🍽️</span>
            </div>
          )}
          
          {/* Quick Stats Overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button 
              onClick={toggleFavorite}
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-all ${
                post.is_favorite 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/80 text-gray-400 hover:text-pink-500'
              }`}
            >
              <Heart size={18} className={post.is_favorite ? 'fill-white' : ''} />
            </button>
            {isMine && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="w-9 h-9 bg-white/80 backdrop-blur-md text-gray-600 rounded-full flex items-center justify-center shadow-lg hover:bg-white"
              >
                <MoreHorizontal size={18} />
              </button>
            )}
          </div>

          {isMenuOpen && (
            <div className="absolute top-14 right-3 w-36 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1">
              <Link 
                href={`/posts/${post.id}/edit`}
                className="block w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                編集する
              </Link>
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/20 backdrop-blur-sm rounded-full">
              {images.map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-black text-gray-900 truncate mb-0.5">{post.title}</h2>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 font-medium text-[12px] truncate flex items-center gap-1">
                  <MapPin size={10} className="text-orange-500" />
                  {post.store_name}
                </p>
                {(post.price_min != null || post.price_max != null) && (
                  <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    ¥{post.price_min?.toLocaleString() ?? ''}〜{post.price_max?.toLocaleString() ?? ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
              <Star size={12} className="fill-orange-500 text-orange-500" />
              <span className="text-orange-600 font-black text-[13px]">{post.rating?.toFixed(1)}</span>
            </div>
          </div>
          
          {/* Tags (Small) */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag.id} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{tag.name}</span>
              ))}
              {post.tags.length > 3 && <span className="text-[10px] text-gray-300">...</span>}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}


export function FilterChips({ 
  filters, 
  onRemove, 
  users, 
  groups,
  className 
}: { 
  filters?: any, 
  onRemove: (key: string | string[] | Record<string, any>) => void,
  users?: Array<{ id: string, name: string }>,
  groups?: Array<{ id: string, name: string }>,
  className?: string 
}) {
  if (!filters) return null;

  const primaryChips: Array<{ key: string, label: string, color: string, isRegistrant?: boolean, userId?: string, isGroup?: boolean, groupId?: string }> = [];
  const secondaryChips: Array<{ key: string, label: string, color: string, isTag?: boolean, tagValue?: string }> = [];
  
  const mode = filters.filterMode || 'group';

  // 1段目: グループ or 投稿者（全選択でも1つずつチップ）
  if (mode === 'group') {
    const allGroups = !filters.activeGroups || filters.activeGroups.length === 0 || filters.activeGroups.includes('all');
    if (allGroups) {
      // 全グループ → groups リストから1つずつチップ
      if (groups && groups.length > 0) {
        groups.forEach(group => {
          primaryChips.push({
            key: `group-${group.id}`,
            label: `👥 ${group.name}`,
            color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
            isGroup: true,
            groupId: group.id,
          });
        });
      } else {
        // グループ情報がまだ読み込まれていない場合
        primaryChips.push({ key: 'group-all', label: '👥 すべてのグループ', color: 'bg-indigo-50 text-indigo-500 border-indigo-100' });
      }
    } else {
      filters.activeGroups.forEach((groupId: string) => {
        const group = groups?.find(g => g.id === groupId);
        const name = group ? group.name : 'グループ';
        primaryChips.push({ 
          key: `group-${groupId}`, 
          label: `👥 ${name}`, 
          color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
          isGroup: true,
          groupId,
        });
      });
    }
  } else {
    const allSelected = !filters.registrantUserIds || filters.registrantUserIds.length === 0;
    if (allSelected) {
      // 全員 → users リストから1つずつチップ
      if (users && users.length > 0) {
        users.forEach(user => {
          primaryChips.push({
            key: `registrant-${user.id}`,
            label: `👤 ${user.name}`,
            color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
            isRegistrant: true,
            userId: user.id,
          });
        });
      } else {
        primaryChips.push({ key: 'member-all', label: '👤 全員', color: 'bg-indigo-50 text-indigo-500 border-indigo-100' });
      }
    } else {
      filters.registrantUserIds.forEach((userId: string) => {
        const user = users?.find((u: { id: string, name: string }) => u.id === userId);
        const name = user ? user.name : '投稿者';
        primaryChips.push({ 
          key: `registrant-${userId}`, 
          label: `👤 ${name}`, 
          color: 'bg-indigo-50 text-indigo-500 border-indigo-100',
          isRegistrant: true,
          userId,
        });
      });
    }
  }

  // 2段目: そのほか
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((t: string) => {
      secondaryChips.push({ key: `tag-${t}`, label: `#${t}`, color: 'bg-pink-50 text-pink-500 border-pink-100', isTag: true, tagValue: t });
    });
  }
  
  if (filters.period && filters.period !== 'all') {
    const periodMap: Record<string, string> = {
      this_month: '今月',
      last_3_months: '過去3ヶ月',
      this_year: '今年',
      last_year: '昨年',
    };
    secondaryChips.push({ key: 'period', label: `🗓️ ${periodMap[filters.period] || filters.period}`, color: 'bg-orange-50 text-orange-500 border-orange-100' });
  }
  if (filters.is_favorite) {
    secondaryChips.push({ key: 'is_favorite', label: '❤️ お気に入り', color: 'bg-red-50 text-red-500 border-red-100' });
  }
  if (filters.is_mine_only) {
    secondaryChips.push({ key: 'is_mine_only', label: '🔒 自分のみ', color: 'bg-gray-100 text-gray-600 border-gray-200' });
  }

  if (primaryChips.length === 0 && secondaryChips.length === 0) return null;

  const renderChip = (chip: any, onRemoveFn: () => void) => (
    <span 
      key={chip.key}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border shadow-sm shrink-0 ${chip.color} animate-in zoom-in`}
    >
      {chip.label}
      {(chip.key !== 'group-all' && chip.key !== 'member-all') && (
        <button 
          onClick={onRemoveFn} 
          className="hover:opacity-60 transition-opacity ml-1 flex items-center justify-center w-3 h-3"
        >
          <X size={10} strokeWidth={4} />
        </button>
      )}
    </span>
  );

  return (
    <div className={`flex flex-col gap-2 mb-6 animate-in slide-in-from-left duration-500 ${className || ''}`}>
      {primaryChips.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ minWidth: 0 }}>
          {primaryChips.map(chip => renderChip(chip, () => {
            if (chip.isRegistrant && chip.userId) {
              const currentIds = (filters.registrantUserIds && filters.registrantUserIds.length > 0)
                ? filters.registrantUserIds
                : (users || []).map(u => u.id);
              const newIds = currentIds.filter((id: string) => id !== chip.userId);
              onRemove({ registrantUserIds: newIds } as any);
            } else if (chip.isGroup && chip.groupId) {
              const currentIds = (filters.activeGroups && filters.activeGroups.length > 0 && !filters.activeGroups.includes('all'))
                ? filters.activeGroups
                : (groups || []).map(g => g.id);
              const newIds = currentIds.filter((id: string) => id !== chip.groupId);
              onRemove({ activeGroups: newIds } as any);
            } else {
              onRemove(chip.key);
            }
          }))}
        </div>
      )}
      {secondaryChips.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-1 items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ minWidth: 0 }}>
          {secondaryChips.map(chip => renderChip(chip, () => {
            if (chip.isTag) {
              const newTags = filters.tags.filter((t: string) => t !== chip.tagValue);
              onRemove(newTags);
            } else {
              onRemove(chip.key);
            }
          }))}
          <button 
            onClick={() => onRemove([])}
            className="text-[11px] font-black text-gray-400 hover:text-gray-600 px-2 transition-colors shrink-0"
          >
            クリア
          </button>
        </div>
      )}
    </div>
  );
}
