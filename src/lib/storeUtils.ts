/**
 * 店舗識別・グルーピングのための共通ユーティリティ
 * tabereco（食べレコ）用
 *
 * 優先順位:
 * 1. google_place_id が存在する場合 → place_<id>
 * 2. store_name と address 両方が存在する場合 → name+address の組み合わせ
 * 3. それ以外 → post_<id>（個別扱い、誤統合しない）
 */

export type StoreIdentifiable = {
  id: string;
  google_place_id?: string | null;
  store_name?: string | null;
  address?: string | null;
};

/**
 * 投稿から店舗識別キーを生成する。
 * 同一店舗と判断できる投稿には同じキーが返る。
 */
export function getStoreKey(item: StoreIdentifiable): string {
  if (item.google_place_id?.trim()) {
    return `place_${item.google_place_id.trim()}`;
  }
  const name = item.store_name?.trim();
  const address = item.address?.trim();
  if (name && address) {
    // 店名と住所の両方がある場合のみ統合（誤統合を避ける）
    return `name_${normalizeStoreKey(name)}_addr_${normalizeStoreKey(address)}`;
  }
  // 識別情報が不十分な場合は投稿IDで個別扱い
  return `post_${item.id}`;
}

/**
 * 店舗キー比較用の正規化（前後の空白除去・全角スペースを半角に）
 */
function normalizeStoreKey(str: string): string {
  return str
    .trim()
    .replace(/　/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * 2つの投稿が同じ店舗かどうかを判定する。
 */
export function isSameStore(a: StoreIdentifiable, b: StoreIdentifiable): boolean {
  // どちらかにpost_で始まるキーがある場合は個別扱い
  const keyA = getStoreKey(a);
  const keyB = getStoreKey(b);
  if (keyA.startsWith('post_') || keyB.startsWith('post_')) return false;
  return keyA === keyB;
}

/**
 * 投稿のリストを店舗単位でグルーピングする。
 * 返り値: Map<storeKey, T[]>
 */
export function groupPostsByStore<T extends StoreIdentifiable>(posts: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const post of posts) {
    const key = getStoreKey(post);
    const existing = map.get(key) || [];
    existing.push(post);
    map.set(key, existing);
  }
  return map;
}

/**
 * 訪問者リストからユニークユーザーIDのセットを作成する。
 */
export function uniqueUserIds(userIds: string[]): Set<string> {
  return new Set(userIds);
}

/**
 * 代表画像URLを選択する（写真がある最新の記録を優先）。
 * @param items - 各アイテムは image_url, image_urls, created_at を持つ
 */
export function pickRepresentativeImage(
  items: Array<{
    image_url?: string | null;
    image_urls?: string[];
    created_at?: string | Date;
  }>
): string | null {
  // 写真があるアイテムを日時の新しい順にソート
  const withImages = items.filter((item) => {
    const hasUrl = item.image_url?.trim();
    const hasUrls = item.image_urls && item.image_urls.length > 0;
    return hasUrl || hasUrls;
  });

  if (withImages.length === 0) return null;

  // 最新のものを選択
  const sorted = withImages.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const best = sorted[0];
  if (best.image_urls && best.image_urls.length > 0) return best.image_urls[0];
  return best.image_url || null;
}

/**
 * 既存の投稿から新規投稿作成画面（/posts/new）への遷移URLを生成する。
 * 店舗情報（店名・住所・Google Place ID・座標・タグ）を引き継ぐ。
 */
export function buildNewPostUrlFromStore(post: {
  id?: string;
  store_name?: string | null;
  title?: string | null;
  address?: string | null;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: any[];
}): string {
  const params = new URLSearchParams();
  const name = post.store_name?.trim() || post.title?.trim();
  if (name) params.set('name', name);
  if (post.address?.trim()) params.set('address', post.address.trim());
  if (post.google_place_id?.trim()) params.set('placeId', post.google_place_id.trim());
  if (post.latitude != null) params.set('lat', String(post.latitude));
  if (post.longitude != null) params.set('lng', String(post.longitude));
  if (post.tags && post.tags.length > 0) {
    const tagNames = post.tags
      .map((t) => (typeof t === 'string' ? t : t.name || t.tag?.name))
      .filter(Boolean);
    if (tagNames.length > 0) params.set('tags', tagNames.join(','));
  }
  if (post.id) params.set('fromPostId', post.id);
  params.set('status', 'visited');
  return `/posts/new?${params.toString()}`;
}

