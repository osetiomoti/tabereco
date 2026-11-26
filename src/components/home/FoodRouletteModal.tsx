'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Sparkles, SlidersHorizontal, MapPin, Star, ExternalLink, RotateCcw, Search, Utensils, Compass } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAppType } from '@/contexts/AppTypeContext';
import { FilterModal } from '@/components/FilterModal';
import { getImageUrl } from '@/lib/image';
import { useRouter } from 'next/navigation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
};

export function FoodRouletteModal({ isOpen, onClose, posts }: Props) {
  const { appType } = useAppType();
  const router = useRouter();

  const [keyword, setKeyword] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'want_to_go' | 'visited'>('want_to_go');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>(null);

  // Roulette animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [animatingPost, setAnimatingPost] = useState<Post | null>(null);
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter posts based on keyword, statusTab, and advancedFilters
  const candidatePosts = useMemo(() => {
    let list = [...posts];

    // Status filter
    // _isMarkedVisited / _isMarkedWantToGo は「他人の投稿にマーク済み」を示すフラグ
    // status は投稿者本人の登録ステータスのため、両方を考慮する必要がある
    if (statusTab === 'want_to_go') {
      list = list.filter(p => p.status === 'want_to_go' || (p as any)._isMarkedWantToGo);
    } else if (statusTab === 'visited') {
      list = list.filter(p => p.status === 'visited' || (p as any)._isMarkedVisited);
    }

    // Keyword filter (title, store_name, address, comment)
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      list = list.filter(p => {
        return (
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.store_name && p.store_name.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q)) ||
          (p.comment && p.comment.toLowerCase().includes(q))
        );
      });
    }

    // Advanced filters from FilterModal
    if (advancedFilters) {
      if (advancedFilters.status && advancedFilters.status !== 'all') {
        list = list.filter(p => p.status === advancedFilters.status);
      }
      if (advancedFilters.rating_min != null) {
        list = list.filter(p => (p.rating ?? 0) >= advancedFilters.rating_min);
      }
      if (advancedFilters.rating_max != null) {
        list = list.filter(p => (p.rating ?? 0) <= advancedFilters.rating_max);
      }
      if (advancedFilters.price_min != null) {
        list = list.filter(p => (p.price_max ?? p.price_min ?? 0) >= advancedFilters.price_min);
      }
      if (advancedFilters.price_max != null) {
        list = list.filter(p => (p.price_min ?? p.price_max ?? 0) <= advancedFilters.price_max);
      }
      if (advancedFilters.tags && advancedFilters.tags.length > 0) {
        const tagIds = advancedFilters.tags;
        list = list.filter(p => {
          const postTagIds = (p.tags as any[])?.map(t => typeof t === 'string' ? t : t.tag_id || t.id || t.tag?.id) || [];
          if (advancedFilters.tagMatchMode === 'AND') {
            return tagIds.every((id: string) => postTagIds.includes(id));
          } else {
            return tagIds.some((id: string) => postTagIds.includes(id));
          }
        });
      }
      if (advancedFilters.registrantUserIds && advancedFilters.registrantUserIds.length > 0) {
        list = list.filter(p => advancedFilters.registrantUserIds.includes(p.user_id));
      }
    }

    return list;
  }, [posts, statusTab, keyword, advancedFilters]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  // Spin Roulette
  const handleSpin = () => {
    if (candidatePosts.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedPost(null);

    // Pick winning index beforehand
    const winnerIndex = Math.floor(Math.random() * candidatePosts.length);
    const winner = candidatePosts[winnerIndex];

    let currentStep = 0;
    const totalSteps = Math.min(25, Math.max(12, candidatePosts.length * 2));
    let delay = 60;

    const step = () => {
      currentStep++;
      // Random candidate for preview during spin
      const randIdx = Math.floor(Math.random() * candidatePosts.length);
      setAnimatingPost(candidatePosts[randIdx]);

      if (currentStep >= totalSteps) {
        // Finished!
        setAnimatingPost(winner);
        setSelectedPost(winner);
        setIsSpinning(false);
      } else {
        // Gradually slow down
        if (currentStep > totalSteps - 6) {
          delay += 60;
        } else if (currentStep > totalSteps - 12) {
          delay += 25;
        }
        spinTimerRef.current = setTimeout(step, delay);
      }
    };

    spinTimerRef.current = setTimeout(step, delay);
  };

  if (!isOpen) return null;

  const isTabireco = appType === 'tabireco';
  const modalTitle = isTabireco ? '次どこ行く？旅ガチャ' : '今日何食べる？ルーレット';
  const modalDesc = isTabireco
    ? '次の行き先を運命におまかせ！条件に合うスポットから1軒選びます'
    : '迷ったときは運命におまかせ！条件に合うお店から1軒選びます';
  const inputPlaceholder = isTabireco
    ? 'スポット名・地名・住所で検索...'
    : '店名・料理名・住所で検索...';
  const postTargetLabel = isTabireco ? 'スポット' : 'お店';

  const activeAdvancedFilterCount = advancedFilters
    ? (advancedFilters.tags?.length || 0) +
      (advancedFilters.rating_min ? 1 : 0) +
      (advancedFilters.price_min || advancedFilters.price_max ? 1 : 0) +
      (advancedFilters.registrantUserIds?.length ? 1 : 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── ヘッダー ── */}
        <div className={`p-5 pb-4 text-white relative ${
          isTabireco
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600'
            : 'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <div>
                <h3 className="font-black text-[19px] leading-tight flex items-center gap-1.5">
                  {modalTitle}
                  <Sparkles size={16} className="text-amber-200" />
                </h3>
                <p className="text-[11px] text-white/80 font-bold mt-0.5">{modalDesc}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── フィルターコントロール ── */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 space-y-3 shrink-0">
          {/* 検索バー */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-[12px] bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 font-bold"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* クイックタブ & 詳細フィルターボタン */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-gray-200/80 p-0.5 rounded-xl text-[11px] font-black">
              <button
                onClick={() => setStatusTab('want_to_go')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusTab === 'want_to_go' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                📌 行きたい
              </button>
              <button
                onClick={() => setStatusTab('visited')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusTab === 'visited' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                ✅ 訪問済み
              </button>
              <button
                onClick={() => setStatusTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusTab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                すべて
              </button>
            </div>

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                activeAdvancedFilterCount > 0
                  ? isTabireco
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>詳細フィルター</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="w-4 h-4 bg-white text-orange-600 rounded-full flex items-center justify-center text-[9px] font-black">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* 該当件数カウンター */}
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 px-1">
            <span>
              候補の{postTargetLabel}: <strong className="text-gray-900 font-black text-[13px]">{candidatePosts.length}</strong> 件
            </span>
            {activeAdvancedFilterCount > 0 && (
              <button
                onClick={() => setAdvancedFilters(null)}
                className="text-orange-500 hover:underline text-[10px]"
              >
                詳細フィルター解除
              </button>
            )}
          </div>
        </div>

        {/* ── ルーレットメインエリア ── */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[280px]">
          {selectedPost ? (
            /* 決定したポストの祝福表示 */
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-400 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black mb-3 border border-amber-200 shadow-sm">
                🎉 本日の決定{postTargetLabel}！
              </div>

              <div className="w-full bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 mb-4">
                {/* 画像 */}
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  {(selectedPost.image_url || selectedPost.image_urls?.[0]) ? (
                    <img
                      src={getImageUrl(selectedPost.image_url || selectedPost.image_urls![0])}
                      alt={selectedPost.store_name || selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
                      {isTabireco ? <Compass size={40} className="text-emerald-400" /> : <Utensils size={40} className="text-orange-400" />}
                    </div>
                  )}
                  {selectedPost.rating && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white rounded-full px-2 py-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-black">{selectedPost.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-black/50 backdrop-blur-sm">
                    {selectedPost.status === 'want_to_go' ? '📌 行きたい' : '✅ 訪問済み'}
                  </div>
                </div>

                {/* 情報 */}
                <div className="p-4">
                  <h4 className="font-black text-[17px] text-gray-900 leading-tight mb-1">
                    {selectedPost.store_name || selectedPost.title}
                  </h4>
                  {selectedPost.address && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-500 font-bold truncate mb-2">
                      <MapPin size={12} className="shrink-0 text-orange-500" />
                      {selectedPost.address}
                    </p>
                  )}
                  {selectedPost.comment && (
                    <p className="text-[11px] text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-xl">
                      {selectedPost.comment}
                    </p>
                  )}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/posts/${selectedPost.id}`);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white font-black text-[13px] shadow-md active:scale-95 transition-transform ${
                    isTabireco
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                      : 'bg-gradient-to-r from-orange-500 to-rose-500'
                  }`}
                >
                  <span>{isTabireco ? 'ここに出発する！' : 'ここに食べに行く！'}</span>
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={handleSpin}
                  disabled={candidatePosts.length <= 1}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[13px] active:scale-95 transition-transform disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>もう一度回す</span>
                </button>
              </div>
            </div>
          ) : isSpinning ? (
            /* 回転中のアニメーションカード */
            <div className="w-full max-w-sm flex flex-col items-center animate-pulse">
              <div className="text-3xl mb-3 animate-bounce">🎰</div>
              <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-orange-100 via-rose-100 to-amber-100 flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-300 shadow-inner">
                {animatingPost && (
                  <div className="text-center">
                    <p className="text-[18px] font-black text-gray-800 truncate max-w-xs">
                      {animatingPost.store_name || animatingPost.title}
                    </p>
                    {animatingPost.address && (
                      <p className="text-[11px] text-gray-500 font-bold truncate mt-1">
                        {animatingPost.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[12px] font-black text-orange-500 mt-4 tracking-wider animate-pulse">
                選定中...
              </p>
            </div>
          ) : candidatePosts.length === 0 ? (
            /* 候補ゼロの場合 */
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <h4 className="font-black text-[15px] text-gray-700 mb-1">該当する{postTargetLabel}が見つかりません</h4>
              <p className="text-[12px] text-gray-400 font-bold max-w-xs mx-auto">
                検索キーワードやフィルター条件を広げてみてください。
              </p>
            </div>
          ) : (
            /* 初期状態：ルーレット開始待機 */
            <div className="text-center py-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 border-4 border-white shadow-xl flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform">
                <span className="text-4xl animate-bounce">🎲</span>
              </div>
              <h4 className="font-black text-[17px] text-gray-800 mb-1">
                {candidatePosts.length} 件の候補からランダム決定！
              </h4>
              <p className="text-[12px] text-gray-400 font-bold max-w-xs mx-auto mb-6">
                ボタンを押すとルーレットが回転し、今日行くべきおすすめの1軒が選ばれます。
              </p>
              <button
                onClick={handleSpin}
                className={`w-full max-w-xs py-3.5 px-6 rounded-2xl text-white font-black text-[15px] shadow-lg active:scale-95 transition-transform ${
                  isTabireco
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                    : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600'
                }`}
              >
                🎰 ルーレットを回す！
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 詳細FilterModal ── */}
      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setIsFilterModalOpen(false);
          }}
          initialFilters={advancedFilters || {}}
          hideStatus={false}
          showHotSpringFilter={isTabireco}
        />
      )}
    </div>
  );
}
