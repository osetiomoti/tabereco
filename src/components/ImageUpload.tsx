'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';

type Props = {
  items: (File | string)[];
  onChange: (items: (File | string)[]) => void;
  maxFiles?: number;
};

export function ImageUpload({ items = [], onChange, maxFiles = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // URL オブジェクトを管理 (メモリリーク防止のため)
  const [localPreviewMap, setLocalPreviewMap] = useState<Map<File, string>>(new Map());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ファイルが追加されたらURLを作成
  useEffect(() => {
    const newMap = new Map(localPreviewMap);
    let changed = false;
    items.forEach(item => {
      if (item instanceof File && !newMap.has(item)) {
        newMap.set(item, URL.createObjectURL(item));
        changed = true;
      }
    });
    if (changed) {
      setLocalPreviewMap(newMap);
    }
  }, [items]);

  const handleFileChange = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const addedFiles = Array.from(newFiles);
    // 枚数制限
    if (items.length + addedFiles.length > maxFiles) {
      alert(`画像は最大${maxFiles}枚まで選択できます。`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    onChange([...items, ...addedFiles]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const itemToRemove = items[index];
    if (itemToRemove instanceof File) {
      const url = localPreviewMap.get(itemToRemove);
      if (url) URL.revokeObjectURL(url);
      
      const newMap = new Map(localPreviewMap);
      newMap.delete(itemToRemove);
      setLocalPreviewMap(newMap);
    }
    
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  // 外部からのドロップ対応
  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  // アイテム並べ替え用DND
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Firefox等で必要
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    onChange(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between ml-1">
        <label className="block text-[13px] font-black text-gray-600 flex items-center gap-2">
          写真 <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">最大{maxFiles}枚</span>
        </label>
        <span className="text-[12px] font-bold text-gray-400">{items.length} / {maxFiles}</span>
      </div>
      <p className="text-[11px] text-gray-400 ml-1 mt-0 leading-none">最初の画像がサムネイルになります。ドラッグで並び替えできます。</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        {items.map((item, i) => {
          const url = typeof item === 'string' ? item : localPreviewMap.get(item) || '';
          const isFirst = i === 0;
          return (
            <div 
              key={`item-${i}`} 
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-sm group cursor-move transition-transform duration-200 ${draggedIndex === i ? 'opacity-50 scale-95' : 'opacity-100 scale-100'} ${isFirst ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
            >
              <Image src={url} alt={`プレビュー ${i+1}`} fill className="object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
              
              {isFirst && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black shadow-md z-10 pointer-events-none">
                  サムネイル
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(i);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90 z-10"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}

        {/* アップロードボタン */}
        {items.length < maxFiles && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDropFiles}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-square cursor-pointer hover:border-orange-500/40 hover:bg-white hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-50 transition-colors pointer-events-none">
              <ImagePlus size={24} className="text-gray-300 group-hover:text-orange-500 transition-all duration-300 transform group-hover:scale-110" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold pointer-events-none">追加する</p>
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
