# モグレコ (MoguReco) 🍜

食事の写真・内容・評価を記録する Instagram 風の食事記録 Web アプリです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Auth + Storage)

---

## セットアップ手順

### 1. Node.js のインストール

[https://nodejs.org/](https://nodejs.org/) から LTS 版をインストール。

インストール確認:
```bash
node --version  # v18 以上
npm --version
```

### 2. Supabase プロジェクトの作成

1. [https://supabase.com](https://supabase.com) でアカウント作成
2. **New project** でプロジェクトを作成
3. **Settings → API** から以下をコピー:
   - `Project URL`
   - `anon public` キー

### 3. データベースのセットアップ

Supabase ダッシュボード → **SQL Editor** → **New query** で以下を実行:

```sql
-- supabase/migrations/001_init.sql の内容をコピーして実行
```

### 4. Storage バケットの作成

Supabase ダッシュボード → **Storage** → **New bucket**:

| 項目 | 値 |
|---|---|
| Name | `meal-images` |
| Public | ✅ ON |

バケット作成後、**Policies** タブで以下を追加:

**ポリシー 1: 認証ユーザーのアップロード許可**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**ポリシー 2: 公開読み取り**
- Policy name: `Allow public read`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `true`

### 5. ユーザーの追加

Supabase ダッシュボード → **Authentication → Users → Invite user** でメールアドレスを招待。

### 6. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanonキー
```

### 7. 依存関係のインストールと起動

```bash
# プロジェクトディレクトリに移動
cd mogureco

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

---

## ディレクトリ構成

```
mogureco/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # → /posts にリダイレクト
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx        # ログイン
│   └── posts/
│       ├── page.tsx        # 投稿一覧
│       ├── new/page.tsx    # 新規投稿
│       └── [id]/
│           ├── page.tsx    # 詳細
│           └── edit/page.tsx # 編集
├── components/
│   ├── Header.tsx
│   ├── PostCard.tsx
│   ├── StarRating.tsx
│   ├── ImageUpload.tsx
│   ├── PostForm.tsx
│   └── DeleteButton.tsx
├── lib/
│   ├── types.ts
│   ├── utils.ts
│   ├── supabase/
│   │   ├── client.ts       # ブラウザ用
│   │   └── server.ts       # サーバー用
│   └── api/
│       └── posts.ts        # CRUD + 画像アップロード
├── middleware.ts            # 認証ガード
└── supabase/
    └── migrations/
        └── 001_init.sql    # DB スキーマ
```

---

## 機能一覧

| 機能 | 説明 |
|---|---|
| ログイン | メール + パスワード認証 |
| 投稿一覧 | グリッド表示、新しい順 |
| 投稿作成 | 写真・食事名・店名・評価・コメント・日付 |
| 投稿詳細 | 大きな画像 + 詳細情報 |
| 投稿編集 | 自分の投稿のみ |
| 投稿削除 | 自分の投稿のみ (2回クリック確認) |
| 画像管理 | Supabase Storage に自動アップロード/削除 |

---

## セキュリティ

- Row Level Security (RLS) で自分の投稿のみアクセス可能
- Supabase Auth による JWT 認証
- ミドルウェアで未認証ユーザーをログインページへリダイレクト
