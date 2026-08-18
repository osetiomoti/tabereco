'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { ImageUpload } from './ImageUpload';
import { StarInput } from './StarRating';
import { createPost, updatePost } from '@/lib/api/posts';
import { useUpload } from '@/hooks/useUpload';
import { todayString } from '@/lib/utils';
import { getExifGPS } from '@/lib/exif';
import type { Post, PostFormValues, PostStatus } from '@/lib/types';
import { Loader2, MapPin, Globe, Hash, Check, Tag as TagIcon, Plus, X, Heart, ChevronDown, Lock } from 'lucide-react';

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
    rating: post?.rating ?? (post?.status === 'want_to_go' ? null : 3),
    visited_at: post?.visited_at
      ? typeof post.visited_at === 'string'
        ? post.visited_at.split('T')[0]
        : (post.visited_at as any) instanceof Date
        ? (post.visited_at as any).toISOString().split('T')[0]
        : ''
      : '',
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
    price_min: post?.price_min ?? 1000,
    price_max: post?.price_max ?? 2000,
    temperature_min: post?.temperature_min ?? null,
    temperature_max: post?.temperature_max ?? null,
  });

  const isCustomTemp = post && post.tags?.some(t => t.name === '温泉') ? 
    (post.temperature_min === null && post.temperature_max === null ? false : !['null-34', '35-36', '37-38', '39-40', '41-42', '43-null'].includes(`${post.temperature_min}-${post.temperature_max}`))
    : false;
  const [tempMode, setTempMode] = useState<'preset' | 'custom'>(isCustomTemp ? 'custom' : 'preset');

  const isCustomPrice = post ? 
    (post.price_min === null && post.price_max === null ? false : !['1-1000', '1000-2000', '2000-3000', '3000-4000', '4000-5000', '5000-10000', '10000-'].includes(`${post.price_min}-${post.price_max || ''}`))
    : false;
  const [priceMode, setPriceMode] = useState<'preset' | 'custom'>(isCustomPrice ? 'custom' : 'preset');

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [addressLanguage, setAddressLanguage] = useState<'ja' | 'en'>('ja');
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false); // 二重送信防止用ref
  const [error, setError] = useState<string | null>(null);
  const [extractingGps, setExtractingGps] = useState(false);
  const [orderedImages, setOrderedImages] = useState<(File | string)[]>([...(post?.image_urls ?? (post?.image_url ? [post.image_url] : []))]);

  // Image upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<Record<number, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);


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
    if (loading || submittedRef.current) return; // 二重送信防止
    setError(null);

    if (!values.store_name.trim()) return setError('店名を入力してください');
    if (values.status !== 'want_to_go' && !values.rating) return setError('評価を選択してください');

    submittedRef.current = true;
    setLoading(true);
    try {
      // 並び順を保持しつつ、ファイルだけをアップロードする（プログレス表示付き）
      const filesToUpload = orderedImages.filter(item => item instanceof File);
      const totalFiles = filesToUpload.length;
      setUploadTotal(totalFiles);
      setUploadCurrent(0);

      // Initialize progress for all items
      const initialProgress: Record<number, 'pending' | 'uploading' | 'done' | 'error'> = {};
      orderedImages.forEach((item, i) => {
        if (item instanceof File) initialProgress[i] = 'pending';
      });
      setUploadProgress(initialProgress);

      // Upload sequentially for visible progress
      const finalImageUrls: (string | null)[] = new Array(orderedImages.length);
      let uploadedCount = 0;
      for (let i = 0; i < orderedImages.length; i++) {
        const item = orderedImages[i];
        if (typeof item === 'string') {
          finalImageUrls[i] = item;
        } else {
          setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
          const uploadedUrl = await uploadFile(item);
          if (uploadedUrl) {
            finalImageUrls[i] = uploadedUrl;
            setUploadProgress(prev => ({ ...prev, [i]: 'done' }));
          } else {
            finalImageUrls[i] = null;
            setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
          }
          uploadedCount++;
          setUploadCurrent(uploadedCount);
        }
      }
      const filteredUrls = finalImageUrls.filter((url): url is string => url !== null);

      const postData = {
        title: values.title?.trim() || values.store_name.trim(),
        store_name: values.store_name.trim(),
        comment: values.comment?.trim() || null,
        rating: values.status === 'want_to_go' ? null : (values.rating ?? 3),
        image_url: filteredUrls[0] || null, 
        image_urls: filteredUrls, // すべての画像配列
        visited_at: values.visited_at,
        status: values.status,
        is_public: values.is_public,
        address: values.address || null,
        google_place_id: values.google_place_id || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        is_mine_only: values.is_mine_only,
        price_min: values.price_min,
        price_max: values.price_max,
        temperature_min: values.tags.includes('温泉') ? values.temperature_min : null,
        temperature_max: values.tags.includes('温泉') ? values.temperature_max : null,
      };

      let result;
      if (isEdit && post) {
        result = await updatePost(post.id, postData, values.tags);
        if (result) {
          mutate('/api/posts');
          router.push(`/posts/${post.id}`);
        }
      } else {
        result = await createPost(postData, values.tags);
        if (result?.id) {
          mutate('/api/posts');
          router.push(`/posts/${result.id}`);
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
      setUploadProgress({});
      setUploadCurrent(0);
      setUploadTotal(0);
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
          uploadProgress={uploadProgress}
        />

        <div className="flex p-1.5 bg-gray-100/50 backdrop-blur-md border border-gray-100 rounded-2xl shadow-inner mx-1">
          <button
            type="button"
            onClick={() => set('status', 'visited')}
            className={`flex-1 py-3 text-[13px] font-black rounded-xl transition-all duration-500 ${
              values.status === 'visited'
                ? 'bg-white shadow-md ring-1 ring-black/5 text-[var(--color-primary)]'
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
                ? 'bg-white shadow-md ring-1 ring-black/5 text-[var(--color-primary)]'
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
              onInputChange={(val) => set('store_name', val)}
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
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold"
              style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
            />
            {extractingGps && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
              </div>
            )}
          </div>
        </div>

        {/* Location Actions (Screenshot Style) */}
        <div className="flex items-center gap-3 mt-2 px-1">
          <button
            type="button"
            onClick={() => setIsMapPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-full text-[11px] font-black hover:brightness-95 transition-colors border border-[var(--color-primary-light)]"
          >
            🗺️ 地図から選択
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-full text-[11px] font-black hover:brightness-95 transition-colors border border-[var(--color-primary-light)]"
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
          <div className={`space-y-1.5 ${values.status === 'want_to_go' ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">訪問日</label>
            <div className="relative">
              <input
                type="date"
                value={values.visited_at || ''}
                onChange={(e) => set('visited_at', e.target.value)}
                disabled={values.status === 'want_to_go'}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold [color-scheme:light] disabled:bg-gray-100 disabled:text-gray-400"
                style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
              />
              {values.visited_at && values.status !== 'want_to_go' && (
                <button
                  type="button"
                  onClick={() => set('visited_at', '')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className={`space-y-1.5 ${values.status === 'want_to_go' ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 flex items-center gap-2">
              評価
              {values.status === 'want_to_go' && <span className="text-[10px] text-gray-400 font-normal">※「行った」の場合のみ入力可</span>}
            </label>
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
            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold resize-none"
            style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">値段帯</label>
          <div className="flex flex-col gap-2 relative">
            <select
              value={priceMode === 'custom' ? 'custom' : (values.price_min === null && values.price_max === null ? '' : `${values.price_min}-${values.price_max || ''}`)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setPriceMode('custom');
                } else if (val === '') {
                  setPriceMode('preset');
                  set('price_min', null as any);
                  set('price_max', null as any);
                } else {
                  setPriceMode('preset');
                  const [min, max] = val.split('-');
                  set('price_min', parseInt(min, 10));
                  set('price_max', max ? parseInt(max, 10) : null);
                }
              }}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold appearance-none cursor-pointer"
              style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
            >
              <option value="">未設定</option>
              <option value="1-1000">1〜1,000円</option>
              <option value="1000-2000">1,000〜2,000円</option>
              <option value="2000-3000">2,000〜3,000円</option>
              <option value="3000-4000">3,000〜4,000円</option>
              <option value="4000-5000">4,000〜5,000円</option>
              <option value="5000-10000">5,000〜10,000円</option>
              <option value="10000-">10,000円以上</option>
              <option value="custom">カスタム（自由入力）</option>
            </select>
            <div className="absolute right-5 top-4 pointer-events-none text-gray-400">
              <ChevronDown size={20} />
            </div>

            {priceMode === 'custom' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-2 mt-1">
                <input
                  type="number"
                  value={values.price_min ?? ''}
                  onChange={(e) => set('price_min', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="下限"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3 text-gray-900 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold"
                  style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
                />
                <span className="text-gray-400 font-bold">〜</span>
                <input
                  type="number"
                  value={values.price_max ?? ''}
                  onChange={(e) => set('price_max', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="上限"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3 text-gray-900 focus:outline-none focus:ring-4 focus:bg-white transition-all text-base font-bold"
                  style={{ '--tw-ring-color': 'var(--color-primary-shadow)' } as React.CSSProperties}
                />
                <span className="text-gray-400 font-bold shrink-0 text-sm">円</span>
              </div>
            )}
          </div>
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
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-xl text-[12px] font-black hover:brightness-95 transition-all border border-[var(--color-primary-light)]"
            >
              <Plus size={14} strokeWidth={3} />
              タグを選択
            </button>
          </div>
        </div>

        {/* 温泉の温度設定 */}
        {values.tags.includes('温泉') && (
          <div className="space-y-2.5 animate-in slide-in-from-top-2 fade-in duration-300">
            <label className="text-[12px] font-black text-gray-500 tracking-widest ml-1 block">温度帯</label>
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] shadow-inner space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌡️</span>
                <span className="text-sm font-bold text-gray-700">お湯の温度</span>
              </div>
              
              <div className="flex bg-gray-200/50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setTempMode('preset');
                    set('temperature_min', null);
                    set('temperature_max', null);
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
                    tempMode === 'preset' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  選択
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempMode('custom');
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
                    tempMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  カスタム入力
                </button>
              </div>

              {tempMode === 'preset' ? (
                <select
                  value={`${values.temperature_min}-${values.temperature_max}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'unknown') {
                      set('temperature_min', null);
                      set('temperature_max', null);
                    } else {
                      const [minStr, maxStr] = val.split('-');
                      set('temperature_min', minStr === 'null' ? null : parseFloat(minStr));
                      set('temperature_max', maxStr === 'null' ? null : parseFloat(maxStr));
                    }
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-shadow)] font-bold appearance-none cursor-pointer"
                >
                  <option value="unknown">わからない</option>
                  <option value="null-34">〜34℃</option>
                  <option value="35-36">35〜36℃</option>
                  <option value="37-38">37〜38℃</option>
                  <option value="39-40">39〜40℃</option>
                  <option value="41-42">41〜42℃</option>
                  <option value="43-null">43℃〜</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={values.temperature_min ?? ''}
                    onChange={(e) => set('temperature_min', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="下限"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-shadow)] font-bold text-center"
                  />
                  <span className="text-gray-400 font-bold">〜</span>
                  <input
                    type="number"
                    step="0.1"
                    value={values.temperature_max ?? ''}
                    onChange={(e) => set('temperature_max', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="上限"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-shadow)] font-bold text-center"
                  />
                  <span className="text-gray-400 font-bold shrink-0">℃</span>
                </div>
              )}
            </div>
            {tempMode === 'custom' && values.temperature_min !== null && values.temperature_max !== null && values.temperature_min > values.temperature_max && (
              <p className="text-red-500 text-xs font-bold px-2">左の数字は右の数字より小さくしてください。</p>
            )}
          </div>
        )}
      </section>

      {/* 4. プライバシー */}
      <section className="bg-white sm:border border-gray-100 sm:rounded-[2.5rem] sm:p-8 p-4">
        <div className="space-y-3">
          {/* お気に入り */}
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

          {/* 自分だけに公開 */}
          <div
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              values.is_mine_only
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-gray-50/50 border-gray-100'
            }`}
            onClick={() => set('is_mine_only', !values.is_mine_only)}
          >
            <span className="text-[14px] font-black text-gray-700 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${values.is_mine_only ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-400'}`}>
                <Lock size={18} />
              </div>
              <div>
                <p className={`${values.is_mine_only ? 'text-indigo-700' : 'text-gray-700'}`}>自分だけに公開</p>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                  {values.is_mine_only ? 'グループメンバーには表示されません' : 'グループメンバーにも表示されます'}
                </p>
              </div>
            </span>
            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={values.is_mine_only}
                onChange={(e) => set('is_mine_only', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
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
          className="w-full py-5 rounded-[2rem] text-white font-black text-[18px] hover:brightness-105 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] relative overflow-hidden group"
          style={{
            background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primary-hover))',
            boxShadow: '0 20px 25px -5px var(--color-primary-shadow), 0 8px 10px -6px var(--color-primary-shadow)'
          }}
        >
          {loading ? (
            uploadTotal > 0 ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="text-[15px]">画像をアップロード中... ({uploadCurrent}/{uploadTotal})</span>
              </>
            ) : (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="text-[15px]">保存中...</span>
              </>
            )
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
