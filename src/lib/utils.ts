/**
 * 日付文字列 (YYYY-MM-DD) を日本語表示に変換
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * 今日の日付を YYYY-MM-DD 形式で返す
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * クラス名を結合するユーティリティ
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Google Maps URL を安全に生成する
 * 1. google_place_id がある場合: &query_place_id を付与（最優先）
 * 2. 欠損時のフォールバック:
 *    - 店名だけの一致による誤認を防ぐため、store_name と address の両方があれば「store_name address」で検索
 *    - どちらか一方のみの場合はある方を使用
 *    - なければ緯度経度、タイトルを使用
 */
export function getGoogleMapsUrl(post: {
  store_name?: string | null;
  address?: string | null;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  title?: string | null;
}): string {
  const parts: string[] = [];
  if (post.store_name?.trim()) {
    parts.push(post.store_name.trim());
  }
  if (post.address?.trim()) {
    parts.push(post.address.trim());
  }

  let query = parts.join(' ');
  if (!query && post.latitude != null && post.longitude != null) {
    query = `${post.latitude},${post.longitude}`;
  }
  if (!query && post.title?.trim()) {
    query = post.title.trim();
  }

  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || '')}`;
  return post.google_place_id?.trim()
    ? `${base}&query_place_id=${encodeURIComponent(post.google_place_id.trim())}`
    : base;
}
