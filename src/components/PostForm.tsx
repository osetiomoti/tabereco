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
import { Loader2, MapPin, Globe, Lock, Hash, Check, Tag as TagIcon, Plus, X, Users } from 'lucide-react';

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
    images: [],
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

  // 画像が選択された時に EXIF から位置情報を抽出
  const handleImagesChange = async (files: File[], removedUrls?: string[]) => {
    set('images', files);
    
    // 既存画像の削除処理 (編集時)
    if (removedUrls && removedUrls.length > 0) {
      set('image_urls', values.image_urls.filter(url => !removedUrls.includes(url)));
    }

    // 最初のファイルからEXIF情報を取得 (必要に応じて)
    if (files.length > 0 && files[0]) {
      setExtractingGps(true);
      const coords = await getExifGPS(files[0]);
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
      let uploadedUrls: string[] = [];

      if (values.images.length > 0) {
        const uploadPromises = values.images.map(file => uploadFile(file));
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.filter((url): url is string => url !== null);
      }

      // 新しくアップロードした画像と、既存の保持された画像を結合
      const finalImageUrls = [...values.image_urls, ...uploadedUrls];
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
    <form onSubmit={handleSubmit} className="space-y-10 pb-20 sm:pb-10">
      {/* 1. 写真と基本ステータス */}
      <section className="space-y-6">
        <ImageUpload
          values={values.images}
          previewUrls={post?.image_urls ?? (post?.image_url ? [post.image_url] : [])}
          onChange={handleImagesChange}
          maxFiles={5}
        />

        <div className="flex p-1.5 bg-gray-100/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-inner mx-1">
          <button
            type="button"
            onClick={() => set('status', 'visited')}
            className={`flex-1 py-3 text-[13.5px] font-black rounded-[14px] transition-all duration-300 ${
              values.status === 'visited'
                ? 'bg-white text-orange-600 shadow-lg shadow-black/5 ring-1 ring-black/5 scale-[1.02]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行った
          </button>
          <button
            type="button"
            onClick={() => set('status', 'want_to_go')}
            className={`flex-1 py-3 text-[13.5px] font-black rounded-[14px] transition-all duration-300 ${
              values.status === 'want_to_go'
                ? 'bg-white text-orange-600 shadow-lg shadow-black/5 ring-1 ring-black/5 scale-[1.02]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            行きたい
          </button>
        </div>
      </section>

      {/* 2. お店・場所の情報 */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="bg-[#a68c7e] text-white px-6 py-3.5 text-[13px] font-black tracking-widest uppercase">
          Shop & Place
        </div>
        <div className="p-6 space-y-7">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Shop Name *</label>
            <PlaceAutocomplete
              onPlaceSelected={handlePlaceSelected}
              defaultValue={values.store_name}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Address</label>
            <div className="relative">
              <input
                type="text"
                value={values.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="住所を入力（店名から自動取得も可）"
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all text-sm font-bold shadow-inner"
              />
              {extractingGps && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 size={20} className="text-orange-500 animate-spin" />
                </div>
              )}
              {values.latitude && !extractingGps && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                  <Check size={20} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Meal Name</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="例：伝説の唐揚げ"
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all text-sm font-bold shadow-inner"
            />
          </div>
        </div>
      </section>

      {/* 3. 記録の詳細 */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="bg-[#a68c7e] text-white px-6 py-3.5 text-[13px] font-black tracking-widest uppercase">
          Rating & Review
        </div>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Visit Date</label>
              <input
                type="date"
                value={values.visited_at}
                onChange={(e) => set('visited_at', e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all text-sm font-bold shadow-inner [color-scheme:light]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block text-right">Rating</label>
              <div className="flex justify-end">
                <StarInput value={values.rating} onChange={(r) => set('rating', r)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Memo</label>
            <textarea
              value={values.comment}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="味の感想、おすすめポイントなど..."
              rows={4}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all text-sm font-bold shadow-inner resize-none"
            />
          </div>

          <div className="space-y-4 pt-2">
            <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1 block">Tags</label>
            <div className="flex flex-wrap gap-2.5 min-h-[50px] p-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] shadow-inner">
              {values.tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl text-xs font-black shadow-sm"
                >
                  #{tag}
                  <X 
                    size={14} 
                    className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer" 
                    onClick={() => set('tags', values.tags.filter(t => t !== tag))}
                  />
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="＋ 新規タグ"
                className="bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 placeholder-gray-400 font-bold flex-1 min-w-[100px]"
              />
              <button
                type="button"
                onClick={() => setIsTagSelectorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#a68c7e]/10 text-[#a68c7e] rounded-xl text-[11px] font-black hover:bg-[#a68c7e]/20 transition-all border border-[#a68c7e]/20"
              >
                <TagIcon size={14} /> 選択リスト
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 共有・プライバシー */}
      <section className="bg-white border-y sm:border border-gray-100 sm:rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="bg-[#a68c7e] text-white px-6 py-3.5 text-[13px] font-black tracking-widest uppercase">
          Sharing & Privacy
        </div>
        <div className="p-6 space-y-8">
          {groups.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-gray-400 tracking-widest uppercase ml-1">Share with Groups</label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroupIds.length === groups.length) setSelectedGroupIds([]);
                    else setSelectedGroupIds(groups.map((g: any) => g.id));
                  }}
                  className="text-[10px] font-black text-[#a68c7e] px-2 py-1 rounded-lg hover:bg-[#a68c7e]/5"
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
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all border ${
                        isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200'
                      }`}
                    >
                      {group.name}
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-1">
            <span className="text-sm font-black text-gray-700 flex items-center gap-2">
              <Lock size={16} className="text-[#a68c7e]" /> プライベート（自分のみ）
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={values.is_mine_only}
                onChange={(e) => set('is_mine_only', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-orange-500 transition-colors shadow-inner"></div>
            </label>
          </div>
        </div>
      </section>

      {/* エラー表示 */}
      {error && (
        <div className="mx-4 rounded-2xl bg-red-50 border border-red-100 px-5 py-4 text-xs font-black text-red-500 animate-in slide-in-from-bottom-2">
          ⚠️ {error}
        </div>
      )}

      {/* 送信ボタン */}
      <div className="px-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-[#a68c7e] to-[#7d675b] text-white font-black text-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-xl shadow-[#a68c7e]/30 flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin text-white" />
          ) : (
            <>
              <Check size={24} strokeWidth={3} />
              {isEdit ? '変更を保存する' : 'この食事を記録する'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
