# 食べレコ プロジェクト引き継ぎ書 (PROJECT_HANDOVER.md)

本ドキュメントは、「食べレコ（mogureco）」の開発環境構築、起動手順、重要なアーキテクチャ設計判断、運用保守スクリプト、および開発チーム・後任エンジニア・AIアシスタントへの引き継ぎ事項をまとめたものです。

---

## 1. プロジェクト概要 & 基本情報

- **リポジトリ名:** `tabereco` (内部プロジェクト識別名: `mogureco`)
- **主要目的:** グルメ記録（食べレコ）および温泉・宿泊記録（旅レコ）のデュアルモード対応フルスタック記録アプリ
- **主要技術スタック:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma 6, Neon PostgreSQL, AWS Cognito, AWS S3 + CloudFront, Google Maps / Places API
- **デフォルト開発ポート:** `4000` (`http://localhost:4000`)

---

## 2. 開発環境要件 & 前提条件

| 項目 | 推奨バージョン / 条件 | 備考 |
| :--- | :--- | :--- |
| **OS** | Windows 11 / macOS / Linux | Windows PowerShell 環境での動作確認済み |
| **Node.js** | `>= 20.17.0` (LTS推奨) | Node 20 / 22 でビルド・動作確認済み |
| **npm** | `>= 10.0.0` | パッケージマネージャー |
| **Database** | Neon PostgreSQL (Serverless) | Direct URL と Connection Pooler URL を使用 |
| **AWS アカウント** | Cognito User Pool / S3 / CloudFront | 画像アップロードおよび認証 |
| **Google Cloud** | Maps JavaScript API, Places API | 課金有効化済み API キーが必要 |

---

## 3. 環境変数 (.env) 定義一覧

プロジェクトルート直下に `.env` を配置します（Git 管理外）。

```env
# ==========================================
# 1. データベース接続情報 (Neon PostgreSQL)
# ==========================================
# アプリケーション実行用 (Neon コネクションプーラー経由)
DATABASE_URL="postgresql://username:password@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"

# マイグレーション実行用 (Direct 接続)
DIRECT_URL="postgresql://username:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"

# ==========================================
# 2. 認証 (AWS Cognito User Pool)
# ==========================================
COGNITO_REGION="ap-northeast-1"
COGNITO_USER_POOL_ID="ap-northeast-1_xxxxxxxxx"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
COGNITO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
COGNITO_DOMAIN="your-app-domain.auth.ap-northeast-1.amazoncognito.com"

# ==========================================
# 3. AWS Cognito Identity Pool (S3 直接署名用)
# ==========================================
COGNITO_IDENTITY_POOL_ID="ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# ==========================================
# 4. ストレージ & CDN (AWS S3 & CloudFront)
# ==========================================
AWS_S3_BUCKET_NAME="tabereco-uploads"
AWS_REGION="ap-northeast-1"
# S3 サーバーサイド操作用（IAM ユーザー/ロール認証情報）
AWS_ACCESS_KEY_ID="AKIAxxxxxxxxxxxxxxxx"
AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# 画像配信用 CloudFront ドメイン（プロトコルなし）
NEXT_PUBLIC_CLOUDFRONT_DOMAIN="d1xxxxxxxxxxxx.cloudfront.net"

# ==========================================
# 5. アプリケーション設定
# ==========================================
# 開発時: http://localhost:4000 / 本番時: https://your-domain.com
NEXT_PUBLIC_APP_URL="http://localhost:4000"

# ==========================================
# 6. 地図・位置情報 (Google Maps Platform)
# ==========================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ==========================================
# 7. Web Push 通知 (VAPID)
# ==========================================
NEXT_PUBLIC_VAPID_PUBLIC_KEY="Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VAPID_PRIVATE_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VAPID_SUBJECT="mailto:support@example.com"
```

---

## 4. セットアップ & 起動手順

### 4.1 初回セットアップ
```bash
# 依存関係のインストール
npm install

# Prisma クライアントコードの生成
npx prisma generate
```

### 4.2 データベースの同期
スキーマ変更があった場合や初回環境構築時：
```bash
# マイグレーションの適用
npx prisma migrate dev

# （開発環境でスキーマを強制同期する場合）
npx prisma db push
```

### 4.3 開発サーバーの起動
食べレコは **ポート 4000** でリッスンするように `package.json` に設定されています。
```bash
npm run dev
```
ブラウザで [http://localhost:4000](http://localhost:4000) にアクセスします。

### 4.4 キャッシュクリア付き起動
Next.js キャッシュ（`.next`）が壊れた場合やハイドレーション異常が起きた場合：
```bash
npm run dev:clean
```

### 4.5 本番ビルド確認
```bash
npm run build
```

---

## 5. 重要な設計判断・アーキテクチャ上の決定事項 (ADR)

### 5.1 デュアルモード（食べレコ ⇄ 旅レコ）の1コードベース切り替え構造
- **判断内容:** 2つの別々のWebアプリを作るのではなく、単一のコードベース・単一のデータベースで「食べレコ（グルメ）」と「旅レコ（温泉・宿）」を提供。
- **実装メカニズム:**
  1. `app_type` Cookie（`tabereco` または `tabireco`）で永続化。
  2. `AppTypeContext` を介して画面全体に現在のモードを提供。
  3. 各テーブル（`Post`, `Tag` 等）に `appType` カラムを持たせ、API クエリ時に必ず `where: { appType }` で完全分離。
  4. テーマカラー（CSSカスタムプロパティ `--color-primary` 等）を HTML タグまたは Root コンテナに動的インジェクション。
  5. 温泉専用フィールド（`springQuality`, `saunaTemp`, `waterBathTemp` 等）は `HotSpringInfo` リレーションに分離し、旅レコ時のみ入力・表示。

### 5.2 画面間フィルターの共有アーキテクチャ (`useSharedFilter`)
- **課題:** タイムライン、マップ、カレンダー、統計の各画面を遷移しても、ユーザーが設定した絞り込み条件（タグ、期間、訪問ステータス、評価）を維持し、かつ片方で変更したら全画面に即時波及させたい。
- **決定:**
  - Redux 等の大規模状態管理ライブラリは採用せず、`localStorage` とブラウザ標準の `window.dispatchEvent(new CustomEvent('sharedFilterChange'))` を組み合わせたカスタムフック `useSharedFilter` を作成。
  - さらに、食べレコ用と旅レコ用でフィルター条件が混ざらないよう、Key名に `filter_tabereco` / `filter_tabireco` とモード別のプレフィックスを自動付与して完全独立化。

### 5.3 画像ストレージ戦略（3段フォールバック設計）
- **課題:** モバイルからの大容量写真アップロード時の速度向上と、Vercel サーバーレス関数のペイロード上限（4.5MB）およびタイムアウト回避。
- **決定:**
  1. **第1優先 (Direct Client PUT):** AWS Cognito Identity Pool から一時クレデンシャルを取得し、ブラウザから AWS S3 バケットへ直接 `PUT`（最速・サーバーレス関数無消費）。
  2. **第2優先 (Presigned URL):** `/api/upload/presign` から署名付きアップロード URL を発行し、クライアントから S3 へ直接送信。
  3. **第3優先 (S3 Proxy Fallback):** セキュリティ制限等でクライアント直接送信が弾かれた場合のみ、`/api/upload` 経由でサーバーが中継して S3 に保存。
  4. **DB 保存パスのルール:** DB には `https://...cloudfront.net/posts/xxx.webp` というフル URL ではなく、`posts/xxx.webp` という **S3 キー名（相対パス）** を保存。配信ドメインの変更や環境移行に極めて強固な設計。

### 5.4 モバイル操作性の追求（住所検索・Google Places）
- **課題:** スマートフォンで住所入力候補が出た際、上下スクロールしようと指を動かすと候補がタップ判定され、意図しない住所が選択されてしまう問題。
- **決定:**
  - `futariba` の実装ノウハウを移植し、`touchmove` イベント時にスクロール中フラグをセット、タッチ開始から終了までの時間・移動量を計測して「タップ操作」と「スクロール操作」を厳密に分離。テキストの誤選択防止（`user-select: none`）と滑らかなスクロールを実現。

### 5.5 iOS PWA タスクキル対策（永続化リフレッシュトークン）
- **課題:** iOS Safari で「ホーム画面に追加」した PWA モードでは、Webkit の仕様によりプロセス破棄時に Cookie が頻繁にクリアされ、アプリを開くたびに未ログイン状態へ戻される。
- **決定:**
  - ログイン完了時、httpOnly Cookie と同時にクライアント側の暗号化/セキュアな `localStorage` に Refresh Token をバックアップ保存。
  - アプリ起動時（Client Entry）、Cookie によるセッションが無効化されていた場合、`localStorage` の Refresh Token を用いて `/api/auth/refresh` を透過的に実行し、Cookie を自動再生成してログイン状態を復元。

### 5.6 「行った」記録の個人カスタマイズ保存とマージ優先設計 (`PostVisited`)
- **課題:** 他人の投稿や店舗情報に対して「行った」を付けた際、単なるフラグトグルだけでなく「自分自身の写真」「自分の感想コメント」「自分が訪問した日付」「自分の星評価」を個別に記録・管理したい。
- **決定:**
  - `PostVisited` 中間モデルに `comment`, `image_url`, `image_urls`, `visited_at`, `rating` カラムを追加。
  - マイページや投稿詳細での「行った」一覧取得時、該当ユーザーが独自に記録した写真や感想があれば、元投稿者の情報よりも優先してマージ返却。これにより、1つの投稿を起点に各ユーザーがそれぞれの訪問アルバムとしてパーソナライズされた振り返りが可能。

### 5.7 他者プロフィールの行きたいリストに対するプライバシー保護と外部マップ導線 (`is_restricted`)
- **課題:** マイページ等で他人のプロフィールを閲覧する際、行きたいリストに含まれるプライベートな店舗情報やメモを不用意に赤の他人（ストレンジャー）へ開示したくないが、店舗の存在自体は認知させたい。
- **決定:**
  - `/api/profiles/[id]` において、本人・フレンド・同一グループ所属（`isInsider`）ではない閲覧者に対して、行きたい投稿（`want_to_go`）の画像・コメントをマスクし `is_restricted: true` を付与。
  - フロントエンド（`RestrictedCard`）ではロックアイコン（🔒）、「知り合い限定」「Maps」バッジを表示。
  - カードタップ時はアプリ内投稿詳細ではなく Google Maps 検索リンクを直接開き、ユーザーの非公開情報を守りつつ店舗の位置情報のみを確認できるシームレスなUXを提供。

---

## 6. 運用・保守・スクリプト一覧

`scripts/` ディレクトリに配備されている管理・移行スクリプトです。

| スクリプトファイル | 実行コマンド | 用途・詳細 |
| :--- | :--- | :--- |
| `migrate-images.mjs` | `npm run migrate:images` | 過去の画像 URL（Supabase / 外部 URL）を AWS S3 に再アップロードし DB を書き換える |
| `migrate-images.mjs --dry-run` | `npm run migrate:images:dry` | 変更を適用せずに S3 移行対象レコード数と URL を検証する |
| `cleanup-orphaned-s3.mjs` | `node scripts/cleanup-orphaned-s3.mjs` | DB 上に存在しない S3 上の孤立画像ファイルをスキャンし安全に一括削除する |
| `migrate-image-urls-to-keys.mjs` | `node scripts/migrate-image-urls-to-keys.mjs` | DB にフル URL で記録されている旧データを S3 キー（相対パス）に一括変換する |
| `check-neon.js` | `node scripts/check-neon.js` | Neon PostgreSQL への接続疎通確認 |
| `check-app-type.js` | `node scripts/check-app-type.js` | 投稿やタグの `appType` のデータ整合性を検証 |

---

## 7. トラブルシューティング & FAQ

### Q1. `npm run dev` で起動しない / ポートが競合する
- **原因:** ポート 4000 が既に別プロセス（過去の Next.js プロセス等）で使用されています。
- **対処:** PowerShell で `Get-Process node | Stop-Process -Force` を実行して残存プロセスを終了するか、一時的に `npx next dev -p 4001` で別ポート起動してください。

### Q2. ログイン画面に飛ばされる / リダイレクトループが発生する
- **原因:** `.env` の `NEXT_PUBLIC_APP_URL` が `http://localhost:4000` 以外になっている、または Cognito の Allowed Callback URLs に現在のオリジンが含まれていません。
- **対処:** `.env` の値を確認し、AWS Cognito コンソールで「アプリケーションクライアント」の「コールバック URL」に `http://localhost:4000/api/auth/callback` が登録されているか確認してください。

### Q3. S3 アップロードで CORS エラーが出る
- **原因:** S3 バケットの CORS 設定に `http://localhost:4000` が許可されていません。
- **対処:** AWS S3 バケットの CORS ルールに以下を追記してください：
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:4000", "https://your-domain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
  ```

### Q4. Prisma マイグレーションでエラーが発生する
- **原因:** Neon のコネクションプーラー経由では DDL（テーブル変更・インデックス作成）が実行できない場合があります。
- **対処:** `DIRECT_URL` が `.env` に正しく設定されているか確認してください。Prisma はマイグレーション時に自動的に `directUrl` を参照します。
