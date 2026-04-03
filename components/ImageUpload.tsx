'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';

type Props = {
  value: File | null;
  previewUrl?: string; // 編集時の既存画像URL
  onChange: (file: File | null) => void;
};

export function ImageUpload({ value, previewUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview ?? previewUrl ?? null;

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onChange(file);
  };

  const handleRemove = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileChange(file);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-black text-gray-600 ml-1 flex items-center gap-2">
        写真 <span className="text-red-500">*</span>
      </label>

      {displayUrl ? (
        <div className="relative rounded-3xl overflow-hidden bg-gray-50 aspect-video shadow-inner group">
          <Image src={displayUrl} alt="プレビュー" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-video cursor-pointer hover:border-orange-500/40 hover:bg-white hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500 group"
        >
          <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-50 transition-colors">
            <ImagePlus size={30} className="text-gray-300 group-hover:text-orange-500 transition-all duration-300 transform group-hover:scale-110" />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-900 font-bold tracking-tight">クリックまたはドラッグで画像を選択</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">PNG, JPG, WEBP (Max 10MB)</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
