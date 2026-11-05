'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import { Star, MapPin, Navigation, Layers, X, ExternalLink, Plus, Minus } from 'lucide-react';
import { getImageUrl } from '@/lib/image';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Google Maps スタイルの洗練されたピン SVG URL のみ生成（コンパクト＆高精細）
const createMarkerSvgUrl = (color: string, isSelected = false) => {
  const width = isSelected ? 26 : 20;
  const height = isSelected ? 35 : 27;

  // Google Maps に忠実なスリムなティアドロップ形状
  const svg = isSelected
    ? `<svg width="${width}" height="${height}" viewBox="0 0 26 35" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-3" y="0" width="32" height="39" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <path d="M13 0C5.82 0 0 5.82 0 13C0 22.75 13 35 13 35S26 22.75 26 13C26 5.82 20.18 0 13 0Z" fill="${color}" filter="url(#shadow)" stroke="#FFFFFF" stroke-width="1.8"/>
        <circle cx="13" cy="12" r="5" fill="#FFFFFF"/>
        <circle cx="13" cy="12" r="2.5" fill="${color}"/>
      </svg>`
    : `<svg width="${width}" height="${height}" viewBox="0 0 20 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-2" y="0" width="24" height="31" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.28"/>
          </filter>
        </defs>
        <path d="M10 0C4.477 0 0 4.477 0 10C0 17.5 10 27 10 27S20 17.5 20 10C20 4.477 15.523 0 10 0Z" fill="${color}" filter="url(#shadow)" stroke="#FFFFFF" stroke-width="1.2"/>
        <circle cx="10" cy="9.5" r="3.8" fill="#FFFFFF"/>
        <circle cx="10" cy="9.5" r="1.8" fill="${color}"/>
      </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    width,
    height,
  };
};

const COLOR_VISITED = '#EA4335'; // Google Red (訪問済み)
const COLOR_WANT = '#1A73E8';    // Google Blue (行きたい)
const COLOR_TEMP = '#9333EA';    // Purple (新規指定地点)
const COLOR_MIXED = '#F59E0B';   // Amber (訪問済み+行きたい混在)

// 同一座標に複数投稿がある場合のクラスターピン SVG
const createClusterMarkerSvgUrl = (color: string, count: number, isSelected = false) => {
  const size = isSelected ? 42 : 34;
  const fontSize = count >= 10 ? 11 : 13;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="cshadow" x="-4" y="-4" width="42" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.30"/>
      </filter>
    </defs>
    <circle cx="17" cy="17" r="15" fill="${color}" filter="url(#cshadow)" stroke="#FFFFFF" stroke-width="2.5"/>
    <text x="17" y="22" text-anchor="middle" font-size="${fontSize}" font-weight="900" fill="#FFFFFF" font-family="system-ui,-apple-system,sans-serif">${count}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    size,
  };
};

// 座標キー（小数点4桁丸め）
const getCoordKey = (lat: number, lng: number) =>
  `${Math.round(lat * 10000) / 10000},${Math.round(lng * 10000) / 10000}`;

type Props = {
  posts: Post[];
  center: { lat: number; lng: number };
  zoom?: number;
  tempMarker?: { lat: number; lng: number; placeId?: string; name?: string; address?: string } | null;
  setTempMarker?: React.Dispatch<React.SetStateAction<{ lat: number; lng: number; placeId?: string; name?: string; address?: string } | null>>;
  initialSelectedPostId?: string | null;
};

export default function MapView({ posts, center, zoom = 5, tempMarker, setTempMarker, initialSelectedPostId }: Props) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-main',
    googleMapsApiKey: apiKey,
    language: 'ja',
    region: 'JP',
    libraries: ['places'],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const tempMarkerRef = useRef<google.maps.Marker | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // refs for click outside detection in map listener
  const selectedPostRef = useRef<Post | null>(null);
  selectedPostRef.current = selectedPost;
  const tempMarkerRefState = useRef(tempMarker);
  tempMarkerRefState.current = tempMarker;

  // ─── 外部 props (center, zoom) 変更時の追従 ───
  const prevCenterRef = useRef(center);
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (prevCenterRef.current.lat !== center.lat || prevCenterRef.current.lng !== center.lng) {
      mapRef.current.panTo(center);
      prevCenterRef.current = center;
    }
    if (prevZoomRef.current !== zoom) {
      mapRef.current.setZoom(zoom);
      prevZoomRef.current = zoom;
    }
  }, [center, zoom, mapReady]);

  // ─── 投稿ピンの命令的管理 ───
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !mapReady) return;

    const map = mapRef.current;
    const incoming = new Set(posts.map(p => p.id));

    // 不要になったマーカーを削除
    markersRef.current.forEach((marker, id) => {
      if (!incoming.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // 座標グループ: 同一座標の投稿をまとめる
    const coordGroups = new Map<string, Post[]>();
    posts.forEach(post => {
      if (!post.latitude || !post.longitude) return;
      const key = getCoordKey(post.latitude, post.longitude);
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key)!.push(post);
    });

    // マーカーを追加または更新
    coordGroups.forEach((groupPosts, coordKey) => {
      const isCluster = groupPosts.length > 1;
      const representativePost = groupPosts[0]; // クラスターの代表投稿

      if (isCluster) {
        // --- クラスターピン ---
        // 混在革╋訪問済みのみか行きたいのみかで色を決める
        const hasVisited = groupPosts.some(p => p.status === 'visited');
        const hasWant = groupPosts.some(p => p.status === 'want_to_go');
        const clusterColor = (hasVisited && hasWant) ? COLOR_MIXED : hasVisited ? COLOR_VISITED : COLOR_WANT;
        const isSelected = groupPosts.some(p => selectedPost?.id === p.id);
        const { url, size } = createClusterMarkerSvgUrl(clusterColor, groupPosts.length, isSelected);
        const icon = {
          url,
          scaledSize: new window.google.maps.Size(size, size),
          anchor: new window.google.maps.Point(size / 2, size / 2),
        };

        // クラスターマーカーのキーは coordKey で管理
        const clusterId = `cluster:${coordKey}`;
        let clusterMarker = markersRef.current.get(clusterId);
        if (!clusterMarker) {
          clusterMarker = new window.google.maps.Marker({
            position: { lat: representativePost.latitude!, lng: representativePost.longitude! },
            map,
            icon,
            title: `${groupPosts.length}件の記録 / ${representativePost.store_name || representativePost.title}`,
            zIndex: isSelected ? 999 : 10,
          });
          clusterMarker.addListener('click', () => {
            setSelectedPost(representativePost);
            setTempMarker?.(null);
            if (mapRef.current) {
              mapRef.current.panTo({ lat: representativePost.latitude!, lng: representativePost.longitude! });
              setTimeout(() => { mapRef.current?.panBy(0, 80); }, 80);
            }
          });
          markersRef.current.set(clusterId, clusterMarker);
        } else {
          clusterMarker.setIcon(icon);
          clusterMarker.setZIndex(isSelected ? 999 : 10);
        }

        // 個別投稿のマーカーは非表示にする（クラスターピンが代替）
        groupPosts.forEach(post => {
          const existing = markersRef.current.get(post.id);
          if (existing) {
            existing.setMap(null);
            markersRef.current.delete(post.id);
          }
        });
      } else {
        // --- 通常の単一ピン ---
        const post = representativePost;
        const clusterId = `cluster:${coordKey}`;
        // クラスターマーカーがあれば削除
        const existingCluster = markersRef.current.get(clusterId);
        if (existingCluster) {
          existingCluster.setMap(null);
          markersRef.current.delete(clusterId);
        }

        const isSelected = selectedPost?.id === post.id;
        const color = post.status === 'visited' ? COLOR_VISITED : COLOR_WANT;
        const { url, width: w, height: h } = createMarkerSvgUrl(color, isSelected);
        const icon = {
          url,
          scaledSize: new window.google.maps.Size(w, h),
          anchor: new window.google.maps.Point(w / 2, h),
        };

        let marker = markersRef.current.get(post.id);
        if (!marker) {
          marker = new window.google.maps.Marker({
            position: { lat: post.latitude!, lng: post.longitude! },
            map,
            icon,
            title: post.store_name || post.title,
            zIndex: isSelected ? 999 : 1,
          });
          marker.addListener('click', () => {
            setSelectedPost(post);
            setTempMarker?.(null);
            if (mapRef.current) {
              mapRef.current.panTo({ lat: post.latitude!, lng: post.longitude! });
              setTimeout(() => { mapRef.current?.panBy(0, 80); }, 80);
            }
          });
          markersRef.current.set(post.id, marker);
        } else {
          marker.setIcon(icon);
          marker.setZIndex(isSelected ? 999 : 1);
          marker.setTitle(post.store_name || post.title);
        }
      }
    });

    // フィルタ等で selectedPost が一覧から消えた場合は閉じる
    setSelectedPost(prev => {
      if (!prev) return null;
      return incoming.has(prev.id) ? prev : null;
    });
  }, [posts, isLoaded, mapReady, selectedPost, setTempMarker]);

  // initialSelectedPostId のハンドリング
  useEffect(() => {
    if (initialSelectedPostId) {
      const post = posts.find(p => p.id === initialSelectedPostId);
      if (post && mapRef.current) {
        setSelectedPost(post);
        if (post.latitude && post.longitude) {
          mapRef.current.panTo({ lat: post.latitude, lng: post.longitude });
          mapRef.current.setZoom(16);
          setTimeout(() => {
            mapRef.current?.panBy(0, 80);
          }, 100);
        }
      }
    }
  }, [initialSelectedPostId, posts, mapReady]);

  // ─── tempMarker の管理 ───
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !mapReady) return;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }

    if (tempMarker?.lat && tempMarker?.lng) {
      const { url: tUrl, width: tW, height: tH } = createMarkerSvgUrl(COLOR_TEMP, true);
      const tempIcon = {
        url: tUrl,
        scaledSize: new window.google.maps.Size(tW, tH),
        anchor: new window.google.maps.Point(tW / 2, tH),
      };
      tempMarkerRef.current = new window.google.maps.Marker({
        position: { lat: tempMarker.lat, lng: tempMarker.lng },
        map: mapRef.current,
        icon: tempIcon,
        zIndex: 1000,
      });

      mapRef.current.panTo({ lat: tempMarker.lat, lng: tempMarker.lng });
      setTimeout(() => {
        mapRef.current?.panBy(0, 80);
      }, 80);
    }
  }, [tempMarker, isLoaded, mapReady]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current.clear();
      if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
      if (userLocationMarkerRef.current) userLocationMarkerRef.current.setMap(null);
    };
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);

    const cleanAddress = (addr: string) =>
      addr.replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, '');

    // マップクリック時の動作（Google Maps と同様の直感的な挙動）
    window.google.maps.event.addListener(map, 'click', (e: any) => {
      // すでにピンの詳細カードが開いている場合は、マップタップでカードを閉じる
      if (selectedPostRef.current || tempMarkerRefState.current) {
        setSelectedPost(null);
        setTempMarker?.(null);
        return;
      }

      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const placeId = e.placeId;

      // Google Maps のデフォルトの POI 情報ウィンドウを抑止
      if (e.stop) e.stop();

      // 指定地点の情報を取得して下部カードを表示
      setTempMarker?.({ lat, lng, placeId, name: '選択したスポット', address: '住所を取得中...' });

      if (placeId) {
        const service = new window.google.maps.places.PlacesService(map);
        service.getDetails({ placeId, fields: ['name', 'formatted_address'] }, (place, status) => {
          if (status === 'OK' && place) {
            const address = cleanAddress(place.formatted_address || '');
            setTempMarker?.(prev => prev ? { ...prev, name: place.name || '選択したスポット', address } : null);
          }
        });
      } else {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const poi = results[0].address_components.find((c: any) =>
              c.types.includes('point_of_interest') || c.types.includes('establishment')
            );
            const name = poi?.long_name || '指定した地点';
            const address = cleanAddress(results[0].formatted_address);
            setTempMarker?.(prev => prev ? { ...prev, name, address } : null);
          }
        });
      }
    });
  }, [setTempMarker]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const toggleMapType = () => {
    setMapTypeId(prev => (prev === 'roadmap' ? 'satellite' : 'roadmap'));
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 14) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 14) - 1);
    }
  };

  // Google Maps 風の現在地取得＆青丸描画
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (mapRef.current) {
          mapRef.current.panTo(userPos);
          mapRef.current.setZoom(16);

          const userLocSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#4285F4" fill-opacity="0.22"/><circle cx="12" cy="12" r="6" fill="#FFF"/><circle cx="12" cy="12" r="4.5" fill="#1A73E8"/></svg>`;
          const userLocIcon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userLocSvg)}`,
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12),
          };
          if (!userLocationMarkerRef.current) {
            userLocationMarkerRef.current = new window.google.maps.Marker({
              position: userPos,
              map: mapRef.current,
              icon: userLocIcon,
              zIndex: 500,
            });
          } else {
            userLocationMarkerRef.current.setPosition(userPos);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.log('Location error:', err);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (loadError) {
    return (
      <div className="w-full h-full bg-white rounded-3xl flex flex-col items-center justify-center border border-red-100 p-8 text-center bg-red-50/30">
        <MapPin className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Google Maps の読み込みエラー</h2>
        <p className="text-red-500 text-sm max-w-xs">{loadError.message}</p>
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

  const isCardOpen = !!selectedPost || (!!tempMarker && !!tempMarker.lat && !!tempMarker.lng);

  return isLoaded ? (
    <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 shadow-xl relative select-none">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        mapTypeId={mapTypeId}
        options={{
          disableDefaultUI: true, // GoogleのデフォルトUIを非表示にしてスッキリ
          gestureHandling: 'greedy', // スマホで1本指ドラッグ・ピンチズーム・ダブルタップ即対応
          clickableIcons: true,
          zoomControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          keyboardShortcuts: false,
        }}
      />

      {/* 航空写真切り替えボタン (右上、検索バー・フィルターの下) */}
      <div className="absolute right-3.5 top-28 z-[150]">
        <button
          onClick={toggleMapType}
          className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all border active:scale-95 ${
            mapTypeId === 'satellite'
              ? 'bg-orange-500 text-white border-orange-600 shadow-orange-500/20'
              : 'bg-white/95 backdrop-blur-md text-gray-700 border-gray-200/80 hover:bg-gray-50'
          }`}
          title="航空写真切り替え"
        >
          <Layers size={18} />
        </button>
      </div>

      {/* 右下コントロール群 (ズームボタン ＆ 現在地ボタン、Google Maps 同様に配置) */}
      <div
        className={`absolute right-3.5 z-[150] flex flex-col items-center gap-2.5 transition-all duration-300 ease-out ${
          isCardOpen ? 'bottom-56 sm:bottom-52' : 'bottom-4 sm:bottom-6'
        }`}
      >
        {/* ズームコントロール (+ / -) */}
        <div className="flex flex-col bg-white/98 backdrop-blur-md rounded-xl shadow-md border border-gray-200/80 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors border-b border-gray-100 active:scale-95"
            title="拡大"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors active:scale-95"
            title="縮小"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* 現在地ボタン */}
        <button
          onClick={handleCurrentLocation}
          className={`w-11 h-11 bg-white/98 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-gray-200/80 hover:bg-gray-50 active:scale-95 transition-all text-gray-700 ${
            isLocating ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
          title="現在地に移動"
        >
          <Navigation size={20} className={isLocating ? 'animate-spin text-blue-500' : 'text-blue-600'} />
        </button>
      </div>

      {/* 選択した投稿のボトムシート (Google Maps スタイル) */}
      {selectedPost && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-[250] animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <div className="bg-white/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-200/80 flex flex-col">
            
            {/* 上部バー: ステータスバッジ ＆ 閉じるボタン */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                {selectedPost.status === 'visited' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    訪問済み
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    行きたい
                  </span>
                )}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <span className="text-[11px] text-gray-500 font-medium truncate max-w-[150px]">
                    #{selectedPost.tags[0].name}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => setSelectedPost(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-500 transition-colors"
                title="閉じる"
              >
                <X size={15} />
              </button>
            </div>

            {/* 本文エリア */}
            <div className="flex gap-3.5 mb-3.5">
              {/* サムネイル画像 */}
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                {selectedPost.image_url || selectedPost.image_urls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(selectedPost.image_url || selectedPost.image_urls![0])}
                    alt={selectedPost.title}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50/60 text-2xl">
                    🍽️
                  </div>
                )}
              </div>

              {/* 店舗情報 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1 mb-0.5">
                    {selectedPost.title}
                  </h3>
                  <p className="text-xs text-gray-600 font-semibold truncate flex items-center gap-1">
                    <MapPin size={12} className="text-rose-500 shrink-0" />
                    {selectedPost.store_name || '店舗名なし'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-50">
                  {selectedPost.status !== 'want_to_go' && (selectedPost.rating != null || selectedPost._avgRating != null) ? (
                    <div className="flex items-center gap-1.5">
                      {selectedPost.rating != null && selectedPost.rating > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span className="text-amber-700 font-bold text-xs">
                            {selectedPost.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {selectedPost._ratingCount && selectedPost._ratingCount > 1 ? (
                        <span className="text-[10px] text-gray-400">
                          平均 {selectedPost._avgRating?.toFixed(1)} ({selectedPost._ratingCount})
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 truncate">
                      {selectedPost.address || '位置情報あり'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-2">
              <Link
                href={`/posts/${selectedPost.id}`}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-[13px] font-bold rounded-xl transition-all shadow-md active:scale-[0.98] text-center"
              >
                詳細を見る
              </Link>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (selectedPost.store_name || selectedPost.title) + ' ' + (selectedPost.address || '')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl transition-colors active:scale-[0.98] flex items-center gap-1"
                title="Google Maps で開く"
              >
                <ExternalLink size={14} />
                <span>マップで開く</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 地点タップ時のボトムシート (Google Maps スタイル) */}
      {tempMarker && tempMarker.lat && tempMarker.lng && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-[250] animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <div className="bg-white/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-200/80 flex flex-col">
            
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                <MapPin size={11} className="text-purple-600" />
                選択したスポット
              </span>
              <button
                onClick={() => setTempMarker?.(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-500 transition-colors"
                title="閉じる"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mb-3.5">
              <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1 mb-1">
                {tempMarker.name || '指定した地点'}
              </h3>
              {tempMarker.address && (
                <p className="text-xs text-gray-500 font-medium line-clamp-2">
                  {tempMarker.address}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/posts/new?lat=${tempMarker.lat}&lng=${tempMarker.lng}${
                  tempMarker.placeId ? `&placeId=${tempMarker.placeId}` : ''
                }${tempMarker.name ? `&name=${encodeURIComponent(tempMarker.name)}` : ''}${
                  tempMarker.address ? `&address=${encodeURIComponent(tempMarker.address)}` : ''
                }`}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-[13px] font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                <span>このお店を記録する</span>
              </Link>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (tempMarker.name || '') + ' ' + (tempMarker.address || `${tempMarker.lat},${tempMarker.lng}`)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl transition-colors active:scale-[0.98] flex items-center gap-1"
                title="Google Maps で開く"
              >
                <ExternalLink size={14} />
                <span>マップで開く</span>
              </a>
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
