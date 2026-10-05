import { mutate } from 'swr';

export type PostUpdateAction = 'create' | 'update' | 'delete';

export interface PostUpdateDetail {
  action: PostUpdateAction;
  postId?: string;
  post?: any;
}

/**
 * 投稿の新規作成・更新・削除時に呼び出し、
 * 1) activeな useTimeline フック等へのカスタムイベント発火（SWRInfinite即時再検証）
 * 2) グローバルSWRキャッシュの包括的再検証（文字列・配列・オブジェクトキーすべてに対応）
 * を確実に行うユーティリティ
 */
export function notifyPostUpdated(detail?: PostUpdateDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:post-updated', { detail }));
    if (detail?.action === 'create') {
      window.dispatchEvent(new CustomEvent('app:post-created', { detail }));
    }
  }

  // SWR グローバルキャッシュキーの再検証
  // 配列キー (例: ['/api/posts', 'visited']) や文字列キーに対応
  mutate((key: any) => {
    if (!key) return false;
    const str = typeof key === 'string'
      ? key
      : Array.isArray(key)
      ? key.map(String).join('/')
      : typeof key === 'object'
      ? JSON.stringify(key)
      : '';

    return (
      str.includes('/api/timeline') ||
      str.includes('/api/posts') ||
      str.includes('/api/stats') ||
      str.includes('/api/map') ||
      str.includes('/api/home')
    );
  });
}
