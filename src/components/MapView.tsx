'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import { Star, MapPin, Navigation, Layers, Plus, Minus } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const createMarkerIcon = (color: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${color}" stroke="white" stroke-width="2"/>
  <circle cx="18" cy="18" r="8" fill="white"/>
</svg>
`)}`;

const VISITED_ICON = createMarkerIcon('#f43f5e'); // rose-500
const WANT_ICON = createMarkerIcon('#fb923c'); // orange-400
const TEMP_ICON = createMarkerIcon('#8b5cf6'); // violet-500

type Props = {
  posts: Post[];
  center: { lat: number; lng: number };
  zoom?: number;
  tempMarker?: { lat: number, lng: number, placeId?: string, name?: string, address?: string } | null;
  setTempMarker?: React.Dispatch<React.SetStateAction<{ lat: number, lng: number, placeId?: string, name?: string, address?: string } | null>>;
  initialSelectedPostId?: string | null;
};

export default function MapView({ posts, center, zoom = 14, tempMarker, setTempMarker, initialSelectedPostId }: Props) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-main',
    googleMapsApiKey: apiKey,
    language: 'ja',
    region: 'JP',
    libraries: ['places'],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (initialSelectedPostId) {
      const post = posts.find(p => p.id === initialSelectedPostId);
      if (post) {
        setSelectedPost(post);
      }
    }
  }, [initialSelectedPostId, posts]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (posts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      posts.forEach(p => {
        if (p.latitude && p.longitude) {
          bounds.extend({ lat: p.latitude, lng: p.longitude });
        }
      });
      map.fitBounds(bounds);
    }

    if (setTempMarker) {
      const cleanAddress = (addr: string) =>
        addr.replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, '');

      // Use native listener to capture POI clicks that React onClick misses
      window.google.maps.event.addListener(map, 'click', (e: any) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const placeId = e.placeId;

        // Set preliminary marker immediately
        setTempMarker({ lat, lng, placeId, name: '', address: '' });

        if (placeId) {
          const service = new window.google.maps.places.PlacesService(map);
          service.getDetails({ placeId, fields: ['name', 'formatted_address'] }, (place, status) => {
            if (status === 'OK' && place) {
              const address = cleanAddress(place.formatted_address || '');
              setTempMarker(prev => prev ? { ...prev, name: place.name || '', address } : null);
            }
          });
        } else {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const poi = results[0].address_components.find((c: any) =>
                c.types.includes('point_of_interest') || c.types.includes('establishment')
              );
              const name = poi?.long_name || '';
              const address = cleanAddress(results[0].formatted_address);
              setTempMarker(prev => prev ? { ...prev, name, address } : null);
            }
          });
        }
      });
    }
  }, [posts, setTempMarker]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const toggleMapType = () => {
    setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap');
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 0) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 0) - 1);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapRef.current) {
            mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            mapRef.current.setZoom(16);
          }
        },
        (err) => console.log('Location error:', err)
      );
    }
  };

  if (loadError) {
    return (
      <div className="w-full h-full bg-white rounded-3xl flex flex-col items-center justify-center border border-red-100 p-8 text-center bg-red-50/30">
        <MapPin className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Google Maps の読み込みエラー</h2>
        <p className="text-red-500 text-sm max-w-xs">{loadError.message}</p>
        <p className="text-gray-400 text-[10px] mt-4">APIキー、支払い設定、またはAPIの有効化を確認してください</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-white rounded-3xl flex flex-col items-center justify-center border border-gray-100 p-8 text-center">
        <MapPin className="text-orange-500 mb-4 animate-bounce" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">API キーが未設定です</h2>
        <p className="text-gray-400 text-sm max-w-xs">.env.local を確認してください</p>
      </div>
    );
  }

  return isLoaded ? (
    <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 shadow-xl relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={undefined}
        mapTypeId={mapTypeId}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        }}
      >
        {posts.map((post) => (
          post.latitude && post.longitude && (
            <Marker
              key={post.id}
              position={{ lat: post.latitude, lng: post.longitude }}
              onClick={() => setSelectedPost(post)}
              icon={{
                url: post.status === 'visited' ? VISITED_ICON : WANT_ICON,
                scaledSize: new window.google.maps.Size(36, 46),
                anchor: new window.google.maps.Point(18, 46),
              }}
            />
          )
        ))}

        {selectedPost && selectedPost.latitude && selectedPost.longitude && (
          <InfoWindow
            position={{ lat: selectedPost.latitude, lng: selectedPost.longitude }}
            onCloseClick={() => setSelectedPost(null)}
          >
            <div className="p-1 min-w-[200px]">
              {selectedPost.image_url && (
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedPost.image_url} alt={selectedPost.title} className="object-cover w-full h-full" />
                </div>
              )}
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{selectedPost.title}</h3>
              <p className="text-xs text-gray-500 mt-1 mb-2">{selectedPost.store_name || '店舗名なし'}</p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={11} fill={s <= (selectedPost.rating || 0) ? '#f59e0b' : 'none'} className={s <= (selectedPost.rating || 0) ? 'text-amber-500' : 'text-gray-200'} />
                ))}
              </div>
              <Link 
                href={`/posts/${selectedPost.id}`}
                className="block w-full text-center py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                詳細を表示
              </Link>
            </div>
          </InfoWindow>
        )}

        {tempMarker && tempMarker.lat && tempMarker.lng && (
          <Marker
            position={{ lat: tempMarker.lat, lng: tempMarker.lng }}
            icon={{
              url: TEMP_ICON,
              scaledSize: new window.google.maps.Size(36, 46),
              anchor: new window.google.maps.Point(18, 46),
            }}
          />
        )}
      </GoogleMap>

      {/* Custom Map Controls (Vertical stack on right) */}
      <div className="absolute right-3 top-24 flex flex-col gap-2 z-[200]">
        <button
          onClick={toggleMapType}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
          title="航空写真切り替え"
        >
          <Layers size={20} className={mapTypeId === 'satellite' ? 'text-orange-500' : ''} />
        </button>
        <button
          onClick={handleCurrentLocation}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
          title="現在地"
        >
          <Navigation size={20} />
        </button>
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 font-bold text-xl"
          title="拡大"
        >
          <Plus size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 font-bold text-xl"
          title="縮小"
        >
          <Minus size={20} />
        </button>
      </div>

      {/* Modern Bottom Sheet for Temporary Marker */}
      {tempMarker && tempMarker.lat && tempMarker.lng && (
        <div className="absolute bottom-6 left-4 right-4 sm:fixed sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-[100] animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100/50 flex flex-col items-center">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mb-4" />
            
            <div className="flex flex-col items-center text-center mb-5 w-full">
              <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 flex items-center justify-center gap-1.5 w-full">
                <MapPin className="text-pink-500 flex-shrink-0" size={20} />
                <span className="truncate max-w-[85%]">{tempMarker.name || '選択した地点'}</span>
              </h3>
              {tempMarker.address && (
                <p className="text-xs text-gray-500 font-bold bg-gray-50/80 px-3 py-1.5 rounded-full truncate max-w-full">
                  {tempMarker.address}
                </p>
              )}
            </div>
            
            <div className="w-full flex flex-col gap-2">
              <Link 
                href={`/posts/new?lat=${tempMarker.lat}&lng=${tempMarker.lng}${tempMarker.placeId ? `&placeId=${tempMarker.placeId}` : ''}${tempMarker.name ? `&name=${encodeURIComponent(tempMarker.name)}` : ''}${tempMarker.address ? `&address=${encodeURIComponent(tempMarker.address)}` : ''}`}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-400 hover:to-rose-300 text-white text-[15px] font-black rounded-[1.5rem] transition-all shadow-xl shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="text-lg leading-none">🍽️</span> このお店を記録する
              </Link>
              <button
                onClick={() => setTempMarker?.(null)}
                className="w-full py-3.5 bg-white border border-gray-100 hover:bg-gray-50 text-gray-400 text-sm font-bold rounded-[1.5rem] transition-colors mt-1 active:scale-[0.98]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-2xl sm:rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  );
}
