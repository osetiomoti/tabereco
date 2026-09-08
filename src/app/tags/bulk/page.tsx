'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/Header';
import { getPosts, getUserTags, bulkAddTags } from '@/lib/api/posts';
import type { Post, Tag } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { useRouter } from 'next/navigation';
import { Search, MapPin, CheckSquare, Square, X, Loader2, Tag as TagIcon, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function MiniNoImageMap({ post }: { post: Post }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasCoords = post.latitude != null && post.longitude != null;
  const staticMapUrl = hasCoords && apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${post.latitude},${post.longitude}&zoom=15&size=300x300&markers=color:0xf43f5e%7C${post.latitude},${post.longitude}&key=${apiKey}`
    : null;

  return (
    <div className="w-full h-full relative bg-gray-100 flex items-center justify-center">
      {staticMapUrl ? (
        <>
          <Image src={staticMapUrl} alt="Map" fill className="object-cover opacity-80" unoptimized />
          <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center pointer-events-none p-1">
            <span className="text-gray-600 font-bold text-[8px] bg-white/80 px-2 py-1 rounded shadow-sm backdrop-blur-sm text-center leading-tight">
              画像が登録されて<br />いません
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-2 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 w-full h-full">
          <span className="text-xl mb-1">📍</span>
          <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
          <span className="text-[8px] font-bold text-gray-500 mt-0.5 text-center leading-tight">画像がありません</span>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
    </button>
  );
}

export default function BulkAddTagsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'visited' | 'want_to_go'>('visited');
  const [searchMode, setSearchMode] = useState<'store_name' | 'address'>('store_name');
  const [keyword, setKeyword] = useState('');
  
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: postsData, isLoading: postsLoading } = useSWR<Post[]>('/api/posts?is_mine=true', () => getPosts({ is_mine: true }));
  const { data: tagsData } = useSWR<Tag[]>('/api/tags', () => getUserTags());

  const posts = postsData || [];
  const tags = tagsData || [];

  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => p.status === activeTab);
    
    if (keyword.trim() !== '') {
      const lower = keyword.toLowerCase();
      if (searchMode === 'store_name') {
        result = result.filter(p => p.store_name?.toLowerCase().includes(lower) || p.title?.toLowerCase().includes(lower));
      } else {
        result = result.filter(p => p.address?.toLowerCase().includes(lower));
      }
    }
    
    // ソート：作成日時の降順
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return result;
  }, [posts, activeTab, keyword, searchMode]);

  const togglePostSelect = (id: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set(selectedPostIds);
    filteredPosts.forEach(p => next.add(p.id));
    setSelectedPostIds(next);
  };

  const deselectAll = () => {
    setSelectedPostIds(new Set());
  };

  const handleBulkAdd = async () => {
    if (selectedPostIds.size === 0 || selectedTags.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await bulkAddTags(Array.from(selectedPostIds), selectedTags);
      alert('タグの一括追加が完了しました！');
      router.push('/tags');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert('エラーが発生しました: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fcfcfc] min-h-[100dvh] pb-32">
      <Header title="タグ一括追加" showBackButton />
      
      <main className="max-w-xl mx-auto py-6">
        {/* Search & Filters */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setSearchMode('store_name'); setKeyword(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
                searchMode === 'store_name'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              🏪 店名
            </button>
            <button
              onClick={() => { setSearchMode('address'); setKeyword(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${
                searchMode === 'address'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              📍 住所
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text"
              placeholder={searchMode === 'address' ? '住所・エリアで検索（例：渋谷区、銀座...）' : '店名で検索...'}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-800 placeholder:text-gray-300"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 mb-4">
          <div className="flex bg-gray-100/80 rounded-[14px] p-1 border border-black/5 shadow-inner">
            <TabBtn active={activeTab === 'visited'} onClick={() => { setActiveTab('visited'); deselectAll(); }} label="行った" />
            <TabBtn active={activeTab === 'want_to_go'} onClick={() => { setActiveTab('want_to_go'); deselectAll(); }} label="行きたい" />
          </div>
        </div>

        {/* Selection Tools */}
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="text-[11px] font-black text-gray-400 tracking-wider uppercase">
            {filteredPosts.length}件中 {selectedPostIds.size}件選択
          </span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[11px] font-black text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
              すべて選択
            </button>
            <button onClick={deselectAll} className="text-[11px] font-black text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              クリア
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {postsLoading ? (
          <div className="px-4 grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="relative aspect-square bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-bold text-[14px]">記録が見つかりません</div>
        ) : (
          <div className="px-4 grid grid-cols-3 gap-[2px]">
            {filteredPosts.map(post => {
              const isSelected = selectedPostIds.has(post.id);
              return (
                <div
                  key={post.id}
                  onClick={() => togglePostSelect(post.id)}
                  className={`relative aspect-square bg-gray-50 overflow-hidden cursor-pointer touch-manipulation group ${isSelected ? 'ring-4 ring-inset ring-orange-500 z-10' : ''}`}
                >
                  {post.image_url ? (
                    <Image src={getImageUrl(post.image_url)} alt={post.title} fill className="object-cover" sizes="33vw" />
                  ) : post.status === 'want_to_go' ? (
                    <MiniNoImageMap post={post} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
                      <span className="text-2xl mb-1">🍽️</span>
                      <span className="text-[9px] font-black text-center leading-tight text-gray-700 line-clamp-2 px-1">{post.title}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                  
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col pointer-events-none">
                    <span className="text-white font-black text-[10px] leading-tight drop-shadow-md truncate tracking-tight">{post.title}</span>
                    <span className="text-gray-300 font-medium text-[8px] drop-shadow-md truncate mt-0.5 opacity-80">
                      {post.store_name}
                    </span>
                  </div>

                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded shadow-sm">
                    {isSelected ? (
                      <CheckSquare size={20} className="text-orange-500" />
                    ) : (
                      <Square size={20} className="text-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 animate-fade-in flex justify-center pointer-events-none">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full max-w-sm py-4 bg-gray-900 text-white rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all pointer-events-auto"
          >
            {selectedPostIds.size}件の記録にタグを追加
          </button>
        </div>
      )}

      {/* Tag Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-lg">タグを選択</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-[12px] font-bold text-gray-400 mb-4">
                追加したいタグを複数選べます。存在しないタグ名を入力して作成することもできます。
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTags(prev => isSelected ? prev.filter(t => t !== tag.name) : [...prev, tag.name])}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all border-2 ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 text-orange-600' 
                          : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span># {tag.name}</span>
                      {isSelected && <Check size={16} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              {/* Tag creation input could be added here, but since the user can type anywhere in settings we can keep it simple or add an input */}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white pb-safe">
              <button
                onClick={handleBulkAdd}
                disabled={selectedTags.length === 0 || isSubmitting}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg disabled:opacity-50 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : '一括追加を実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
