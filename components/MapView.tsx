'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};


type Props = {
  posts: Post[];
  center: { lat: number; lng: number };
  zoom?: number;
};

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export default function MapView({ posts, center, zoom = 14 }: Props) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    if (posts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      posts.forEach(p => {
        if (p.latitude && p.longitude) {
          bounds.extend({ lat: p.latitude, lng: p.longitude });
        }
      });
      map.fitBounds(bounds);
    }
    setMap(map);
  }, [posts]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

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
        options={{
          zoomControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {posts.map((post) => (
          post.latitude && post.longitude && (
            <Marker
              key={post.id}
              position={{ lat: post.latitude, lng: post.longitude }}
              onClick={() => setSelectedPost(post)}
              icon={{
                url: post.status === 'visited' 
                  ? 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png' 
                  : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
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
                onClick={(e) => {
                  // Next.js Link handles this, but ensuring InfoWindow closing doesn't block it
                }}
              >
                詳細を表示
              </Link>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  ) : (
    <div className="w-full h-full bg-gray-50 animate-pulse rounded-2xl sm:rounded-3xl flex items-center justify-center border border-gray-100">
      <MapPin className="text-gray-200 animate-bounce" size={48} />
    </div>
  );
}
