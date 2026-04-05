'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from './ImageUpload';
import { StarInput } from './StarRating';
import { uploadImage, replaceImage, createPost, updatePost } from '@/lib/api/posts';
import { todayString } from '@/lib/utils';
import { getExifGPS } from '@/lib/exif';
import type { Post, PostFormValues, PostStatus } from '@/lib/types';
import { Loader2, MapPin, Globe, Lock, Hash, Check, Tag as TagIcon, Plus, X, Users } from 'lucide-react';

import { PlaceAutocomplete } from './PlaceAutocomplete';
import { TagSelector } from './TagSelector';

type Props = {
  /** 編集時は既存の投稿データを渡す */
  post?: Post;
};

export function PostForm({ post }: Props) {
  const router = useRouter();
  const isEdit = Boolean(post);

  const [values, setValues] = useState<PostFormValues>({
    title: post?.title ?? '',
    store_name: post?.store_name ?? '',
    comment: post?.comment ?? '',
    rating: post?.rating ?? 3,
    visited_at: post?.visited_at ?? todayString(),
    image: null,
    status: post?.status ?? 'visited',
    is_public: post?.is_public ?? false,
    is_favorite: post?.is_favorite ?? false,
    tags: post?.tags?.map(t => t.name) ?? [],
    address: post?.address ?? '',
    google_place_id: post?.google_place_id ?? '',
    latitude: post?.latitude ?? undefined,
    longitude: post?.longitude ?? undefined,
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
      const { getJoinedGroups } = await import('@/lib/api/groups');
      const data = await getJoinedGroups();
      setGroups(data);
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
  const handleImageChange = async (file: File | null) => {
    set('image', file);
    if (file) {
      setExtractingGps(true);
      const coords = await getExifGPS(file);
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
      let image_url = post?.image_url ?? null;

      if (values.image) {
        image_url = isEdit && post?.image_url
          ? await replaceImage(post.image_url, values.image)
          : await uploadImage(values.image);
      }


      const postData = {
        title: values.title?.trim() || `${values.store_name.trim()}での記録`,
        store_name: values.store_name.trim(),
        comment: values.comment.trim() || null,
        rating: values.rating,
        image_url,
        visited_at: values.visited_at,
        status: values.status,
        is_public: values.is_public,
        address: values.address || null,
        google_place_id: values.google_place_id || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
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
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 sm:pb-0">
      {/* 1. 写真 */}
      <ImageUpload
        value={values.image ?? null}
        previewUrl={post?.image_url ?? undefined}
        onChange={handleImageChange}
      />

      {/* ステータス切り替え */}
      <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl shadow-sm">
        <button
          type="button"
          onClick={() => set('status', 'visited')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
            values.status === 'visited'
              ? 'bg-white text-orange-600 shadow-md transform scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          行った
        </button>
        <button
          type="button"
          onClick={() => set('status', 'want_to_go')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
            values.status === 'want_to_go'
              ? 'bg-white text-orange-600 shadow-md transform scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          行きたい
        </button>
      </div>



      {/* 食事名 & 店名検索 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-600 ml-1">
            食事名
          </label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="例：伝説の唐揚げ"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-600 ml-1 flex items-center justify-between">
            <span>店名・スポット検索 <span className="text-red-500">*</span></span>
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setAddressLanguage('ja')}
                className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${addressLanguage === 'ja' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}
              >
                JP
              </button>
              <button
                type="button"
                onClick={() => setAddressLanguage('en')}
                className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${addressLanguage === 'en' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}
              >
                EN
              </button>
            </div>
          </label>
          <PlaceAutocomplete
            onPlaceSelected={handlePlaceSelected}
            defaultValue={values.store_name}
          />
        </div>
      </div>

      {/* 場所・住所 */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-600 ml-1 flex items-center gap-1.5">
          <MapPin size={16} className="text-orange-500" /> 場所の住所
        </label>
        <div className="relative">
          <input
            type="text"
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="住所を入力、または写真/店名から自動取得"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-sm pr-10"
          />
          {extractingGps && (
            <div className="absolute right-3 top-4">
              <Loader2 size={20} className="text-orange-500 animate-spin" />
            </div>
          )}
          {values.latitude && !extractingGps && (
            <div className="absolute right-3 top-4 text-green-500" title="位置取得済み">
              <Check size={20} />
            </div>
          )}
        </div>
      </div>

      {/* タグ選択 */}
      <div className="space-y-3">
        <label className="block text-sm font-black text-gray-600 ml-1 flex items-center gap-2">
          <TagIcon size={18} className="text-orange-500" /> 
          タグ
          <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full ml-1 font-bold">複数選択可</span>
        </label>

          <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-gray-50 border border-gray-100 rounded-3xl group-focus-within:border-orange-500/30 transition-all">
            <div className="flex-1 flex flex-wrap gap-2 min-w-[200px]">
              {values.tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-100 text-gray-700 rounded-full text-sm font-bold shadow-sm animate-in zoom-in duration-300"
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
                placeholder="＋ タグを入力"
                className="flex-1 min-w-[120px] bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 placeholder-gray-400 font-bold"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setIsTagSelectorOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 self-end"
            >
              <Plus size={16} strokeWidth={3} />
              <span>既存のタグ</span>
            </button>
          </div>

        <TagSelector
          isOpen={isTagSelectorOpen}
          onClose={() => setIsTagSelectorOpen(false)}
          selectedTags={values.tags}
          onSelect={(tags) => set('tags', tags)}
        />

        {/* グループシェア設定 (ソーシャル拡張) */}
        {groups.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100 animate-in slide-in-from-bottom duration-500">
            <label className="block text-sm font-black text-gray-900 ml-1 flex items-center gap-2">
              <Users size={16} className="text-orange-500" strokeWidth={3} />
              グループにシェア 
              <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full ml-1 uppercase tracking-tighter">New</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {groups.map(group => {
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
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${
                      isSelected 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <Hash size={14} strokeWidth={isSelected ? 3 : 2} />
                    {group.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 font-bold ml-1">※ 選択したグループの仲間にこの場所が公開されます</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* 日付 */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-600 ml-1">日付</label>
          <input
            type="date"
            value={values.visited_at}
            onChange={(e) => set('visited_at', e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-sm [color-scheme:light]"
          />
        </div>
        {/* 評価 */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-600 ml-1">評価</label>
          <StarInput value={values.rating} onChange={(r) => set('rating', r)} />
        </div>
      </div>

      {/* コメント */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-600 ml-1">コメント</label>
        <textarea
          value={values.comment}
          onChange={(e) => set('comment', e.target.value)}
          placeholder="味の感想、おすすめポイントなど..."
          rows={3}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-sm resize-none"
        />
      </div>

      {/* エラー */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-500 font-bold">
          {error}
        </div>
      )}

      {/* 送信ボタン - スマホの親指で押しやすいよう最下部に配置 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 size={24} className="animate-spin text-white" />
            保存中...
          </>
        ) : (
          isEdit ? '変更を保存する' : 'この食事を記録する'
        )}
      </button>
    </form>
  );
}
