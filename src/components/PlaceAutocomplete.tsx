'use client';

import { useRef, useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

type Props = {
  onPlaceSelected: (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
  }) => void;
  defaultValue?: string;
  onInputChange?: (value: string) => void;
};

// Places API (New) returns suggestion objects
type AutocompletePrediction = {
  placePrediction: {
    placeId: string;
    place: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
  };
};

export function PlaceAutocomplete({ onPlaceSelected, defaultValue = '', onInputChange }: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // コンテナ外タップ・クリックで候補を閉じる
  useEffect(() => {
    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
    };
  }, []);

  const fetchPredictions = async (value: string) => {
    if (value.trim().length < 1) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      
      if (data.suggestions) {
        setPredictions(data.suggestions);
        setIsOpen(data.suggestions.length > 0);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    } catch (e) {
      console.error('Failed to fetch predictions', e);
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleInput = (value: string) => {
    setInputValue(value);
    setActiveIndex(-1);
    if (onInputChange) onInputChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = async (prediction: AutocompletePrediction) => {
    const { placeId, structuredFormat, text } = prediction.placePrediction;
    const name = structuredFormat.mainText.text;
    const rawSecondary = structuredFormat.secondaryText?.text || text.text || '';
    const cleanSecondary = rawSecondary
      .replace(/^日本(、|,\s*)?/, '')
      .replace(/〒?\d{3}-\d{4}\s*/, '')
      .replace(/^日本(、|,\s*)?/, '')
      .trim();

    // futaribaと同じく、選択した瞬間に候補を閉じ、入力欄・住所を即座に反映
    setInputValue(name);
    setIsOpen(false);
    setPredictions([]);

    onPlaceSelected({
      name,
      address: cleanSecondary,
      lat: 0,
      lng: 0,
      placeId,
    });

    // バックグラウンドで詳細（正確な緯度経度・住所）を取得して更新
    try {
      const res = await fetch(`/api/places/details?placeId=${placeId}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      
      onPlaceSelected({
        name: data.displayName?.text || name,
        address: data.formattedAddress
          ? data.formattedAddress.replace(/^日本(、|,\s*)?/, '').replace(/〒?\d{3}-\d{4}\s*/, '').replace(/^日本(、|,\s*)?/, '').trim()
          : cleanSecondary,
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        placeId,
      });
    } catch (e) {
      console.error('Place details fetch failed:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full group" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (inputValue && predictions.length > 0) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 300)}
          placeholder="店名・スポット名を入力（例：マクドナルド 渋谷）"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 pl-10 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm group-hover:border-gray-300 text-[16px]"
        />
        <div className="absolute left-3.5 top-4">
          {loadingPredictions
            ? <Loader2 size={18} className="animate-spin text-orange-400" />
            : <Search size={18} className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          }
        </div>
        {inputValue && (
          <button
            type="button"
            onClick={() => { setInputValue(''); setPredictions([]); setIsOpen(false); }}
            className="absolute right-3.5 top-4 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* futaribaと同じコンテナ構造: onMouseDown preventDefault + button(onClick) + overscroll-contain */}
      {isOpen && predictions.length > 0 && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 mt-1 w-full bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 max-h-52 overflow-y-auto overscroll-contain z-[100000]"
        >
          {predictions.map((p, i) => {
            const pred = p.placePrediction;
            const mainText = pred.structuredFormat.mainText.text;
            const secondaryText = pred.structuredFormat.secondaryText?.text || pred.text.text;

            return (
              <button
                key={pred.placeId ?? i}
                type="button"
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-4 py-3 hover:bg-orange-50 active:bg-orange-100 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors ${
                  i === activeIndex ? 'bg-orange-50' : ''
                }`}
              >
                <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">📍</span>
                <div className="text-left min-w-0 flex-1">
                  <p className="font-bold text-gray-800 text-[14px] truncate">{mainText}</p>
                  {secondaryText && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{secondaryText}</p>
                  )}
                </div>
              </button>
            );
          })}
          <div className="px-4 py-2 text-center bg-gray-50/50">
            <span className="text-[10px] text-gray-300 font-bold">Powered by Google Maps</span>
          </div>
        </div>
      )}
    </div>
  );
}
