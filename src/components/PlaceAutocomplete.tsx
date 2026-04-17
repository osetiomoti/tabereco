'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

type Props = {
  onPlaceSelected: (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
  }) => void;
  defaultValue?: string;
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

export function PlaceAutocomplete({ onPlaceSelected, defaultValue = '' }: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchPredictions = async (value: string) => {
    if (value.length < 1) {
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = async (prediction: AutocompletePrediction) => {
    setIsOpen(false);
    const { placeId, structuredFormat, text } = prediction.placePrediction;
    const name = structuredFormat.mainText.text;
    const fallbackAddress = structuredFormat.secondaryText?.text || text.text;
    setInputValue(name);

    try {
      const res = await fetch(`/api/places/details?placeId=${placeId}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      
      onPlaceSelected({
        name: data.displayName?.text || name,
        address: data.formattedAddress || fallbackAddress,
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        placeId,
      });
    } catch (e) {
      console.error('Place details fetch failed:', e);
      // 失敗した場合でも名前とIDだけ返す
      onPlaceSelected({
        name,
        address: fallbackAddress,
        lat: 0,
        lng: 0,
        placeId,
      });
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
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onFocus={() => inputValue && predictions.length > 0 && setIsOpen(true)}
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

      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-[100000] left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-y-auto max-h-[50vh] sm:max-h-[65vh] py-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {predictions.map((p, i) => {
            const pred = p.placePrediction;
            return (
              <li
                key={pred.placeId}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                  i === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
                } ${i !== 0 ? 'border-t border-gray-50' : ''}`}
              >
                <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
                  <MapPin size={14} className="text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900 leading-snug truncate">
                    {pred.structuredFormat.mainText.text}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                    {pred.structuredFormat.secondaryText?.text || pred.text.text}
                  </p>
                </div>
              </li>
            );
          })}
          <li className="px-4 py-2 text-center">
            <span className="text-[10px] text-gray-300 font-bold">Powered by Google Maps</span>
          </li>
        </ul>
      )}
    </div>
  );
}
