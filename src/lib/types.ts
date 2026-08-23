// ─── 型定義 ───────────────────────────────────────────────

export type PostStatus = 'visited' | 'want_to_go';

export type Post = {
  id: string;
  user_id: string;
  title: string;
  store_name: string | null;
  comment: string | null;
  rating: number | null;
  image_url?: string | null;
  image_urls: string[];
  visited_at?: string | null; // YYYY-MM-DD
  created_at: string;
  status: PostStatus;
  app_type?: string; // 'tabereco' | 'tabireco'
  is_public: boolean;
  is_favorite: boolean;
  is_mine_only: boolean;
  price_min: number | null;
  price_max: number | null;
  google_place_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  visit_count: number;
  temperature_min: number | null;
  temperature_max: number | null;
  spring_temp_type?: string | null;
  spring_temp_custom?: string | null;
  spring_temp_min?: number | null;
  spring_temp_max?: number | null;
  cold_bath_temp?: number | null;
  is_source_fed?: string | null;
  bath_count?: number | null;
  spring_quality?: string | null;
  stay_type?: string | null;
  bath_type?: string | null;
  hidden_spring_rating?: number | null;
  has_amenities?: boolean | null;
  other_memo?: string | null;

  spring_qualities: string[];
  bath_types: string[];
  source_managements: string[];
  bath_temperatures?: any | null; // Json
  stay_types: string[];
  facility_types: string[];
  shampoo_types: string[];

  _avgRating?: number | null;
  _ratingCount?: number;
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
  rating: number | null;
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
  visit_count?: number;
  temperature_min?: number | null;
  temperature_max?: number | null;

  spring_qualities?: string[];
  bath_types?: string[];
  source_managements?: string[];
  bath_temperatures?: any | null;
  stay_types?: string[];
  facility_types?: string[];
  shampoo_types?: string[];
};

export type PostUpdate = {
  store_name?: string; // 必須ではないが、更新時は文字列
  title?: string;
  comment?: string | null;
  rating?: number | null;
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
  visit_count?: number;
  temperature_min?: number | null;
  temperature_max?: number | null;

  spring_qualities?: string[];
  bath_types?: string[];
  source_managements?: string[];
  bath_temperatures?: any | null;
  stay_types?: string[];
  facility_types?: string[];
  shampoo_types?: string[];
};

export type BathTemperatureInfo = {
  id: string;
  name: string;
  min: number | null;
  max: number | null;
  labels?: string[]; // 体感ラベル（複数選択可、温度とは独立）
};

export type PostFormValues = {
  store_name: string; // 必須項目
  title?: string;     // 任意項目
  comment: string;
  rating: number | null;
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
  temperature_min: number | null;
  temperature_max: number | null;
  spring_temp_type: string | null;
  spring_temp_custom: string | null;
  spring_temp_min: number | null;
  spring_temp_max: number | null;
  cold_bath_temp: number | null;
  is_source_fed: string | null;
  bath_count: number | null;
  spring_quality: string | null;
  bath_type: string | null;
  hidden_spring_rating: number | null;
  has_amenities: boolean | null;

  spring_qualities: string[];
  bath_types: string[];
  source_managements: string[];
  bath_temperatures: BathTemperatureInfo[];
  
  stay_types: string[];
  facility_types: string[];
  shampoo_types: string[];
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
