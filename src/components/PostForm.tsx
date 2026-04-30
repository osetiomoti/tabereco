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
import { Loader2, MapPin, Globe, Lock, Hash, Check, Tag as TagIcon, Plus, X, Users, Heart } from 'lucide-react';

import { PlaceAutocomplete } from './PlaceAutocomplete';
import { TagSelector } from './TagSelector';
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
    address: post?.address ?? queryAddress,
    google_place_id: post?.google_place_id ?? queryPlaceId,
    latitude: post?.latitude ?? queryLat,
    longitude: post?.longitude ?? queryLng,
    is_mine_only: post?.is_mine_only ?? false,
  });

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
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
        set('address', data.results[0].formatted_address);
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
      address: place.address,
      latitude: place.lat,
      longitude: place.lng,
      google_place_id: place.placeId,
    }));
    
    // 現在の言語設定が英語の場合は、即座に英語住所を再取得
    if (addressLanguage === 'en') {
      updateAddressByLanguage(place.placeId, 'en');
    }
  };

  const handleAddTag = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter' && e.key !== ',') return;
    if (e) e.preventDefault();
    
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !values.tags.includes(trimmed)) {
      set('tags', [...values.tags, trimmed]);
    }
    setTagInput('');
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
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 sm:pb-10">
      {/* 1. 写真と基本ステータス */}
      <section className="space-y-4">
        <ImageUpload
          items={orderedImages}
          onChange={handleImagesChange}
          maxFiles={5}
        />

        <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-inner mx-1">
          <button
            type="button"
            onClick={() => set('status', 'visited')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              values.status === 'visited'
                ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行った
          </button>
          <button
            type="button"
            onClick={() => set('status', 'want_to_go')}
            className={`flex-1 py-2 text-[12px] font-black rounded-[10px] transition-all duration-300 ${
              values.status === 'want_to_go'
                ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行きたい
          </button>
        </div>
      </section>

      {/* 2. お店・場所の情報 */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">店名・スポット名 *</label>
            <PlaceAutocomplete
              onPlaceSelected={handlePlaceSelected}
              defaultValue={values.store_name}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">住所</label>
              <div className="relative">
                <input
                  type="text"
                  value={values.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="住所を入力"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white transition-all text-sm font-bold shadow-inner"
                />
                {extractingGps && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="text-orange-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">食事・メニュー名</label>
              <input
                type="text"
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="例：伝説の唐揚げ"
                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white transition-all text-sm font-bold shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. 記録の詳細 */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">訪問日</label>
              <input
                type="date"
                value={values.visited_at}
                onChange={(e) => set('visited_at', e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white transition-all text-sm font-bold shadow-inner [color-scheme:light]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block sm:text-right">評価</label>
              <div className="flex sm:justify-end">
                <StarInput value={values.rating} onChange={(r) => set('rating', r)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">メモ</label>
            <textarea
              value={values.comment}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="味の感想など..."
              rows={3}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white transition-all text-sm font-bold shadow-inner resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1 block">タグ</label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 border border-gray-100 rounded-2xl shadow-inner">
              {values.tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-100 text-gray-700 rounded-lg text-[11px] font-black shadow-sm"
                >
                  #{tag}
                  <X 
                    size={12} 
                    className="text-gray-300 hover:text-red-500 cursor-pointer" 
                    onClick={() => set('tags', values.tags.filter(t => t !== tag))}
                  />
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="＋ タグ"
                className="bg-transparent border-none focus:ring-0 text-[13px] py-1 px-1 placeholder-gray-400 font-bold flex-1 min-w-[80px]"
              />
              <button
                type="button"
                onClick={() => setIsTagSelectorOpen(true)}
                className="px-2.5 py-1 bg-[#a68c7e]/10 text-[#a68c7e] rounded-lg text-[10px] font-black hover:bg-[#a68c7e]/20 transition-all border border-[#a68c7e]/20"
              >
                選択リスト
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 共有・プライバシー */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 space-y-4">
          {groups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 tracking-widest ml-1">共有先</label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroupIds.length === groups.length) setSelectedGroupIds([]);
                    else setSelectedGroupIds(groups.map((g: any) => g.id));
                  }}
                  className="text-[9px] font-black text-[#a68c7e] hover:underline"
                >
                  {selectedGroupIds.length === groups.length ? '全解除' : '全選択'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                        isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
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

          <div className="flex items-center justify-between px-1 border-b border-gray-50 pb-4">
            <span className="text-[12px] font-black text-gray-700 flex items-center gap-2">
              <Heart size={14} className={values.is_favorite ? "fill-pink-500 text-pink-500" : "text-[#a68c7e]"} /> お気に入り登録
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={values.is_favorite}
                onChange={(e) => set('is_favorite', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
            </label>
          </div>

          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-[12px] font-black text-gray-700 flex items-center gap-2">
              <Lock size={14} className="text-[#a68c7e]" /> 自分のみ
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={values.is_mine_only}
                onChange={(e) => set('is_mine_only', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
            </label>
          </div>
        </div>
      </section>

      {/* エラー表示 */}
      {error && (
        <div className="mx-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[11px] font-black text-red-500">
          ⚠️ {error}
        </div>
      )}

      {/* 送信ボタン */}
      <div className="px-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-[1.5rem] bg-gradient-to-r from-[#a68c7e] to-[#7d675b] text-white font-black text-[16px] hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-[#a68c7e]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : (
            <>
              <Check size={20} strokeWidth={3} />
              {isEdit ? '保存する' : '記録する'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
