'use client';

import { useState } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

type Props = {
  onCheckAgain: () => void;
};

export function SchemaSetupHelp({ onCheckAgain }: Props) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const sqlCode = `-- =============================================
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
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own or shared posts" ON posts FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM post_groups pg
      JOIN group_members gm ON pg.group_id = gm.group_id
      WHERE pg.post_id = posts.id AND gm.user_id = auth.uid()
    )
  );`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => {
      onCheckAgain();
      setChecking(false);
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 animate-in fade-in zoom-in duration-700">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-orange-100 shadow-2xl shadow-orange-500/10 overflow-hidden relative">
        {/* 背景装飾 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-32 -translate-x-32" />

        <div className="p-8 sm:p-12 relative">
          <header className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl text-white shadow-xl shadow-orange-500/20">
                <Database size={32} strokeWidth={2.5} />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                <Sparkles size={12} />
                New Social Feature
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
              ソーシャル機能を<br />
              有効化しましょう
            </h1>
            <p className="text-gray-500 font-bold leading-relaxed max-w-lg">
              知人と場所を共有するためには、一度だけデータベースの準備が必要です。ボタンを押して、設定を完了させましょう。
            </p>
          </header>

          <div className="grid grid-cols-1 gap-10">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-[10px]">1</div>
                  SQL コードをコピー
                </h2>
                <button
                  onClick={copySql}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                    copied 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/20 active:scale-95'
                  }`}
                >
                  {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                  {copied ? 'COPIED!' : 'COPY SQL'}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gray-900 rounded-2xl blur-xl opacity-5 group-hover:opacity-10 transition-opacity" />
                <pre className="relative bg-gray-900 text-gray-300 p-6 rounded-2xl text-[10px] sm:text-xs font-mono overflow-x-auto max-h-[300px] border border-white/10 shadow-2xl whitespace-pre">
                  {sqlCode}
                </pre>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-[10px]">2</div>
                SQL Editor で実行
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-5 bg-white border-2 border-gray-100 rounded-3xl hover:border-orange-500/20 hover:bg-orange-50/30 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                      <ExternalLink size={20} />
                    </div>
                    <span className="font-black text-gray-700 text-sm">Dashboard を開く</span>
                  </div>
                </a>

                <button
                  onClick={handleCheck}
                  disabled={checking}
                  className="flex items-center justify-between px-6 py-5 bg-orange-500 text-white rounded-3xl hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center ${checking ? 'animate-spin' : ''}`}>
                      <RefreshCw size={20} strokeWidth={3} />
                    </div>
                    <span className="font-black text-sm">{checking ? '再確認中...' : '実行した、再チェック！'}</span>
                  </div>
                </button>
              </div>
            </section>
          </div>

          <div className="mt-12 p-6 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4">
            <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-xs font-black text-red-600 uppercase tracking-tighter">Security Note</p>
              <p className="text-[11px] text-red-400 font-bold leading-relaxed">
                この設定は管理者のみが行えます。1度実行すれば、すべてのユーザーがソーシャル機能を利用できるようになります。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
