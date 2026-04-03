-- =============================================
-- MoguReco 拡張機能用スキーマ (お気に入り & タグ管理)
-- =============================================

-- posts テーブルにお気に入りフラグを追加 (デフォルト False)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- tags テーブルに並び順カラムを追加 (デフォルト 0)
ALTER TABLE tags ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;

-- tags の重複制約 (同一ユーザー内で同じ名前のタグを複数作れない) は既に 001_init で考慮済み
-- もし UNIQUE 制約がなければここで追加
-- ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);

-- RLS ポリシーの再確認
-- posts, tags ともに既存のポリシーで user_id による保護が効いているため、新カラムも自動的に保護されます。
