'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

type PlaceInfo = {
  lat: number;
  lng: number;
  name: string;
  address: string;
  placeId?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (place: PlaceInfo) => void;
  initialCenter?: { lat: number, lng: number };
};

const LIBS: ('places')[] = ['places'];

export function PlacePickerModal({ isOpen, onClose, onSelect, initialCenter }: Props) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script-main',
    googleMapsApiKey: apiKey,
    language: 'ja',
    region: 'JP',
    libraries: LIBS,
  });

  const [center, setCenter] = useState(initialCenter || { lat: 35.6812, lng: 139.7671 });
  const [marker, setMarker] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMarker(null);
      if (!initialCenter && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      } else if (initialCenter) {
        setCenter(initialCenter);
      }
    }
  }, [isOpen, initialCenter]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Use Google Maps native event to ensure POI clicks are captured even
    // when the native info window intercepts the React onClick event
    window.google.maps.event.addListener(map, 'click', (e: any) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const placeId = e.placeId;
      // Set a preliminary marker so the card appears immediately
      setMarker(prev => prev ?? {
        lat, lng,
        name: '読み込み中...',
        address: '',
      });
      fetchPlaceDetails(lat, lng, placeId);
    });
  }, [fetchPlaceDetails]);

  const fetchPlaceDetails = useCallback((lat: number, lng: number, placeId?: string) => {
    if (!isLoaded) return;
    setLoading(true);

    if (placeId && mapRef.current) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        { placeId, fields: ['name', 'formatted_address', 'geometry', 'place_id'] },
        (place, status) => {
          if (status === 'OK' && place) {
            setMarker({
              lat: place.geometry?.location?.lat() || lat,
              lng: place.geometry?.location?.lng() || lng,
              name: place.name || '不明な場所',
              address: (place.formatted_address || '').replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, ''),
              placeId: place.place_id,
            });
          }
          setLoading(false);
        }
      );
    } else {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const poi = results[0].address_components.find(
            c => c.types.includes('point_of_interest') || c.types.includes('establishment')
          );
          setMarker({
            lat,
            lng,
            name: poi?.long_name || results[0].address_components[0].long_name,
            address: results[0].formatted_address.replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, ''),
          });
        }
        setLoading(false);
      });
    }
  }, [isLoaded]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const placeId = (e as any).placeId;
    fetchPlaceDetails(lat, lng, placeId);
  }, [fetchPlaceDetails]);

  const handleConfirm = () => {
    if (marker) {
      onSelect(marker);
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ flexShrink: 0 }} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
        <button type="button" onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-gray-600 min-w-[60px]">
          キャンセル
        </button>
        <h2 className="text-[17px] font-black text-gray-900">場所を選択</h2>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!marker}
          style={{ minWidth: 60, textAlign: 'right' }}
          className={`text-sm font-black ${marker ? 'text-pink-500' : 'text-gray-300'}`}
        >
          決定
        </button>
      </div>

      {/* Search Input */}
      <div style={{ flexShrink: 0 }} className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          {isLoaded ? (
            <input
              type="text"
              id="pac-input-picker"
              placeholder="場所を検索..."
              autoComplete="off"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 transition-all"
              onFocus={(e) => {
                if (!autocompleteRef.current) {
                  const autocomplete = new window.google.maps.places.Autocomplete(
                    e.target as HTMLInputElement,
                    {
                      fields: ['name', 'formatted_address', 'geometry', 'place_id'],
                      componentRestrictions: { country: 'jp' },
                    }
                  );
                  autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry && place.geometry.location) {
                      const lat = place.geometry.location.lat();
                      const lng = place.geometry.location.lng();
                      const info: PlaceInfo = {
                        lat,
                        lng,
                        name: place.name || '',
                        address: (place.formatted_address || '').replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, ''),
                        placeId: place.place_id,
                      };
                      setMarker(info);
                      setCenter({ lat, lng });
                      mapRef.current?.panTo({ lat, lng });
                      mapRef.current?.setZoom(17);
                    }
                  });
                  autocompleteRef.current = autocomplete;
                }
              }}
            />
          ) : (
            <div className="w-full h-[52px] bg-gray-50 rounded-2xl animate-pulse" />
          )}
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={16}
            onLoad={onMapLoad}
            options={{
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: true,
              gestureHandling: 'greedy',
            }}
          >
            {marker && marker.lat && marker.lng && (
              <Marker
                position={{ lat: marker.lat, lng: marker.lng }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-pink-500" size={32} />
          </div>
        )}

        {/* Current Location Button */}
        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const newCenter = { lat, lng };
                setCenter(newCenter);
                mapRef.current?.panTo(newCenter);
                mapRef.current?.setZoom(17);
              });
            }
          }}
          className="absolute right-4 bottom-32 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-600 active:scale-95 transition-all border border-gray-100"
          style={{ zIndex: 10 }}
        >
          <Navigation size={22} />
        </button>

        {/* Selected Info Card */}
        {marker && (
          <div
            className="absolute left-4 right-4 animate-in slide-in-from-bottom-4 duration-300"
            style={{ bottom: 24, zIndex: 10 }}
          >
            <div className="bg-white rounded-3xl p-4 shadow-2xl border border-pink-100 flex items-start gap-3">
              <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-pink-500">
                <MapPin size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-base leading-tight mb-0.5 truncate">{marker.name}</p>
                <p className="text-[11px] text-gray-500 font-bold line-clamp-2 leading-relaxed">{marker.address}</p>
              </div>
              {loading && <Loader2 className="animate-spin text-pink-300 flex-shrink-0" size={16} />}
            </div>

            {/* 決定 Button inside card for easy access */}
            <button
              type="button"
              onClick={handleConfirm}
              className="mt-2 w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white text-[15px] font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all"
            >
              この場所を選択
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
