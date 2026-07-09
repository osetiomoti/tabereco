// ─── 型定義 ───────────────────────────────────────────────

export type PostStatus = 'visited' | 'want_to_go';

export type Post = {
  id: string;
  user_id: string;
  title: string;
  store_name: string | null;
  comment: string | null;
  rating: number;
  image_url?: string | null;
  image_urls: string[];
  visited_at?: string | null; // YYYY-MM-DD
  created_at: string;
  status: PostStatus;
  is_public: boolean;
  is_favorite: boolean;
  is_mine_only: boolean;
  price_min: number | null;
  price_max: number | null;
  google_place_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  tags?: Tag[];
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
};

export type PostInsert = {
  user_id: string;
  store_name: string; // 必須化
  title?: string;     // 任意化
  comment?: string | null;
  rating: number;
  image_url?: string | null;
  image_urls?: string[];
  visited_at?: string | null;
  status?: PostStatus;
  is_public?: boolean;
  is_favorite?: boolean;
  is_mine_only?: boolean;
  price_min?: number | null;
  price_max?: number | null;
  google_place_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PostUpdate = {
  store_name?: string; // 必須ではないが、更新時は文字列
  title?: string;
  comment?: string | null;
  rating?: number;
  image_url?: string | null;
  image_urls?: string[];
  visited_at?: string;
  status?: PostStatus;
  is_public?: boolean;
  is_favorite?: boolean;
  is_mine_only?: boolean;
  price_min?: number | null;
  price_max?: number | null;
  google_place_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PostFormValues = {
  store_name: string; // 必須項目
  title?: string;     // 任意項目
  comment: string;
  rating: number;
  visited_at: string; // empty string when not set
  images: File[];
  image_urls: string[]; // for keeping existing images during edit
  status: PostStatus;
  is_public: boolean;
  is_favorite: boolean;
  tags: string[]; // タグ名の配列
  price_min: number | null;
  price_max: number | null;
  address?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  is_mine_only: boolean;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type PostTag = {
  post_id: string;
  tag_id: string;
};
