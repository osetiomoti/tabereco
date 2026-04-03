-- =============================================
-- モグレコ データベーススキーマ
-- Supabase SQL Editor で実行してください
-- =============================================

-- posts テーブル
CREATE TABLE posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  store_name  TEXT,
  comment     TEXT,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  image_url   TEXT NOT NULL,
  visited_at  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);

-- ─── Row Level Security ───────────────────────

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 自分の投稿のみ閲覧
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の投稿のみ作成
CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ更新
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

-- 自分の投稿のみ削除
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Storage ─────────────────────────────────
-- Supabase ダッシュボード → Storage → New bucket
-- Bucket Name: meal-images
-- Public: ON (チェックを入れる)
--
-- その後、以下のポリシーを Storage → Policies で設定:
-- Authenticated users can upload: storage.foldername(name)[1] = auth.uid()::text
-- Public read: bucket_id = 'meal-images'
