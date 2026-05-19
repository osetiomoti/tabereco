# モグレコ (MoguReco) 🍜

食事の写真・内容・評価を記録し、家族やグループで共有する Instagram 風の食事記録 Web アプリです。

---

## 主な機能

| 機能 | 説明 |
|---|---|
| **タイムライン** | 記録した食事を一覧表示（すべて、行った、行きたい）。グループメンバーの投稿も併せて表示。 |
| **マップ検索 (Google Map)** | 記録した店舗の位置にピンを表示。現在地取得、店名検索、タグや期間、投稿者による高度な絞り込みが可能。 |
| **マイカレンダー** | 訪問日ごとにカレンダー上に食事アイコンを表示。いつ・どこで食べたかをカレンダー形式で視覚的に振り返る。 |
| **マイランキング** | 登録したタグ（例: `#ラーメン`, `#カレー`）ごとに、自分のお気に入り店をドラッグ＆ドロップで並び替えて管理。 |
| **グループ共有** | 家族や友人などとグループを作成。招待コードでグループに参加し、投稿の公開設定（グループ限定）で手軽に共有。 |
| **タグ管理** | 投稿に複数タグを紐付け。タグ管理画面から並び順（表示優先度）を変更可能。 |
| **画像管理 (S3 + CloudFront)** | 食事の写真を複数枚アップロード可能。AWS S3 に保存され、CloudFront を通じて高速配信。 |

---

## 技術スタック

- **フロントエンド / バックエンド**: Next.js 16 (App Router / Turbopack)
- **言語**: TypeScript
- **データベース**: Neon PostgreSQL
- **ORM**: Prisma
- **インフラ / ストレージ**: AWS S3 + Amazon CloudFront
- **認証**: AWS Cognito (認証ガード / APIプロキシ)
- **地図機能**: Google Maps API (`@react-google-maps/api`)
- **ドラッグ＆ドロップ**: `@dnd-kit/core` / `@dnd-kit/sortable`
- **スタイリング**: Tailwind CSS + Vanilla CSS

---

## セットアップ手順

### 1. 依存関係のインストール

プロジェクトルートディレクトリで以下を実行します：

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成し、以下の項目を設定します：

```env
# --- DATABASE (Prisma) ---
# Neon PostgreSQL 接続情報 (Migration用の Direct URL と App用の Pooler URL)
DATABASE_URL="postgresql://username:password@pooler-host/dbname?sslmode=require"
DIRECT_URL="postgresql://username:password@direct-host/dbname?sslmode=require"

# --- AWS COGNITO (Auth) ---
COGNITO_REGION="ap-northeast-1"
COGNITO_USER_POOL_ID="your-user-pool-id"
COGNITO_CLIENT_ID="your-client-id"
COGNITO_CLIENT_SECRET="your-client-secret"
COGNITO_DOMAIN="your-cognito-domain.auth.ap-northeast-1.amazoncognito.com"

# --- AWS COGNITO IDENTITY POOL (S3 Credentials) ---
COGNITO_IDENTITY_POOL_ID="ap-northeast-1:identity-pool-uuid"

# --- AWS S3 (Storage) ---
AWS_S3_BUCKET_NAME="your-s3-bucket-name"
AWS_REGION="ap-northeast-1"
NEXT_PUBLIC_CLOUDFRONT_DOMAIN="your-cloudfront-domain.cloudfront.net"

# --- APP SETTINGS ---
NEXT_PUBLIC_APP_URL="http://localhost:4000"

# --- GOOGLE MAPS ---
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### 3. データベースマイグレーション

Prisma スキーマをデータベースに適用し、クライアントコードを生成します：

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが起動したら、ブラウザで [http://localhost:4000](http://localhost:4000) を開きます。

---

## ディレクトリ構成

```
tabereco/
├── prisma/
│   ├── schema.prisma       # データベーススキーマ定義
│   └── migrations/         # データベースマイグレーション履歴
├── src/
│   ├── app/                # Next.js App Router (各画面および API)
│   │   ├── api/            # 投稿、グループ、ユーザー、S3アップロード用 API
│   │   ├── calendar/       # マイカレンダー画面
│   │   ├── groups/         # グループ詳細・編集画面
│   │   ├── login/          # ログイン画面
│   │   ├── map/            # 店舗マップ検索画面
│   │   ├── mypage/         # マイページ (統計情報)
│   │   ├── posts/          # タイムライン (一覧・詳細・新規作成・編集)
│   │   ├── rankings/       # タグ別お気に入り店ランキング画面
│   │   ├── settings/       # 各種設定画面
│   │   └── tags/           # タグ管理・ソート画面
│   ├── components/         # 共通 UI コンポーネント (Header, FilterModal, TagSelector等)
│   ├── hooks/              # カスタム React フック (データフェッチ、状態共有用)
│   ├── lib/                # 共通ユーティリティ (prisma クライアント、認証ヘルパー)
│   ├── types/              # TypeScript 型定義
│   └── middleware.ts       # 認証ガード用のミドルウェア
```
