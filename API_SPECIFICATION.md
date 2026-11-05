# 食べレコ API仕様書 (API_SPECIFICATION.md)

本ドキュメントは、「食べレコ（tabereco）」の全 REST API エンドポイントのメソッド、リクエスト/レスポンス形式、クエリパラメータ、バリデーション、認証要件、エラーレスポンスをまとめた仕様書です。

---

## 1. 共通仕様

### 1.1 ベースURL
| 環境 | ベースURL |
| :--- | :--- |
| 開発環境 | `http://localhost:4000` |
| 本番環境 | デプロイ先URLに依存 |

### 1.2 認証
- 原則として全APIエンドポイント（`/api/auth/*` および `/api/dev/*` を除く）は認証必須。
- 認証は HttpOnly Cookie `access_token`（AWS Cognito JWT）を利用する。
- 未認証またはトークン期限切れ（かつリフレッシュ失敗）の場合は以下のレスポンスを返す:

```json
HTTP 401 Unauthorized
{ "success": false, "error": "Unauthorized", "code": "UNAUTHORIZED" }
```

### 1.3 共通レスポンス形式
```json
// 成功
{ "success": true, "data": { ... } }

// 失敗
{ "success": false, "error": "エラーメッセージ" }
```

### 1.4 Cookieによるモード識別
- `app_type` Cookie（値: `tabereco` または `tabireco`）でアプリモードを識別する。
- 未指定時は `tabereco` をデフォルトとして扱う。

---

## 2. 認証 API (`/api/auth`)

### 2.1 `GET /api/auth/login`
Cognito Hosted UI へリダイレクト（認証フロー開始）。
- **認証不要**
- **レスポンス:** `302 Redirect` → `https://{COGNITO_DOMAIN}/login?client_id=...&response_type=code&...`
- **エラー:** `500` — Cognito設定が環境変数に存在しない場合

---

### 2.2 `GET /api/auth/callback`
Cognito からの OAuth2 認可コードを受け取りトークンと交換し、Cookieをセット。
- **認証不要**
- **クエリパラメータ:**
  - `code` (string, 必須): Cognito から付与された認可コード
  - `error` (string): エラー時の OAuth エラーコード
- **処理フロー:**
  1. `code` を `/oauth2/token` エンドポイントに送信してトークンを取得
  2. `access_token`, `id_token`, `refresh_token` をそれぞれ HttpOnly Cookie にセット
  3. `/posts` へリダイレクト
- **Cookie設定:**
  - `access_token`: expires_in 秒間
  - `id_token`: expires_in 秒間
  - `refresh_token`: 30日間 (`maxAge: 2592000`)

---

### 2.3 `GET /api/auth/logout`
Cookie をクリアしてログアウト。
- **認証不要**
- **処理:** `access_token`, `id_token`, `refresh_token` Cookie を削除
- **レスポンス:** `302 Redirect` → `/login`

---

### 2.4 `POST /api/auth/refresh`
リフレッシュトークンで新しいアクセストークンを取得する。
- **認証不要**
- **リクエスト Body (JSON):**
  ```json
  { "refresh_token": "string" }
  ```
- **レスポンス (200):**
  ```json
  { "success": true, "data": { "access_token": "string", "expires_in": 3600 } }
  ```

---

### 2.5 `POST /api/dev/mock-login` *(開発環境限定)*
開発用の模擬ログイン（本番無効）。
- **認証不要 / 本番では 404 を返す**
- **リクエスト Body (JSON):**
  ```json
  { "userId": "uuid-string" }
  ```
- **処理:** `dev_token` Cookie（Base64エンコードJSON）をセット

---

## 3. タイムライン・投稿取得 API

### 3.1 `GET /api/timeline`
ページネーション付きの高度な投稿検索・絞り込みAPI。

**クエリパラメータ一覧:**

| パラメータ | 型 | 初期値 | 説明 |
| :--- | :--- | :--- | :--- |
| `limit` | int | `50` | 1ページ当たりの取得件数 |
| `cursor` | string | - | ページネーション用の投稿ID（次ページの先頭カーソル）|
| `timeline_mode` | string | `home` | スコープ: `home`（自分＋グループ）/ `user` / `group` |
| `target_user_id` | UUID | - | `timeline_mode=user` 時の対象ユーザーID |
| `group_id` | UUID | - | `timeline_mode=group` 時の対象グループID |
| `status` | string | - | ステータス絞り込み: `visited` / `want_to_go` / `all` |
| `keyword` | string | - | キーワード検索文字列 |
| `search_mode` | string | `store_name` | 検索対象: `store_name` / `address` / `all` |
| `selected_tags` | string | - | コンマ区切りのタグ名リスト |
| `tag_match_mode` | string | `AND` | タグ一致方式: `AND` / `OR` |
| `tag_id` | UUID | - | 特定タグIDによる絞り込み |
| `registrant_ids` | string | - | コンマ区切りのユーザーIDリスト（投稿者絞り込み）|
| `group_ids` | string | - | コンマ区切りのグループIDリスト |
| `rating_min` | float | - | 最低評価値フィルター |
| `rating_max` | float | - | 最高評価値フィルター |
| `rating_unrated` | boolean | - | 未評価のみ表示 |
| `price_min` | int | - | 最小価格帯フィルター |
| `price_max` | int | - | 最大価格帯フィルター |
| `sort_field` | string | `date` | ソートキー: `date` / `visited_at` / `rating` |
| `sort_order` | string | `desc` | ソート順: `desc` / `asc` |
| *(旅レコ温泉フィルター群)* | | | `is_hot_spring_mode`, `spring_temp_min/max`, `is_source_fed`, `bath_type`, `stay_type`, `spring_qualities`, `bath_types`, `source_managements`, `facility_type`, `shampoo_type` 等 |

**レスポンス (200):**
```json
{
  "success": true,
  "data": [ /* Post[] - 各投稿に以下の拡張フィールドあり */ ],
  "pagination": {
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
```
**投稿オブジェクト拡張フィールド（フロントエンド向け）:**
| フィールド | 説明 |
| :--- | :--- |
| `_isMarkedWantToGo` | 自分が「行きたい」をマークしているか |
| `_isMarkedVisited` | 自分が「行った」をマークしているか |
| `_isLikedByMe` | 自分がいいねしているか |
| `_myRating` | 自分の評価値 |
| `_comment_count` | コメント総数 |
| `_like_count` | いいね総数 |
| `_avgRating` | 全訪問者評価の平均（小数第1位） |
| `_ratingCount` | 評価入力された件数 |
| `__is_mine` | 自分の投稿かどうか |

---

## 4. 投稿 API (`/api/posts`)

### 4.1 `GET /api/posts`
自分の投稿を取得（簡易フィルタリング版、`/api/timeline` との差別化あり）。

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
| :--- | :--- | :--- |
| `keyword` | string | タイトルによるキーワード検索 |
| `status` | string | ステータス絞り込み |
| `is_favorite` | boolean | お気に入りのみ |
| `tag_id` | UUID | タグID絞り込み |
| `marked_want_to_go` | boolean | `true`で他者投稿の「行きたい」リストを返す |
| `marked_visited` | boolean | `true`で他者投稿の「行った」リストを返す |
| `liked_by_me` | boolean | `true`で「いいね」した投稿リストを返す |

---

### 4.2 `POST /api/posts`
新規投稿を作成する。

**リクエスト Body (JSON):**
```json
{
  "title": "string (必須)",
  "store_name": "string",
  "comment": "string",
  "rating": 4.5,
  "image_url": "s3-key-or-url",
  "image_urls": ["s3-key1", "s3-key2"],
  "visited_at": "2024-01-15",
  "status": "visited",
  "address": "東京都渋谷区...",
  "google_place_id": "ChIJ...",
  "latitude": 35.6585,
  "longitude": 139.7454,
  "is_mine_only": false,
  "price_min": 1000,
  "price_max": 3000,
  "tagNames": ["ラーメン", "東京"],
  "spring_qualities": [],
  "bath_types": [],
  "source_managements": [],
  "stay_types": [],
  "facility_types": [],
  "shampoo_types": [],
  "bath_temperatures": null
}
```

**処理フロー:**
1. `posts` テーブルにレコードを作成
2. 公開投稿（`is_mine_only=false`）の場合: 参加中の全グループに自動共有（`post_groups`）
3. `tagNames` が指定された場合: 存在しないタグを自動作成し `post_tags` に紐付け
4. フレンドへのアプリ内通知 (`notification`) と Web Push 通知を送信
5. DB保存失敗時: アップロード済みS3画像をロールバック削除

**レスポンス (200):**
```json
{ "success": true, "data": { /* 作成された Post オブジェクト */ } }
```

---

### 4.3 `GET /api/posts/[id]`
投稿IDで特定の投稿を取得。

**レスポンス (200):**
```json
{ "success": true, "data": { /* Post + tags + comments + likes + want_to_gos + visiteds */ } }
```
- **エラー:** `404` — 指定IDが存在しない or アクセス権なし

---

### 4.4 `PUT /api/posts/[id]`
投稿を更新する（本人のみ）。
- **リクエスト Body:** POST と同様のフィールド（部分更新）
- **エラー:** `403` — 投稿者以外がアクセスした場合

---

### 4.5 `DELETE /api/posts/[id]`
投稿を削除する（本人のみ）。関連する S3 画像もバックグラウンドで削除。
- **レスポンス (200):** `{ "success": true }`
- **エラー:** `403` — 投稿者以外がアクセスした場合

---

### 4.6 `GET /api/posts/[id]/comments`
投稿のコメント一覧を取得。

### 4.7 `POST /api/posts/[id]/comments`
コメントを投稿する。
- **Body:** `{ "content": "string", "rating": 4.0 }`
- コメント投稿後、投稿者への通知とWeb Push送信

### 4.8 `POST /api/posts/[id]/like`
いいねをトグル（未いいね→いいね、いいね→解除）。
- いいね時: 投稿者への通知と Web Push 送信

### 4.9 `POST /api/posts/[id]/want-to-go`
「行きたい」をトグル。

### 4.10 `POST /api/posts/[id]/visited` (および `PUT`)
「行った！」のトグル、または訪問詳細データ（写真、コメント、訪問日、星評価、訪問回数）の保存・更新。
- **リクエスト Body (JSON, すべて任意):**
  ```json
  {
    "rating": 4.5,
    "comment": "スープが絶品でした",
    "image_url": "s3-key-or-url",
    "image_urls": ["s3-key-1", "s3-key-2"],
    "visited_at": "2026-10-27",
    "visit_count": 2,
    "action": "increment" // または "decrement"（訪問回数の増減時のみ指定）
  }
  ```
- **処理ロジック:**
  1. `action` 指定時: 既存レコードの `visit_count` を増減。
  2. 詳細データ（`rating`, `comment`, `image_url`, `image_urls`, `visited_at`, `visit_count`）のいずれかが指定された場合:
     - `PostVisited` テーブルに upsert（既存レコード更新または新規作成）。
     - 排他処理として、該当ユーザーの該当投稿に対する `PostWantToGo` レコードを自動削除。
     - 投稿者本人以外の場合、通知および Web Push を送信。
  3. ボディが空（詳細データ未指定）の場合:
     - 既存の訪問レコードがあれば削除（トグル解除）。
     - なければ新規作成し、排他として「行きたい」を削除して通知を送信。
- **レスポンス (200):**
  ```json
  { "success": true, "marked": true, "data": { /* PostVisited レコード */ } }
  ```
  *(トグル解除時は `{ "success": true, "marked": false }`)*

### 4.10.1 `GET /api/posts/[id]/visited`
該当投稿と**同一店舗**（`google_place_id` または `store_name + address` 一致）に対するすべての訪問者（元投稿者および `PostVisited` 登録者）を集約し、重複排除したユニーク訪問件数、訪問ユーザー一覧、および閲覧者自身の訪問記録を取得。

- **プライバシー保護 (`is_restricted`):**
  - 閲覧者が投稿者本人・フレンド・共通グループ所属（身内）でない場合、非公開設定（`is_mine_only`）の記録や身外者の写真・感想コメントは `null` / `[]` にマスクされ、`is_restricted: true` が付与される。
- **ソート順:**
  - 返却される `users` 配列は `isMe（閲覧者自身）→ isAuthor（元投稿者）→ その他` の優先順で自動ソートされ、自分の記録が常に先頭に表示される。
- **レスポンス (200):**
  ```json
  {
    "success": true,
    "data": {
      "count": 3,
      "isMarked": true,
      "myRating": 4.5,
      "myVisitCount": 1,
      "myComment": "スープが絶品でした",
      "myImageUrl": "...",
      "myImageUrls": ["..."],
      "myVisitedAt": "2026-10-27T00:00:00.000Z",
      "users": [
        {
          "id": "uuid",
          "name": "ユーザー名",
          "avatar_url": "...",
          "rating": 4.5,
          "visit_count": 1,
          "comment": "...",
          "image_url": "...",
          "image_urls": [],
          "visited_at": "...",
          "isAuthor": true,
          "postId": "uuid",
          "isMe": false,
          "is_restricted": false
        }
      ]
    }
  }
  ```

### 4.11 `POST /api/posts/[id]/share`
指定したグループへ投稿を共有する。
- **Body:** `{ "group_ids": ["uuid1", "uuid2"] }`

### 4.12 `POST /api/posts/bulk-rating`
複数投稿の評価をまとめて更新する。
- **Body:** `{ "ratings": [{ "post_id": "uuid", "rating": 4.5 }] }`

---

## 5. タグ API (`/api/tags`)

### 5.1 `GET /api/tags`
現在のモード（`app_type` Cookie）に対応する自分のタグ一覧を取得（`sort_order` 順）。

### 5.2 `POST /api/tags`
新規タグを作成する。
- **Body:** `{ "name": "string", "sort_order": 0 }`

### 5.3 `PUT /api/tags/[id]`
タグ名または並び順を更新する。
- **Body:** `{ "name": "string", "sort_order": 1 }`

### 5.4 `DELETE /api/tags/[id]`
タグを削除する。関連する `post_tags` もカスケード削除。

### 5.5 `POST /api/tags/bulk`
一括タグ付け。複数投稿に指定タグを一括で付与または解除する。
- **Body:** `{ "post_ids": ["uuid1", "uuid2"], "tag_id": "uuid", "action": "add" | "remove" }`

### 5.6 `PUT /api/tags/order`
タグの並び順を一括更新する（ドラッグ＆ドロップ後）。
- **Body:** `{ "orders": [{ "id": "uuid", "sort_order": 0 }, ...] }`

---

## 6. ランキング API (`/api/rankings`)

### 6.1 `GET /api/rankings`
現在のユーザーのランキングデータを取得（タグ別）。

### 6.2 `GET /api/rankings/tags`
ランキングが設定されているタグ名一覧を取得。

### 6.3 `GET /api/rankings/top`
特定タグの上位N件のランキングを取得。
- **クエリパラメータ:** `tag_name`, `limit` (default: 10)

### 6.4 `POST /api/rankings`
ランキングを更新（upsert）する。
- **Body:** `{ "tag_name": "string", "rankings": [{ "post_id": "uuid", "rank": 1 }] }`

---

## 7. グループ & フレンド API

### 7.1 `GET /api/groups`
自分が所属する全グループ一覧を取得。

### 7.2 `POST /api/groups`
グループを新規作成。作成者が自動的に `admin` ロールで参加。
- **Body:** `{ "name": "string", "description": "string", "image_url": "string" }`
- `invite_code`: サーバー側でランダム8文字英数字を自動生成

### 7.3 `GET /api/groups/[id]`
グループ詳細（メンバー一覧含む）を取得。

### 7.4 `PUT /api/groups/[id]`
グループ情報（名前、説明、画像）を更新（adminのみ）。

### 7.5 `DELETE /api/groups/[id]`
グループを削除（adminのみ）。

### 7.6 `POST /api/groups/join`
招待コードでグループに参加する。
- **Body:** `{ "invite_code": "string" }`

### 7.7 `POST /api/groups/[id]/invite`
既存メンバーを招待する（招待コードの取得または再発行）。

### 7.8 `GET /api/groups/[id]/members`
グループメンバー一覧を取得。

### 7.9 `DELETE /api/groups/[id]/members/[userId]`
グループからメンバーを除名（adminのみ）。

### 7.10 `GET /api/groups/[id]/posts`
グループメンバーが共有した投稿一覧を取得。

### 7.11 `GET /api/friends`
自分のフレンド一覧を取得。

### 7.12 `POST /api/friends`
フレンド申請を送る。
- **Body:** `{ "friend_id": "uuid" }`

### 7.13 `GET /api/friends/pending`
未対応のフレンド申請一覧を取得。

### 7.14 `POST /api/friends/accept`
フレンド申請を承認する。
- **Body:** `{ "friendship_id": "uuid" }`

### 7.15 `DELETE /api/friends/[id]`
フレンドを削除する。

---

## 8. プロフィール・ユーザー・統計 API

### 8.1 `GET /api/profiles/me`
自分のプロフィール情報（名前、アバター、所属グループ、統計サマリー）を取得。

### 8.2 `PATCH /api/profiles/me`
自分のプロフィールを更新（名前、アバター画像URL）。
- **Body:** `{ "name": "string", "avatar_url": "string" }`

### 8.3 `GET /api/profiles/[id]`
指定ユーザーのプロフィール情報を取得（公開情報のみ）。

### 8.4 `GET /api/users/search`
ユーザーをメールアドレスまたは名前で検索する（フレンド追加用）。
- **クエリパラメータ:** `q` (検索キーワード)

### 8.5 `GET /api/stats`
統計・集計データを取得する（フィルターは `/api/timeline` と共通）。

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "totalPosts": 120,
    "genreData": [{ "name": "ラーメン", "count": 25 }, ...],
    "monthlyData": [{ "month": "2024年1月", "count": 10 }, ...],
    "noDateCount": 3,
    "ratingData": [{ "label": "★5", "count": 30 }, ...],
    "prefData": [{ "name": "東京", "count": 45 }, ...]
  }
}
```

### 8.6 `GET /api/user/hot-spring-history`
旅レコ（温泉）訪問履歴を取得する（タビレコ専用）。

### 8.7 `GET /api/profiles/[id]`
指定したユーザーのプロフィール情報、投稿一覧、他者投稿への「行った」一覧、他者投稿への「行きたい」一覧を取得。
- **リクエストパラメータ:** `id` (ユーザーID)
- **関係性判定ロジック (`relationship`):**
  - `self`: 本人自身
  - `friend`: 相互承認済みフレンド
  - `group`: 共通のグループに所属するメンバー
  - `stranger`: 上記いずれにも該当しない第三者
- **プライバシー制限 (`is_restricted`):**
  - `relationship === 'stranger'` の場合:
    - メールアドレスは非開示 (`null`)。
    - ユーザー自身の投稿のうち `status === 'want_to_go'` のものは、画像（`image_url`, `image_urls`）およびコメントを `null`/空配列にマスクし、`is_restricted: true` を付与。
    - 他人の投稿への「行きたい」も同様に画像・コメントをマスクし `is_restricted: true` を付与。
  - 身内（`isInsider`: self / friend / group）の場合は全データを開示 (`is_restricted: false`)。
- **他人の投稿への「行った」マージ処理:**
  - ユーザーが他人の投稿に対して追加した写真・コメント・評価・訪問日があれば、元投稿データより優先してマージ返却。
- **投稿拡張フィールド (`_visitedCount`):**
  - 各 `posts` 配列の投稿オブジェクトには、該当投稿に紐づく `PostVisited`（他の訪問者記録）の件数が `_visitedCount` として付加され、他人のマイページでの訪問者数バッジ表示等に利用される。
- **レスポンス (200):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "name": "...", "avatar_url": "...", "email": "..." },
      "posts": [ /* 投稿オブジェクト配列 (is_restricted フラグ付き) */ ],
      "markedVisitedPosts": [ /* 訪問データマージ済み投稿配列 */ ],
      "markedWantToGoPosts": [ /* 行きたい投稿配列 (is_restricted フラグ付き) */ ],
      "relationship": "stranger" | "friend" | "group" | "self",
      "stats": { "totalVisited": 15, "totalWantToGo": 8, "totalLiked": 5 }
    }
  }
  ```

---

## 9. 通知 API

### 9.1 `GET /api/notifications`
アプリ内通知一覧を取得（最新50件）。

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "like",
      "message": "○○さんがいいねしました",
      "is_read": false,
      "created_at": "2024-01-15T12:00:00Z",
      "actor": { "id": "uuid", "name": "名前", "avatar_url": "url" },
      "post": { "id": "uuid", "title": "...", "image_url": "..." }
    }
  ]
}
```

### 9.2 `PATCH /api/notifications`
指定した通知を既読にする（または全件既読）。
- **Body:** `{ "ids": ["uuid1", ...] }` または `{ "all": true }`

### 9.3 `GET /api/notifications/unread-count`
未読通知件数を返す。
- **レスポンス:** `{ "success": true, "count": 5 }`

---

## 10. Web Push 通知 API

### 10.1 `POST /api/push/subscribe`
Web Push 購読情報を登録または更新する。
- **Body:** `{ "subscription": { "endpoint": "url", "keys": { "p256dh": "...", "auth": "..." } } }`
- `app_type` Cookie から購読対象モードを自動判定

### 10.2 `POST /api/push/test` *(開発環境用)*
指定したユーザーへテスト Push 通知を送信する。

---

## 11. 画像アップロード API

### 11.1 `POST /api/upload/presign`
S3 Presigned PUT URL を生成する（サーバー側の AWS_ACCESS_KEY_ID/SECRET 使用）。

**リクエスト Body (JSON):**
```json
{ "fileName": "photo.jpg", "contentType": "image/jpeg" }
```
**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://s3-presigned-url",
    "key": "users/{userId}/{timestamp}-photo.jpg",
    "publicUrl": "https://bucket.s3.region.amazonaws.com/key"
  }
}
```

### 11.2 `POST /api/upload/s3-credentials`
Cognito Identity Pool から一時S3クレデンシャルを取得する（クライアント直接アップロード用）。
- **Body:** `{ "id_token": "cognito_id_token" }` （Cookieから自動取得も試みる）
- **レスポンス:** 一時 `AccessKeyId`, `SecretKey`, `SessionToken`

### 11.3 `POST /api/upload/s3-proxy`
サーバー側経由でS3にファイルをアップロード（フォールバック用）。
- **Body:** `FormData` (`file` フィールド)

### 11.4 `POST /api/upload/file`
ファイルを受け取り、Sharp でリサイズ・最適化してからS3へアップロードする。
- **Body:** `FormData` (`file` フィールド)
- **処理:** EXIF除去、最大1200px幅リサイズ、JPEG品質80%圧縮

---

## 12. Google Places API プロキシ

### 12.1 `GET /api/places/search`
Google Places Autocomplete APIへのサーバー側プロキシ。APIキーを隠蔽する目的で提供。
- **クエリパラメータ:** `input` (検索文字列), `location` (緯度経度)

### 12.2 `GET /api/places/details`
Google Place Details APIへのプロキシ（住所、電話、緯度経度の取得）。
- **クエリパラメータ:** `place_id`

### 12.3 `GET /api/places/photo`
Google Place Photos APIへのプロキシ（写真URLの取得）。
- **クエリパラメータ:** `photo_reference`, `maxwidth`

---

## 13. その他 API

### 13.1 `GET /api/manifest`
PWA マニフェストを動的生成して返す（`app_type` Cookie に応じてアイコン・テーマ色を切替）。

### 13.2 `GET /api/mypage/*`
マイページ用の集計・プロフィールデータを返す専用エンドポイント群。

### 13.3 `POST /api/setup/*`
初期セットアップ用エンドポイント（DBマイグレーション後の初期データ投入等）。

---

## 14. エラーコード一覧

| HTTP ステータス | 説明 | 主な原因 |
| :---: | :--- | :--- |
| `400` | Bad Request | 必須パラメータ不足、型不正 |
| `401` | Unauthorized | 未認証、JWT期限切れかつリフレッシュ失敗 |
| `403` | Forbidden | リソース所有者以外によるアクセス（編集・削除等） |
| `404` | Not Found | 指定IDのリソースが存在しない |
| `409` | Conflict | 重複操作（すでにいいね済み等）|
| `500` | Internal Server Error | DB接続失敗、AWS API呼び出し失敗、予期せぬ例外 |
