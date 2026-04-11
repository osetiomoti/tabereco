'use client';

import { useRef, useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
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

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export function PlaceAutocomplete({ onPlaceSelected, defaultValue = '' }: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-ja',
    googleMapsApiKey: apiKey,
    libraries,
    language: 'ja',
    region: 'JP',
  });

  // サービスを初期化
  const initServices = useCallback(() => {
    if (isLoaded && !serviceRef.current) {
      serviceRef.current = new google.maps.places.AutocompleteService();
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  const fetchPredictions = (value: string) => {
    initServices();
    if (!serviceRef.current || value.length < 1) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setLoadingPredictions(true);
    serviceRef.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'jp' },
        language: 'ja',
        // 'establishment' のみのタイプ制限を外し、幅広い候補を取得（住所も含む）
      } as any,
      (results, status) => {
        setLoadingPredictions(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results); // 最大で10件まで返ってくる
          setIsOpen(true);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      }
    );
  };

  const handleInput = (value: string) => {
    setInputValue(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    setIsOpen(false);
    setInputValue(prediction.structured_formatting.main_text);

    // place_id から詳細情報（緯度経度）を取得する
    if (!geocoderRef.current) {
      initServices();
    }
    geocoderRef.current?.geocode({ placeId: prediction.place_id, language: 'ja' } as any, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        onPlaceSelected({
          name: prediction.structured_formatting.main_text,
          address: results[0].formatted_address || prediction.description,
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: prediction.place_id,
        });
      } else {
        // 緯度経度が取れなかった場合も名前だけ返す
        onPlaceSelected({
          name: prediction.structured_formatting.main_text,
          address: prediction.description,
          lat: 0,
          lng: 0,
          placeId: prediction.place_id,
        });
      }
    });
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

  if (loadError) return <div className="text-red-500 text-[11px] ml-1 mt-1 font-bold">マップの読み込みに失敗しました</div>;
  if (!isLoaded) return (
    <div className="relative w-full">
      <input
        disabled
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-10 text-gray-300 cursor-not-allowed"
        placeholder="地図を読み込み中..."
      />
      <div className="absolute left-3.5 top-4">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    </div>
  );

  return (
    <div className="relative w-full group" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onFocus={() => inputValue && predictions.length > 0 && setIsOpen(true)}
          placeholder="店名・スポット名を入力（例：マクドナルド 渋谷）"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 pl-10 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm group-hover:border-gray-300"
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

      {/* カスタム候補リスト */}
      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-[100000] left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-y-auto max-h-[65vh] py-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {predictions.map((p, i) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                i === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
              } ${i !== 0 ? 'border-t border-gray-50' : ''}`}
            >
              <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
                <MapPin size={14} className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm text-gray-900 leading-snug truncate">
                  {/* キーワードに一致する部分をオレンジでハイライト */}
                  {p.structured_formatting.main_text}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                  {p.structured_formatting.secondary_text || p.description}
                </p>
              </div>
            </li>
          ))}
          <li className="px-4 py-2 text-center">
            <span className="text-[10px] text-gray-300 font-bold">Powered by Google Maps</span>
          </li>
        </ul>
      )}
    </div>
  );
}
