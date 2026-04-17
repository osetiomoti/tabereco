'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';

type Props = {
  values: File[];
  previewUrls?: string[]; // 編集時の既存画像URL
  onChange: (files: File[], removedUrls?: string[]) => void;
  maxFiles?: number;
};

export function ImageUpload({ values, previewUrls = [], onChange, maxFiles = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // URL オブジェクトを管理 (メモリリーク防止のため)
  const [localPreviewMap, setLocalPreviewMap] = useState<Map<File, string>>(new Map());
  const [removedExistingUrls, setRemovedExistingUrls] = useState<Set<string>>(new Set());

  // 実際に表示する既存URL (削除されたものを除く)
  const activePreviewUrls = previewUrls.filter(url => !removedExistingUrls.has(url));

  const totalCount = activePreviewUrls.length + values.length;

  const handleFileChange = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const addedFiles = Array.from(newFiles);
    // 枚数制限
    if (totalCount + addedFiles.length > maxFiles) {
      alert(`画像は最大${maxFiles}枚まで選択できます。`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const newMap = new Map(localPreviewMap);
    addedFiles.forEach(f => {
      newMap.set(f, URL.createObjectURL(f));
    });
    setLocalPreviewMap(newMap);

    onChange([...values, ...addedFiles], Array.from(removedExistingUrls));
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemoveFile = (fileToRemove: File) => {
    const url = localPreviewMap.get(fileToRemove);
    if (url) URL.revokeObjectURL(url);
    
    const newMap = new Map(localPreviewMap);
    newMap.delete(fileToRemove);
    setLocalPreviewMap(newMap);
    
    onChange(values.filter(f => f !== fileToRemove), Array.from(removedExistingUrls));
  };

  const handleRemoveExisting = (urlToRemove: string) => {
    const newRemoved = new Set(removedExistingUrls);
    newRemoved.add(urlToRemove);
    setRemovedExistingUrls(newRemoved);
    onChange(values, Array.from(newRemoved));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between ml-1">
        <label className="block text-sm font-black text-gray-600 flex items-center gap-2">
          写真 <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">最大{maxFiles}枚</span>
        </label>
        <span className="text-[12px] font-bold text-gray-400">{totalCount} / {maxFiles}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* 既存画像のプレビュー */}
        {activePreviewUrls.map((url, i) => (
          <div key={`existing-${i}`} className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-sm group">
            <Image src={url} alt="プレビュー" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            <button
              type="button"
              onClick={() => handleRemoveExisting(url)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* 新規追加画像のプレビュー */}
        {values.map((file, i) => (
          <div key={`new-${i}`} className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-sm group">
            <Image src={localPreviewMap.get(file) || ''} alt="プレビュー" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            <button
              type="button"
              onClick={() => handleRemoveFile(file)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* アップロードボタン */}
        {totalCount < maxFiles && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-square cursor-pointer hover:border-orange-500/40 hover:bg-white hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-50 transition-colors">
              <ImagePlus size={24} className="text-gray-300 group-hover:text-orange-500 transition-all duration-300 transform group-hover:scale-110" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold">追加する</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </div>
  );
}
