export type GeoBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type PrefectureInfo = {
  name: string;
  bounds: GeoBounds;
  center: { lat: number; lng: number };
};

/**
 * 47都道府県の境界データ (本土主要部・生活圏を中心としたBounds)
 * Google Maps の fitBounds() に渡すことで、都道府県全体が適切な縮尺で画面に収まる
 */
export const PREFECTURE_BOUNDS: Record<string, GeoBounds> = {
  '北海道': { north: 45.55, south: 41.35, east: 145.82, west: 139.33 },
  '青森県': { north: 41.56, south: 40.22, east: 141.68, west: 139.49 },
  '岩手県': { north: 40.45, south: 38.74, east: 142.07, west: 140.66 },
  '宮城県': { north: 39.00, south: 37.77, east: 141.67, west: 140.27 },
  '秋田県': { north: 40.52, south: 38.90, east: 140.99, west: 139.69 },
  '山形県': { north: 39.16, south: 37.73, east: 140.65, west: 139.53 },
  '福島県': { north: 37.97, south: 36.79, east: 141.05, west: 139.16 },
  '茨城県': { north: 36.94, south: 35.74, east: 140.85, west: 139.68 },
  '栃木県': { north: 37.15, south: 36.20, east: 140.29, west: 139.33 },
  '群馬県': { north: 37.06, south: 35.98, east: 139.66, west: 138.40 },
  '埼玉県': { north: 36.29, south: 35.75, east: 139.90, west: 138.71 },
  '千葉県': { north: 36.11, south: 34.90, east: 140.88, west: 139.74 },
  '東京都': { north: 35.898, south: 35.501, east: 139.919, west: 138.943 }, // 本土部中心
  '神奈川県': { north: 35.67, south: 35.12, east: 139.79, west: 138.91 },
  '新潟県': { north: 38.56, south: 36.73, east: 139.90, west: 137.64 },
  '富山県': { north: 36.98, south: 36.27, east: 137.76, west: 136.77 },
  '石川県': { north: 37.52, south: 36.07, east: 137.36, west: 136.24 },
  '福井県': { north: 36.30, south: 35.34, east: 136.83, west: 135.45 },
  '山梨県': { north: 35.97, south: 35.17, east: 139.14, west: 138.18 },
  '長野県': { north: 37.03, south: 35.23, east: 138.75, west: 137.32 },
  '岐阜県': { north: 36.47, south: 35.14, east: 137.65, west: 136.27 },
  '静岡県': { north: 35.65, south: 34.59, east: 139.16, west: 137.47 },
  '愛知県': { north: 35.424, south: 34.580, east: 137.838, west: 136.674 },
  '三重県': { north: 35.26, south: 33.72, east: 136.99, west: 135.85 },
  '滋賀県': { north: 35.70, south: 34.79, east: 136.45, west: 135.86 },
  '京都府': { north: 35.78, south: 34.71, east: 136.04, west: 134.86 },
  '大阪府': { north: 35.050, south: 34.270, east: 135.750, west: 135.090 },
  '兵庫県': { north: 35.68, south: 34.15, east: 135.47, west: 134.25 },
  '奈良県': { north: 34.78, south: 33.86, east: 136.23, west: 135.52 },
  '和歌山県': { north: 34.38, south: 33.43, east: 135.98, west: 134.99 },
  '鳥取県': { north: 35.61, south: 35.12, east: 134.45, west: 133.17 },
  '島根県': { north: 36.35, south: 34.30, east: 133.39, west: 131.66 },
  '岡山県': { north: 35.35, south: 34.30, east: 134.41, west: 133.26 },
  '広島県': { north: 35.10, south: 34.03, east: 133.47, west: 132.03 },
  '山口県': { north: 34.61, south: 33.71, east: 132.50, west: 130.85 },
  '徳島県': { north: 34.24, south: 33.54, east: 134.82, west: 133.69 },
  '香川県': { north: 34.57, south: 34.01, east: 134.44, west: 133.45 },
  '愛媛県': { north: 34.31, south: 32.90, east: 133.69, west: 132.01 },
  '高知県': { north: 33.88, south: 32.70, east: 134.31, west: 132.48 },
  '福岡県': { north: 33.95, south: 33.00, east: 131.02, west: 130.04 },
  '佐賀県': { north: 33.62, south: 32.96, east: 130.55, west: 129.74 },
  '長崎県': { north: 34.73, south: 32.56, east: 130.37, west: 128.60 },
  '熊本県': { north: 33.19, south: 32.07, east: 131.33, west: 129.98 },
  '大分県': { north: 33.74, south: 32.72, east: 132.10, west: 130.83 },
  '宮崎県': { north: 32.84, south: 31.35, east: 131.88, west: 130.70 },
  '鹿児島県': { north: 32.32, south: 30.98, east: 131.20, west: 129.98 },
  '沖縄県': { north: 26.88, south: 26.04, east: 128.33, west: 127.64 },
};

export const PREFECTURE_NAMES = Object.keys(PREFECTURE_BOUNDS);

/**
 * 住所文字列から都道府県名を抽出する
 */
export function extractPrefectureFromNameOrAddress(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const pref of PREFECTURE_NAMES) {
    if (text.includes(pref)) {
      return pref;
    }
    // 「東京都」→「東京」、「愛知県」→「愛知」など都道府県接尾辞なしでもチェック
    const shortName = pref.replace(/[都道府県]$/, '');
    if (text.includes(shortName)) {
      return pref;
    }
  }
  return null;
}

/**
 * 緯度経度から該当する都道府県を判定する
 * 1. Bounds 内判定（中心からの距離で最近傍を選択）
 */
export function getPrefectureFromCoords(lat: number, lng: number): string | null {
  const matches: { name: string; distSq: number }[] = [];

  for (const [name, b] of Object.entries(PREFECTURE_BOUNDS)) {
    if (lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east) {
      const cLat = (b.north + b.south) / 2;
      const cLng = (b.east + b.west) / 2;
      const distSq = Math.pow(lat - cLat, 2) + Math.pow(lng - cLng, 2);
      matches.push({ name, distSq });
    }
  }

  if (matches.length > 0) {
    matches.sort((a, b) => a.distSq - b.distSq);
    return matches[0].name;
  }

  // Bounds外でも日本国内であれば最も中心座標が近い都道府県を返す
  let closestName: string | null = null;
  let minDistance = Infinity;

  for (const [name, b] of Object.entries(PREFECTURE_BOUNDS)) {
    const cLat = (b.north + b.south) / 2;
    const cLng = (b.east + b.west) / 2;
    const distSq = Math.pow(lat - cLat, 2) + Math.pow(lng - cLng, 2);
    if (distSq < minDistance) {
      minDistance = distSq;
      closestName = name;
    }
  }

  return closestName;
}

/**
 * 都道府県名からBoundsを取得する
 */
export function getBoundsForPrefecture(prefName: string): GeoBounds | null {
  if (PREFECTURE_BOUNDS[prefName]) {
    return PREFECTURE_BOUNDS[prefName];
  }
  const matched = extractPrefectureFromNameOrAddress(prefName);
  return matched ? PREFECTURE_BOUNDS[matched] : null;
}

