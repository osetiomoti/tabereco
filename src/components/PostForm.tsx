'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from './ImageUpload';
import { StarInput } from './StarRating';
import { createPost, updatePost } from '@/lib/api/posts';
import { useUpload } from '@/hooks/useUpload';
import { todayString } from '@/lib/utils';
import { getExifGPS } from '@/lib/exif';
import type { Post, PostFormValues, PostStatus } from '@/lib/types';
import { Loader2, MapPin, Globe, Hash, Check, Tag as TagIcon, Plus, X, Users, Heart } from 'lucide-react';

import { PlaceAutocomplete } from './PlaceAutocomplete';
import { TagSelector } from './TagSelector';
import { PlacePickerModal } from './PlacePickerModal';
import { useSearchParams } from 'next/navigation';

type Props = {
  /** 編集時は既存の投稿データを渡す */
  post?: Post;
};

export function PostForm({ post }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadFile, isUploading } = useUpload();
  const isEdit = Boolean(post);

  // Fallback initial values from URL query parameters (Map navigation)
  const queryName = searchParams.get('name') || '';
  const queryAddress = searchParams.get('address') || '';
  const queryLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const queryLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const queryPlaceId = searchParams.get('placeId') || '';

  const cleanAddress = (addr: string) =>
    (addr || '').replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, '');

  const [values, setValues] = useState<PostFormValues>({
    title: post?.title ?? '',
    store_name: post?.store_name ?? queryName,
    comment: post?.comment ?? '',
    rating: post?.rating ?? 3,
    visited_at: post?.visited_at ?? todayString(),
    images: [] as File[],
    image_urls: post?.image_urls ?? (post?.image_url ? [post.image_url] : []),
    status: post?.status ?? 'visited',
    is_public: post?.is_public ?? false,
    is_favorite: post?.is_favorite ?? false,
    tags: post?.tags?.map(t => t.name) ?? [],
    address: cleanAddress(post?.address ?? queryAddress),
    google_place_id: post?.google_place_id ?? queryPlaceId,
    latitude: post?.latitude ?? queryLat,
    longitude: post?.longitude ?? queryLng,
    is_mine_only: post?.is_mine_only ?? false,
  });

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [addressLanguage, setAddressLanguage] = useState<'ja' | 'en'>('ja');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractingGps, setExtractingGps] = useState(false);
  const [orderedImages, setOrderedImages] = useState<(File | string)[]>([...(post?.image_urls ?? (post?.image_url ? [post.image_url] : []))]);

  useEffect(() => {
    async function loadGroups() {
      try {
        const { getJoinedGroups } = await import('@/lib/api/groups');
        const data = await getJoinedGroups();
        setGroups(data);
        // Default: select all groups
        setSelectedGroupIds(data.map((g: any) => g.id));
      } catch (e) {
        console.error('Failed to load groups:', e);
      }
    }
    loadGroups();
  }, []);

  const set = <K extends keyof PostFormValues>(key: K, val: PostFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  // 住所の言語を切り替える際のAPI取得ロジック (案B: リロードなし翻訳)

  const updateAddressByLanguage = async (placeId: string, lang: 'ja' | 'en') => {
    if (!placeId) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    try {
      // Geocoding API を直接叩いて指定言語の住所を取得
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&language=${lang}&key=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        set('address', cleanAddress(data.results[0].formatted_address));
      }
    } catch (err) {
      console.error('Failed to translate address:', err);
    }
  };

  // 言語が切り替わった時に既存の住所があれば再取得
  useEffect(() => {
    if (values.google_place_id) {
      updateAddressByLanguage(values.google_place_id, addressLanguage);
    }
  }, [addressLanguage]);

  // 画像が選択・並び替えられた時の処理
  const handleImagesChange = async (items: (File | string)[]) => {
    setOrderedImages(items);

    // 最初のアイテムがファイルの場合にEXIF情報を取得
    if (items.length > 0 && items[0] instanceof File) {
      setExtractingGps(true);
      const coords = await getExifGPS(items[0]);
      if (coords) {
        set('latitude', coords.latitude);
        set('longitude', coords.longitude);
      }
      setExtractingGps(false);
    }
  };

  // Google Places で場所が選択された時の処理
  const handlePlaceSelected = (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
  }) => {
    setValues((prev) => ({
      ...prev,
      store_name: place.name,
      address: cleanAddress(place.address),
      latitude: place.lat,
      longitude: place.lng,
      google_place_id: place.placeId,
    }));
    
    // 現在の言語設定が英語の場合は、即座に英語住所を再取得
    if (addressLanguage === 'en') {
      updateAddressByLanguage(place.placeId, 'en');
    }
  };

  const handleMapPlaceSelected = (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
  }) => {
    setValues((prev) => ({
      ...prev,
      store_name: place.name,
      address: cleanAddress(place.address),
      latitude: place.lat,
      longitude: place.lng,
      google_place_id: place.placeId || '',
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!values.store_name.trim()) return setError('店名を入力してください');
    if (!values.rating) return setError('評価を選択してください');

    setLoading(true);
    try {
      // 並び順を保持しつつ、ファイルだけをアップロードする
      const finalImageUrls = await Promise.all(
        orderedImages.map(async (item) => {
          if (typeof item === 'string') {
            return item;
          } else {
            const uploadedUrl = await uploadFile(item);
            return uploadedUrl;
          }
        })
      ).then(urls => urls.filter((url): url is string => url !== null));

      const primaryImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : null;

      const postData = {
        title: values.title?.trim() || `${values.store_name.trim()}での記録`,
        store_name: values.store_name.trim(),
        comment: values.comment.trim() || null,
        rating: values.rating,
        image_url: primaryImageUrl, // 後方互換のため最初の1枚
        image_urls: finalImageUrls, // すべての画像配列
        visited_at: values.visited_at,
        status: values.status,
        is_public: values.is_public,
        address: values.address || null,
        google_place_id: values.google_place_id || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        is_mine_only: values.is_mine_only,
      };

      let result;
      if (isEdit && post) {
        result = await updatePost(post.id, postData, values.tags);
        if (result) {
          const { sharePostToGroups } = await import('@/lib/api/groups');
          await sharePostToGroups(post.id, selectedGroupIds);
          router.push(`/posts/${post.id}`);
        }
      } else {
        result = await createPost(postData, values.tags);
        if (result?.id) {
          const { sharePostToGroups } = await import('@/lib/api/groups');
          await sharePostToGroups(result.id, selectedGroupIds);
          router.push(`/posts/${result.id}`);
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20 sm:pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. 写真と基本ステータス */}
      <section className="space-y-4">
        <ImageUpload
          items={orderedImages}
          onChange={handleImagesChange}
          maxFiles={5}
        />

        <div className="flex p-1.5 bg-gray-100/50 backdrop-blur-md border border-gray-100 rounded-2xl shadow-inner mx-1">
          <button
            type="button"
            onClick={() => set('status', 'visited')}
            className={`flex-1 py-3 text-[13px] font-black rounded-xl transition-all duration-500 ${
              values.status === 'visited'
                ? 'bg-white text-[#ff6b95] shadow-md ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行った
          </button>
          <button
            type="button"
            onClick={() => set('status', 'want_to_go')}
            className={`flex-1 py-3 text-[13px] font-black rounded-xl transition-all duration-500 ${
              values.status === 'want_to_go'
                ? 'bg-white text-[#ff6b95] shadow-md ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行きたい
          </button>
        </div>
      </section>

      {/* 2. 基本情報 (場所) */}
      <section className="space-y-5 bg-white sm:border border-gray-100 sm:rounded-[2.5rem] sm:p-8">

        <div className="space-y-1.5">
          <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">場所 (任意)</label>
          <div className="relative">
            <PlaceAutocomplete
              onPlaceSelected={handlePlaceSelected}
              defaultValue={values.store_name}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">住所 (任意)</label>
          <div className="relative">
            <input
              type="text"
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="例：東京都中央区..."
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-[#ff6b95]/5 focus:border-[#ff6b95]/20 focus:bg-white transition-all text-base font-bold"
            />
            {extractingGps && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={20} className="text-[#ff6b95] animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Location Actions (Screenshot Style) */}
        <div className="flex items-center gap-3 mt-2 px-1">
          <button
            type="button"
            onClick={() => setIsMapPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-[#ff6b95] rounded-full text-[11px] font-black hover:bg-pink-100 transition-colors border border-pink-100/50"
          >
            🗺️ 地図から選択
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-[#ff6b95] rounded-full text-[11px] font-black hover:bg-pink-100 transition-colors border border-pink-100/50"
          >
            📍 現在地
          </button>
          {(values.latitude && values.longitude) && (
            <span className="text-[10px] font-black text-gray-300 italic ml-auto">
              {values.latitude.toFixed(4)}, {values.longitude.toFixed(4)}
            </span>
          )}
        </div>
      </section>

      {/* 3. 記録の詳細 (日付・評価・メモ) */}
      <section className="space-y-6 bg-white sm:border border-gray-100 sm:rounded-[2.5rem] sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">訪問日</label>
            <input
              type="date"
              value={values.visited_at}
              onChange={(e) => set('visited_at', e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#ff6b95]/5 focus:bg-white transition-all text-base font-bold [color-scheme:light]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">評価</label>
            <div className="py-2">
              <StarInput value={values.rating} onChange={(r) => set('rating', r)} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">メモ</label>
          <textarea
            value={values.comment}
            onChange={(e) => set('comment', e.target.value)}
            placeholder="味の感想や、お店の雰囲気を記録してね..."
            rows={4}
            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-[#ff6b95]/5 focus:border-[#ff6b95]/20 focus:bg-white transition-all text-base font-bold resize-none"
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">タグ</label>
          <div className="flex flex-wrap gap-2.5 p-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] shadow-inner">
            {values.tags.map(tag => (
              <span 
                key={tag}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl text-[12px] font-black shadow-sm animate-in zoom-in"
              >
                #{tag}
                <X 
                  size={14} 
                  className="text-gray-300 hover:text-red-500 cursor-pointer transition-colors" 
                  onClick={() => set('tags', values.tags.filter(t => t !== tag))}
                />
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsTagSelectorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff6b95]/5 text-[#ff6b95] rounded-xl text-[12px] font-black hover:bg-[#ff6b95]/10 transition-all border border-[#ff6b95]/10"
            >
              <Plus size={14} strokeWidth={3} />
              タグを選択
            </button>
          </div>
        </div>
      </section>

      {/* 4. 共有・プライバシー */}
      <section className="bg-white sm:border border-gray-100 sm:rounded-[2.5rem] sm:p-8 p-4">
        <div className="space-y-6">
          {groups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[12px] font-black text-gray-500 tracking-widest">共有先グループ</label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroupIds.length === groups.length) setSelectedGroupIds([]);
                    else setSelectedGroupIds(groups.map((g: any) => g.id));
                  }}
                  className="text-[10px] font-black text-[#ff6b95] hover:underline"
                >
                  {selectedGroupIds.length === groups.length ? '全解除' : '全選択'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {groups.map((group: any) => {
                  const isSelected = selectedGroupIds.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroupIds(prev =>
                          isSelected ? prev.filter(id => id !== group.id) : [...prev, group.id]
                        );
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all border-2 ${
                        isSelected
                        ? 'bg-[#ff6b95] border-[#ff6b95] text-white shadow-lg shadow-[#ff6b95]/20'
                        : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <span className="text-[14px] font-black text-gray-700 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${values.is_favorite ? 'bg-pink-100 text-pink-500' : 'bg-gray-100 text-gray-400'}`}>
                  <Heart size={18} className={values.is_favorite ? "fill-pink-500" : ""} />
                </div>
                お気に入り登録
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={values.is_favorite}
                  onChange={(e) => set('is_favorite', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
              </label>
          </div>
        </div>
      </section>

      {/* エラー表示 */}
      {error && (
        <div className="mx-4 rounded-2xl bg-red-50 border-2 border-red-100 px-5 py-4 text-[13px] font-black text-red-500 flex items-center gap-3 animate-bounce">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 送信ボタン */}
      <div className="px-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-[#ff6b95] to-[#ff9a8b] text-white font-black text-[18px] hover:brightness-105 disabled:opacity-50 transition-all shadow-xl shadow-[#ff6b95]/30 flex items-center justify-center gap-3 active:scale-[0.98] relative overflow-hidden group"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin text-white" />
          ) : (
            <>
              <Check size={24} strokeWidth={4} className="group-hover:scale-110 transition-transform" />
              <span>{isEdit ? '内容を更新する' : 'この食事を記録する'}</span>
            </>
          )}
        </button>
      </div>

      <TagSelector
        isOpen={isTagSelectorOpen}
        onClose={() => setIsTagSelectorOpen(false)}
        selectedTags={values.tags}
        onSelect={(tags) => set('tags', tags)}
      />

      <PlacePickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelect={handleMapPlaceSelected}
        initialCenter={values.latitude && values.longitude ? { lat: values.latitude, lng: values.longitude } : undefined}
      />
    </form>
  );
}
