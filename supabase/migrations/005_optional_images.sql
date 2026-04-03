-- MoguReco: 写真を任意項目に変更するマイグレーション
-- 既存の posts テーブルの image_url カラムの NOT NULL 制約を解除します。

ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL;
