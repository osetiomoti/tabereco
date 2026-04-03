-- =============================================
-- Storage(画像保存)のセキュリティポリシーを最も簡単に設定（再修正版）
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて実行してください
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 既存の全ポリシーをリセット
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- 1. 画像の閲覧は誰でもOK
CREATE POLICY "Public read"
ON storage.objects FOR SELECT USING (bucket_id = 'meal-images');

-- 2. 画像のアップロードはログイン中ならどこでもOK（最も簡単な設定）
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'meal-images');

-- 3. 画像の更新もログイン中ならOK
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'meal-images');

-- 4. 画像の削除もログイン中ならOK
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'meal-images');
