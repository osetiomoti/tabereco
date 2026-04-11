'use client';

import { useRef, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-ja',
    googleMapsApiKey: apiKey,
    libraries,
    language: 'ja',
    region: 'JP',
  });

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
    // 検索結果を日本国内、または「店」に絞るなどのオプション設定も可能
    autocomplete.setFields(['address_components', 'geometry', 'name', 'place_id', 'formatted_address']);
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const address = place.formatted_address || '';
      const name = place.name || '';
      const placeId = place.place_id || '';

      if (lat && lng && name) {
        onPlaceSelected({ name, address, lat, lng, placeId });
        setInputValue(name);
      }
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
    <div className="relative w-full group">
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'jp' }
        }}
      >
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="店名を入力（例：麺屋 モグレコ）"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 pl-10 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm group-hover:border-gray-300"
          />
          <div className="absolute left-3.5 top-4">
            <Search size={18} className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          </div>
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue('')}
              className="absolute right-3.5 top-4 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </Autocomplete>

      {/* Google Autocomplete dropdown (Light Theme) */}
      <style jsx global>{`
        .pac-container {
          background-color: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 16px !important;
          margin-top: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          font-family: inherit !important;
          z-index: 9999 !important;
          padding: 8px 0 !important;
          max-height: 70vh !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .pac-item {
          border-top: 1px solid #f3f4f6 !important;
          padding: 14px 16px !important;
          color: #6b7280 !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          line-height: 1.6 !important;
          min-height: 52px !important;
        }
        .pac-item:first-of-type {
          border-top: none !important;
        }
        .pac-item:hover, .pac-item-selected {
          background-color: #fff7ed !important;
        }
        .pac-item-query {
          color: #111827 !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          padding-right: 8px !important;
        }
        .pac-matched {
          color: #f97316 !important;
        }
        .pac-icon {
          display: none !important;
        }
        .pac-secondary-text {
          color: #9ca3af !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
}
