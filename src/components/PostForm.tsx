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
import type { Post, PostFormValues, PostStatus, BathTemperatureInfo } from '@/lib/types';
import { Loader2, MapPin, Globe, Hash, Check, Tag as TagIcon, Plus, X, Heart, ChevronDown, Lock } from 'lucide-react';
import { useAppType } from '@/contexts/AppTypeContext';

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
  const { appType } = useAppType();
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

  // Helper for bath_temperatures initial value
  const initBathTemps = (): BathTemperatureInfo[] => {
    if (post?.bath_temperatures && Array.isArray(post.bath_temperatures) && post.bath_temperatures.length > 0) {
      return post.bath_temperatures as BathTemperatureInfo[];
    }
    return [{ id: crypto.randomUUID(), name: '', min: 38, max: 38 }];
  };

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
    temperature_min: post ? post.temperature_min : null,
    temperature_max: post ? post.temperature_max : null,
    spring_temp_type: post?.spring_temp_type ?? null,
    spring_temp_custom: post?.spring_temp_custom ?? null,
    spring_temp_min: post?.spring_temp_min ?? null,
    spring_temp_max: post?.spring_temp_max ?? null,
    cold_bath_temp: post?.cold_bath_temp ?? null,
    is_source_fed: post?.is_source_fed ?? null,
    bath_count: post?.bath_count ?? null,
    spring_quality: post?.spring_quality ?? null,
    stay_type: post?.stay_type ?? null,
    bath_type: post?.bath_type ?? null,
    hidden_spring_rating: post?.hidden_spring_rating ?? null,
    has_amenities: post?.has_amenities ?? null,
    other_memo: post?.other_memo ?? null,
    spring_qualities: (post?.spring_qualities as string[]) ?? [],
    bath_types: (post?.bath_types as string[]) ?? [],
    source_managements: (post?.source_managements as string[]) ?? [],
    shampoo_type: post?.shampoo_type ?? null,
    facility_type: post?.facility_type ?? null,
    bath_temperatures: initBathTemps(),
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
        // 旅レコ（温泉）専用フィールド (legacy)
        spring_temp_type: values.tags.includes('温泉') ? values.spring_temp_type : null,
        spring_temp_custom: values.tags.includes('温泉') ? values.spring_temp_custom : null,
        spring_temp_min: values.tags.includes('温泉') ? values.spring_temp_min : null,
        spring_temp_max: values.tags.includes('温泉') ? values.spring_temp_max : null,
        cold_bath_temp: values.tags.includes('温泉') ? values.cold_bath_temp : null,
        is_source_fed: values.tags.includes('温泉') ? values.is_source_fed : null,
        bath_count: values.tags.includes('温泉') ? values.bath_count : null,
        spring_quality: values.tags.includes('温泉') ? values.spring_quality : null,
        stay_type: values.tags.includes('温泉') ? values.stay_type : null,
        bath_type: values.tags.includes('温泉') ? values.bath_type : null,
        hidden_spring_rating: values.tags.includes('温泉') ? values.hidden_spring_rating : null,
        has_amenities: values.tags.includes('温泉') ? values.has_amenities : null,
        other_memo: values.tags.includes('温泉') ? values.other_memo : null,
        // V2 hot spring fields
        spring_qualities: values.tags.includes('温泉') ? values.spring_qualities : [],
        bath_types: values.tags.includes('温泉') ? values.bath_types : [],
        source_managements: values.tags.includes('温泉') ? values.source_managements : [],
        shampoo_type: values.tags.includes('温泉') ? values.shampoo_type : null,
        facility_type: values.tags.includes('温泉') ? values.facility_type : null,
        bath_temperatures: values.tags.includes('温泉') ? values.bath_temperatures : null,
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

        {/* 温泉 V2 詳細フィールド */}
        {values.tags.includes('温泉') && (
          <div className="space-y-5 animate-in slide-in-from-top-2 fade-in duration-300 border border-orange-100 rounded-[1.5rem] p-5 bg-orange-50/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">♨️</span>
              <span className="text-sm font-black text-orange-700 tracking-wider">温泉詳細情報</span>
            </div>

            {/* 施設タイプ: 温泉/銭湯/カスタム */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 tracking-widest flex items-center justify-between">
                🏠 施設タイプ
                {values.facility_type && (
                  <button type="button" onClick={() => set('facility_type', null)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={12} /></button>
                )}
              </label>
              <div className="flex gap-2">
                {['温泉', '銭湯', 'スパ'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('facility_type', values.facility_type === opt ? null : opt)}
                    className={`flex-1 py-2.5 text-[12px] font-black rounded-xl border transition-all ${
                      values.facility_type === opt
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="カスタム..."
                  value={['温泉', '銭湯', 'スパ', '', null].includes(values.facility_type) ? '' : (values.facility_type ?? '')}
                  onChange={e => set('facility_type', e.target.value || null)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            {/* 泉質（複数選択） */}
            <HotSpringMultiSelect
              label="💧 泉質"
              options={['単純温泉', '塩化物泉', '炭酸水素塩泉', '硫酸塩泉', '二酸化炭素泉', '含鉄泉', '硫黄泉', 'アルカリ性単純温泉', '酸性泉', '放射能泉']}
              selected={values.spring_qualities}
              onChange={v => set('spring_qualities', v)}
            />

            {/* 浴槽情報（複数選択） */}
            <HotSpringMultiSelect
              label="🛁 浴槽情報"
              options={['内湯', '露天風呂', '混浴内湯', '混浴露天', '家族風呂', '水風呂', 'サウナ', 'ジャグジー', '洞窟風呂', '展望風呂']}
              selected={values.bath_types}
              onChange={v => set('bath_types', v)}
            />

            {/* 源泉・加水加温（複数選択） */}
            <HotSpringMultiSelect
              label="🌊 源泉・管理方法"
              options={['源泉掛け流し', '加水あり', '加温あり', '循環あり', '消毒あり', '塩素不使用']}
              selected={values.source_managements}
              onChange={v => set('source_managements', v)}
            />

            {/* シャンプー */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 tracking-widest flex items-center justify-between">
                🧴 シャンプー・石鹸
                {values.shampoo_type && (
                  <button type="button" onClick={() => set('shampoo_type', null)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={12} /></button>
                )}
              </label>
              <div className="flex gap-2">
                {['あり', 'なし'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('shampoo_type', values.shampoo_type === opt ? null : opt)}
                    className={`flex-1 py-2.5 text-[12px] font-black rounded-xl border transition-all ${
                      values.shampoo_type === opt
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="カスタム..."
                  value={['あり', 'なし', '', null].includes(values.shampoo_type) ? '' : (values.shampoo_type ?? '')}
                  onChange={e => set('shampoo_type', e.target.value || null)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>

            {/* 宿泊 or 日帰り */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 tracking-widest flex items-center justify-between">
                🏨 宿泊タイプ
                {values.stay_type && (
                  <button type="button" onClick={() => set('stay_type', null)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={12} /></button>
                )}
              </label>
              <div className="flex gap-2">
                {(['日帰り', '宿泊'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('stay_type', values.stay_type === opt ? null : opt)}
                    className={`flex-1 py-2.5 text-[13px] font-black rounded-xl border transition-all ${
                      values.stay_type === opt
                        ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 秘湯感（星評価） */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 tracking-widest flex items-center justify-between">
                🏔️ 秘湯感
                {values.hidden_spring_rating != null && (
                  <button type="button" onClick={() => set('hidden_spring_rating', null)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={12} /></button>
                )}
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => set('hidden_spring_rating', values.hidden_spring_rating === star ? null : star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      (values.hidden_spring_rating ?? 0) >= star ? 'text-amber-400' : 'text-gray-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
                {values.hidden_spring_rating != null && (
                  <span className="text-xs text-amber-600 font-bold ml-2">{values.hidden_spring_rating}/5</span>
                )}
              </div>
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 tracking-widest">📝 その他メモ</label>
              <textarea
                value={values.other_memo ?? ''}
                onChange={e => set('other_memo', e.target.value || null)}
                placeholder="泉質、雰囲気など..."
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200 font-bold resize-none text-sm"
              />
            </div>

            {/* 浴槽ごとの温度設定 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-gray-500 tracking-widest">🌡️ 浴槽ごとの温度</label>
                <button
                  type="button"
                  onClick={() => {
                    const newBath: BathTemperatureInfo = { id: crypto.randomUUID(), name: '', min: 38, max: 38 };
                    set('bath_temperatures', [...values.bath_temperatures, newBath]);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-xl text-[11px] font-black hover:bg-orange-200 transition-all"
                >
                  <Plus size={12} strokeWidth={3} /> 浴槽を追加
                </button>
              </div>

              <div className="space-y-3">
                {values.bath_temperatures.map((bath, idx) => (
                  <BathTemperatureCard
                    key={bath.id}
                    bath={bath}
                    onUpdate={(updated) => {
                      const newArr = [...values.bath_temperatures];
                      newArr[idx] = updated;
                      set('bath_temperatures', newArr);
                    }}
                    onRemove={values.bath_temperatures.length > 1 ? () => {
                      set('bath_temperatures', values.bath_temperatures.filter((_, i) => i !== idx));
                    } : undefined}
                  />
                ))}
              </div>
            </div>
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
              <span>{isEdit ? '内容を更新する' : (appType === 'tabireco' ? 'この場所を記録する' : 'この食事を記録する')}</span>
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

// ─── 温泉用サブコンポーネント ───────────────────────────────────

type HotSpringMultiSelectProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
};

function HotSpringMultiSelect({ label, options, selected, onChange }: HotSpringMultiSelectProps) {
  const [customInput, setCustomInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (v && !selected.includes(v)) {
      onChange([...selected, v]);
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-gray-500 tracking-widest flex items-center justify-between">
        {label}
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-gray-300 hover:text-red-400 transition-colors text-[10px] font-bold">すべてクリア</button>
        )}
      </label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-[11px] font-black">
              {s}
              <button type="button" onClick={() => toggle(s)} className="text-orange-400 hover:text-red-500 transition-colors">
                <X size={10} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] text-gray-500 font-bold hover:border-orange-300 transition-all"
      >
        <span>{selected.length === 0 ? '選択してください...' : `${selected.length}件選択中`}</span>
        <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${
                selected.includes(opt)
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt}
              {selected.includes(opt) && <Check size={12} strokeWidth={3} className="text-orange-500" />}
            </button>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-1 flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
              placeholder="カスタム..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <button
              type="button"
              onClick={addCustom}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[11px] font-black hover:bg-orange-600 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 浴槽温度カード ───────────────────────────────────

const TEMP_PRESETS = [
  { label: 'サウナ', min: 80, max: null, color: '#7c3aed' },
  { label: '熱め', min: 43, max: null, color: '#dc2626' },
  { label: '高め', min: 41, max: 42, color: '#ea580c' },
  { label: '適温', min: 39, max: 40, color: '#f59e0b' },
  { label: '標準', min: 37, max: 38, color: '#22c55e' },
  { label: 'ぬるめ', min: 35, max: 36, color: '#06b6d4' },
  { label: '低め', min: 25, max: 34, color: '#3b82f6' },
  { label: '水風呂', min: null, max: 24, color: '#0ea5e9' },
];

function getColorForTemp(temp: number | null): string {
  if (temp === null) return '#94a3b8';
  if (temp >= 80) return '#7c3aed';
  if (temp >= 43) return '#dc2626';
  if (temp >= 41) return '#ea580c';
  if (temp >= 39) return '#f59e0b';
  if (temp >= 37) return '#22c55e';
  if (temp >= 35) return '#06b6d4';
  if (temp >= 25) return '#3b82f6';
  return '#0ea5e9';
}

type BathTemperatureCardProps = {
  bath: BathTemperatureInfo;
  onUpdate: (updated: BathTemperatureInfo) => void;
  onRemove?: () => void;
};

function BathTemperatureCard({ bath, onUpdate, onRemove }: BathTemperatureCardProps) {
  const displayTemp = bath.min !== null ? bath.min : bath.max;
  const tempColor = getColorForTemp(displayTemp);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdate({ ...bath, min: val, max: val });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: tempColor }}
        />
        <input
          type="text"
          value={bath.name}
          onChange={e => onUpdate({ ...bath, name: e.target.value })}
          placeholder="浴槽名（例: 内湯、露天、水風呂）"
          className="flex-1 text-[13px] font-bold text-gray-700 border-none outline-none bg-transparent placeholder-gray-300"
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-gray-200 hover:text-red-400 transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5 flex-wrap">
        {TEMP_PRESETS.map(p => {
          const isActive = bath.min === p.min && bath.max === p.max;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onUpdate({ ...bath, min: p.min, max: p.max })}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                isActive ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: p.color } : {}}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Range slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
          <span>10℃</span>
          <span
            className="text-sm font-black px-2 py-0.5 rounded-lg text-white transition-all"
            style={{ backgroundColor: tempColor }}
          >
            {displayTemp !== null ? `${displayTemp}℃` : '未設定'}
          </span>
          <span>100℃</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={displayTemp ?? 38}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${tempColor} 0%, ${tempColor} ${((displayTemp ?? 38) - 10) / 90 * 100}%, #e5e7eb ${((displayTemp ?? 38) - 10) / 90 * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>

      {/* Custom range input */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-gray-400 font-bold shrink-0">カスタム:</span>
        <input
          type="number"
          step="0.5"
          value={bath.min ?? ''}
          onChange={e => onUpdate({ ...bath, min: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="下限"
          className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-bold focus:outline-none focus:ring-1 focus:ring-orange-200"
        />
        <span className="text-gray-400">〜</span>
        <input
          type="number"
          step="0.5"
          value={bath.max ?? ''}
          onChange={e => onUpdate({ ...bath, max: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="上限"
          className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-bold focus:outline-none focus:ring-1 focus:ring-orange-200"
        />
        <span className="text-gray-400">℃</span>
        <span className="text-gray-300 text-[10px] ml-1">
          {bath.min !== null && bath.max === null ? `${bath.min}℃以上` :
           bath.min === null && bath.max !== null ? `${bath.max}℃以下` :
           bath.min !== null && bath.max !== null && bath.min !== bath.max ? `${bath.min}〜${bath.max}℃` : ''}
        </span>
      </div>
    </div>
  );
}
