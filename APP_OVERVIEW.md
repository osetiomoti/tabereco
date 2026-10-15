# 食べレコ (mogureco) アプリケーション概要書 (APP_OVERVIEW.md)

## 1. アプリケーション概要

### 1.1 アプリの目的・コンセプト
「**食べレコ**（内部プロジェクト名: `mogureco`）」は、外食や自炊、訪問した飲食店の体験（食事、評価、写真、価格帯、位置情報など）を直感的に記録・管理・共有できるフルスタックWebアプリケーション（PWA対応）です。  
また、本システムは「**食べレコ**（グルメ記録）」と「**旅レコ**（温泉・宿泊記録）」の**デュアルモード（2つのサービスモード）**を1つのコードベースおよびデータベースでシームレスに切り替えて利用できるアーキテクチャを備えています。

### 1.2 想定ユーザーと利用シーン
- **想定ユーザー：**
  - 行った飲食店や美味しかった料理を写真や位置情報とともに個人的にコレクションしたいユーザー
  - 友人やパートナー、家族と「行きたいお店」や「行ったお店」のリスト・ランキングを共有したいユーザー
  - 旅先での温泉やホテル、宿の泉質・水風呂・サウナ温度・設備を詳細に記録したい旅行・温泉愛好家
- **主な利用シーン：**
  - **外食時・退店時：** スマートフォンからGoogle Mapsスポット検索と位置情報連動で素早く店舗・写真を記録
  - **週末・旅先での計画：** マップ表示やカレンダー表示、ランキング一覧から次に行きたいスポットを検索・検討
  - **グループ共有：** パートナーや友人とグループを作成し、行きたいお店リストやタイムラインを相互閲覧・リアクション（いいね・行きたい・コメント）

### 1.3 主要な特徴・ハイライト
1. **Google Maps & Places API 連携：**
   - 店名・スポット名のオートコンプリート検索、住所・緯度経度の自動取得、周辺スポット検索。
2. **クラウド画像管理 & 最適化：**
   - AWS S3への直接署名アップロード（Cognito Identity Pool / Presigned URL / S3-Proxyフォールバック）とCloudFront経由の高速配信・キャッシュ。
3. **デュアルモード切り替え（食べレコ ⇄ 旅レコ）：**
   - クッキーおよびUIコンテキストで「グルメ」と「旅・温泉」を即座にスイッチ。専用のカラーパレット（Rose / Lime）、専用タグ、温泉専用パラメータ（泉質、温度、水風呂、源泉掛け流し、サウナ等）が動的に適用。
4. **グループ & フレンド共有機能：**
   - 招待コードによるグループ参加、タイムラインへの投稿共有、非公開（自分のみ）切り替え。
5. **ランキング & Dnd並び替え：**
   - タグごとの「マイベスト」店舗をドラッグ＆ドロップ（`@dnd-kit`）で直感的にランキング編成（王冠・メダルバッジ表示）。
6. **統計・集計ダッシュボード：**
   - 月別投稿数、評価分布、都道府県別訪問数、人気ジャンル/タグの集計表示。
7. **PWA（Progressive Web App） & Web Push通知：**
   - モバイル端末のホーム画面追加に対応し、iOS PWAでのタスクキル対策（localStorage永続化RT）とVAPID Web Push通知を搭載。

---

## 2. システム構成・技術スタック

| レイヤー | 採用技術 / ライブラリ | バージョン / 詳細 |
| :--- | :--- | :--- |
| **フロントエンドフレームワーク** | Next.js (App Router) | 16.2.4 (React 19.0.0) |
| **言語** | TypeScript | 5.7.3 |
| **スタイリング** | Tailwind CSS / PostCSS | 3.4.17 (独自CSS変数によるテーマ切替) |
| **UIアイコン** | Lucide React | 0.363.0 |
| **状態管理 / データ取得** | SWR / React Context / Custom Hooks | SWR 2.4.1, `useSharedFilter` (localStorage + DOM Custom Event) |
| **Dnd (ドラッグ＆ドロップ)** | @dnd-kit (core, sortable, utilities) | 6.3.1 / 10.0.0 |
| **地図・位置情報** | Google Maps JavaScript API / Places API | @react-google-maps/api 2.20.8 |
| **データベース / ORM** | PostgreSQL (Supabase / AWS RDS等) / Prisma | Prisma 6.3.1 (15テーブル) |
| **認証 / セッション** | AWS Cognito User Pool | OAuth 2.0 / ホステッドUI / JWT (aws-jwt-verify 4.0.1) |
| **ストレージ & CDN** | AWS S3 + Amazon CloudFront | S3クライアント / Cognito Identity Pool / Presigned URL |
| **画像処理** | Sharp / Exif-js | Sharp 0.35.4 (サーバー側EXIF/リサイズ), exif-js 2.3.0 |
| **プッシュ通知** | Web Push / VAPID | web-push 3.6.7 |

---

## 3. ディレクトリ構成と役割

```text
tabereco/
├── .env                      # 開発用環境変数（Cognito, S3, Maps, DB等）※コミット対象外
├── .next/                    # Next.js ビルドキャッシュ
├── prisma/
│   ├── schema.prisma         # Prisma スキーマ定義（全15モデル）
│   └── migrations/           # データベースマイグレーション履歴
├── public/                   # 静的アセット（アイコン、マニフェスト、ロゴ等）
│   ├── manifest.json         # PWA マニフェストファイル
│   └── sw.js                 # Service Worker (Web Push / オフラインキャッシュ)
├── scripts/
│   └── migrate-images.mjs    # 画像移行・同期用スクリプト
├── src/
│   ├── proxy.ts              # Next.js 16 プロキシ / ミドルウェア（セッション判定・JWT更新・リダイレクト）
│   ├── app/                  # Next.js App Router (全22画面 + 全48 APIルート)
│   │   ├── layout.tsx        # ルートレイアウト（AppTypeProvider, SessionKeepAlive, SWR設定等）
│   │   ├── page.tsx          # ホーム画面（アクティビティ、ルーレット、都道府県マップ）
│   │   ├── login/            # ログイン画面
│   │   ├── posts/            # タイムライン・投稿一覧・新規投稿・詳細・編集
│   │   ├── map/              # 地図画面（ピン表示・現在地・スポット検索）
│   │   ├── calendar/         # カレンダー画面（訪問日・行きたい日別一覧）
│   │   ├── rankings/         # タグ別ランキング（並び替え・表彰）
│   │   ├── stats/            # 統計・集計画面
│   │   ├── groups/           # グループ一覧・詳細・メンバー管理・招待
│   │   ├── mypage/           # マイページ・評価一覧
│   │   ├── tags/             # タグ管理・一括タグ付け
│   │   ├── settings/         # プロフィール編集・通知設定・ログアウト
│   │   ├── notifications/    # 通知一覧画面
│   │   ├── dev/              # 開発検証用モック画面群
│   │   └── api/              # バックエンド REST API (auth, posts, groups, tags, etc.)
│   ├── components/           # UIコンポーネント群
│   │   ├── common/           # ヘッダー、ナビゲーション、ボタン、モーダル等
│   │   ├── forms/            # 投稿フォーム、場所入力、星評価、タグ選択等
│   │   ├── map/              # Google Maps ラッパー、マーカー、詳細ポップアップ
│   │   ├── posts/            # 投稿カード、タイムラインリスト、写真カルーセル
│   │   └── rankings/         # ランキングリスト、Dndソータブルアイテム
│   ├── contexts/             # React Context（AppTypeContext, AuthContext等）
│   ├── hooks/                # カスタムフック（useSharedFilter, useAuth, useGeolocation等）
│   ├── lib/                  # バックエンド・共通ユーティリティ（auth, cognito, s3, prisma, push）
│   ├── styles/               # グローバルCSS (globals.css)
│   └── types/                # TypeScript 型定義 (db, api, post, user等)
├── package.json              # 依存関係・起動スクリプト定義
├── tailwind.config.mjs       # Tailwind CSS 設定
├── tsconfig.json             # TypeScript 設定
└── next.config.mjs           # Next.js 設定 (画像外部ホスト、PWAヘッダー等)
```

---

## 4. アプリケーションの起動・開発・ビルド方法

### 4.1 必要要件
- Node.js: v20.x 以上
- npm: v10.x 以上
- PostgreSQL データベース (Prisma対応)
- AWS アカウント (Cognito User Pool, Identity Pool, S3, CloudFront)
- Google Cloud Platform アカウント (Maps JavaScript API, Places API, Geocoding API)

### 4.2 コマンド一覧
```bash
# 依存関係のインストール
npm install

# Prisma Client の生成
npx prisma generate

# データベースマイグレーションの適用
npx prisma migrate deploy

# 開発サーバーの起動 (ポート 4000)
npm run dev

# キャッシュクリア付き開発サーバー起動
npm run dev:clean

# プロダクションビルド (prisma generate && next build)
npm run build

# プロダクション実行
npm start

# コード品質チェック
npm run lint
```

---

## 5. 主要な注意点・制約事項
1. **Cognito認証とローリングリフレッシュ：**
   - 認証はAWS Cognito JWTを使用し、アクセストークン（1時間有効）とリフレッシュトークン（30日有効）がHttpOnly Cookieに保持されます。
   - `src/proxy.ts` により、リクエストごとにJWTの有効期限が検査され、期限切れ（または残り30秒以下）の場合はリフレッシュトークンで自動更新されます。
2. **S3アップロードの2系統：**
   - 高速アップロードのため、クライアントからCognito Identity Poolの一時クレデンシャルまたはPresigned URLを利用してS3へ直接PutObjectを行います。失敗時はフォールバックとして `/api/upload/s3-proxy` 経由でサーバーが中継します。
3. **画面間フィルター共有（`useSharedFilter`）：**
   - タイムライン・マップ・統計画面で共有される検索キーワード・都道府県・共有範囲フィルターは、`localStorage` とブラウザ内カスタムDOMイベントでリアルタイム同期されます。
