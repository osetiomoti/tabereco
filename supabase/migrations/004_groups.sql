-- =============================================
-- MoguReco 拡張機能用スキーマ (グループ & ソーシャル共有)
-- =============================================

-- profiles テーブル (表示名とアイコン用)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- groups テーブル (グループ本体)
CREATE TABLE IF NOT EXISTS groups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- group_members テーブル (複数グループ参加対応)
CREATE TABLE IF NOT EXISTS group_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- post_groups テーブル (多重シェア対応)
CREATE TABLE IF NOT EXISTS post_groups (
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  shared_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (post_id, group_id)
);

-- ─── Row Level Security (RLS) ──────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_groups ENABLE ROW LEVEL SECURITY;

-- Profiles: 誰でも閲覧可能、自分のみ更新可能
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups: メンバーのみ閲覧可能
CREATE POLICY "Members can view groups" ON groups FOR SELECT 
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid()));
CREATE POLICY "Standard creation for authenticated" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members: メンバーのみ閲覧可能
CREATE POLICY "Members can view other members" ON group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members AS gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "System can add members" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post Groups: 共有先のグループメンバーのみ閲覧可能
CREATE POLICY "Members can view shared posts" ON post_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = post_groups.group_id AND user_id = auth.uid()));
CREATE POLICY "Users can share own posts to group" ON post_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));

-- Posts RLS の拡張: シェアされた投稿も見れるようにする
-- (既存のポリシーを削除して再作成)
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own or shared posts" ON posts FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM post_groups pg
      JOIN group_members gm ON pg.group_id = gm.group_id
      WHERE pg.post_id = posts.id AND gm.user_id = auth.uid()
    )
  );
