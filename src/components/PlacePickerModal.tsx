'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { X, Search, MapPin, Navigation, Loader2 } from 'lucide-react';

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

export function PlacePickerModal({ isOpen, onClose, onSelect, initialCenter }: Props) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script-main',
    googleMapsApiKey: apiKey,
    language: 'ja',
    region: 'JP',
    libraries: ['places'],
  });

  const [center, setCenter] = useState(initialCenter || { lat: 35.6812, lng: 139.7671 }); // Default Tokyo
  const [marker, setMarker] = useState<PlaceInfo | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize center to user location if not provided
  useEffect(() => {
    if (isOpen && !initialCenter && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [isOpen, initialCenter]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const placeId = (e as any).placeId;

    fetchPlaceDetails(lat, lng, placeId);
  };

  const fetchPlaceDetails = async (lat: number, lng: number, placeId?: string) => {
    setLoading(true);
    const geocoder = new window.google.maps.Geocoder();
    
    try {
      if (placeId) {
        // If clicked on a POI (Point of Interest)
        const service = new window.google.maps.places.PlacesService(mapRef.current!);
        service.getDetails({ placeId, fields: ['name', 'formatted_address', 'geometry', 'place_id'] }, (place, status) => {
          if (status === 'OK' && place) {
            setMarker({
              lat: place.geometry?.location?.lat() || lat,
              lng: place.geometry?.location?.lng() || lng,
              name: place.name || '不明な場所',
              address: (place.formatted_address || '').replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, ''),
              placeId: place.place_id
            });
          }
          setLoading(false);
        });
      } else {
        // Reverse geocoding for generic coordinate click
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const poi = results[0].address_components.find(c => c.types.includes('point_of_interest') || c.types.includes('establishment'));
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
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const info = {
          lat,
          lng,
          name: place.name || '',
          address: (place.formatted_address || '').replace(/^日本、/, ''),
          placeId: place.place_id,
        };
        setMarker(info);
        setCenter({ lat, lng });
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(17);
      }
    }
  };

  const handleConfirm = () => {
    if (marker) {
      onSelect(marker);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-white animate-in fade-in slide-in-from-bottom duration-300" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10">
        <button type="button" onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-gray-600">
          キャンセル
        </button>
        <h2 className="text-[17px] font-black text-gray-900">場所を選択</h2>
        <button 
          type="button"
          onClick={handleConfirm} 
          disabled={!marker}
          className={`text-sm font-black ${marker ? 'text-pink-500' : 'text-gray-300'}`}
        >
          決定
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          {isLoaded ? (
            <input
              type="text"
              id="pac-input-picker"
              placeholder="場所を検索..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500/20 transition-all"
              onFocus={(e) => {
                if (!autocompleteRef.current) {
                  const autocomplete = new window.google.maps.places.Autocomplete(e.target as HTMLInputElement, {
                    fields: ['name', 'formatted_address', 'geometry', 'place_id'],
                    componentRestrictions: { country: 'jp' }
                  });
                  autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry && place.geometry.location) {
                      const lat = place.geometry.location.lat();
                      const lng = place.geometry.location.lng();
                      setMarker({
                        lat,
                        lng,
                        name: place.name || '',
                        address: (place.formatted_address || '').replace(/^日本、/, ''),
                        placeId: place.place_id,
                      });
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
      <div className="flex-1 relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={16}
            onLoad={onMapLoad}
            onClick={handleMapClick}
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
                setCenter({ lat, lng });
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(17);
              });
            }
          }}
          className="absolute right-4 bottom-24 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-600 active:scale-95 transition-all border border-gray-100"
        >
          <Navigation size={22} />
        </button>

        {/* Selected Info Card (Floating) */}
        {marker && (
          <div className="absolute bottom-6 left-4 right-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-pink-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-pink-500">
                <MapPin size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-base leading-tight mb-1 truncate">{marker.name}</p>
                <p className="text-[11px] text-gray-500 font-bold line-clamp-2 leading-relaxed">{marker.address}</p>
              </div>
              {loading && <Loader2 className="animate-spin text-pink-300" size={16} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
