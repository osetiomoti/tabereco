# 食べレコ 変更履歴 (CHANGELOG.md)

本ドキュメントは、「食べレコ（tabereco）」における機能追加、仕様変更、リファクタリング、バグ修正の履歴を記録するものです。

---

## 2026-11-19
### 変更内容
1. **タイムライン画面（`/posts`）の完全撤廃 ＆ ホーム画面（`/`）への即時リダイレクト化**
   - **タイムライン画面のリダイレクト化:**
     - スマートフォンのホーム画面アイコンやブックマーク、ブラウザ履歴等から `/posts` が直接開かれた場合でも、即座にホーム画面（`/`）へ転送されるよう改修（ミドルウェア `src/proxy.ts` およびページ `src/app/posts/page.tsx` の両方で対応）。
   - **アプリ内関連導線の完全整理:**
     - ホーム画面（`src/app/page.tsx`）のクイックアクションから「タイムライン」ボタンを削除し、「検索・マップ」「カレンダー」「統計」「ランキング」の4つに整理。
     - ヘッダー戻るボタンのフォールバック先、投稿詳細からの戻り先、投稿作成・削除後の遷移先を `/posts` から `/map`（検索）または `/`（ホーム）へ統一。

2. **検索画面（`/map`）ヘッダー登録ボタン削除 ＆ 上部UIの劇的省スペース・スリム化**
   - **ヘッダー上部の「＋」ボタン削除:**
     - 検索画面ヘッダー右上の追加ボタンを撤去し、画面右下の常時フローティングアクションボタン（`FloatingActionButton`）に一本化。
   - **検索バーのスマート化（独立トグル行の撤廃）:**
     - 縦幅を取っていた「🏪 店名で絞り込み」「📍 住所で絞り込み」の巨大ボタン行（約40px）を撤廃。
     - 単一の入力バー（「店名、住所、エリアで検索...」）に集約し、Prisma クエリ側で店名・タイトル・住所のいずれにも自動でヒットするスマート検索（OR検索）を標準化。
   - **フィルターチップ（`FilterChips`）の1行横スクロール統合:**
     - 2段（グループ行＋タグ/評価行）に分かれていたチップ群を、1本のスムーズな横スクロールレールに統合。高さ約40pxを削減。
   - **件数表示 ＆ リスト/マップ切り替えタブの1行統合:**
     - 独立したセグメントコントロール（約48px）と件数表示（約28px）を、左側「📍 〇店舗」・右側「[リスト | マップ]」のモダンなコンパクト1行（約30px）に統合。
   - **ファーストビューの大幅拡大:**
     - 上部コントロール群の縦専有面積を約140px〜160px以上削減し、店舗カードがファーストビューで2〜3枚しっかり視認できるよう一覧性を劇的に改善。マップの表示領域も `h-[calc(100dvh-200px)]` に拡大。

2. **ボトムナビゲーションを5タブ構成に再編 & ホーム画面（`/`）起動への復元**
   - **ボトムナビゲーション (`BottomNav.tsx`):**
     - タブ構成を【 🏠 ホーム (`/`) ｜ 🔍 検索 (`/map`) ｜ 📊 統計 (`/stats`, `/calendar`) ｜ 🏆 ランキング (`/rankings`) ｜ 👤 マイページ (`/mypage`) 】の5タブに再編。
     - futariba スタイルのモダンなデザイン（アクティブ時の primary カラー、微細スケールアニメーション、下部インジケータードット）を維持。
     - ボトムバー中央のFAB（＋ボタン）を撤去し、タブ間のスペースを均等配置。
   - **アプリ起動画面・ログイン後遷移先:**
     - アプリ起動時のルートをホーム画面（`/`）に復元。
     - PWAマニフェスト (`src/app/api/manifest/route.ts`) の `start_url` を `/` に変更。
     - セッション復元・OAuthコールバック後の初期遷移先を `/` に設定。

2. **検索画面（`/map`）への新規記録追加ボタン配置**
   - ヘッダー右上に「＋」ボタン（グラデーション丸ボタン）を設置。
   - 画面右下に常時表示されるフローティングアクションボタン（`FloatingActionButton`）を配置し、リスト・マップのどちらを表示していてもワンタップで `/posts/new`（新規記録）へ遷移可能に。

3. **フィルターチップ（`FilterChips`）のバグ修正および機能拡張**
   - **グループチップの「×」解除対応:**
     - グループチップの「×」をクリックした際に、当該グループのみを除外したID配列を `activeGroups` に即座に反映。
     - すべてのグループチップを削除した場合は、自動で全グループ選択状態（`['all']`）にフォールバック。
   - **状態（status）・価格帯（price）・評価（rating）フィルターチップの新規追加:**
     - 状態フィルター: 「✅ 行った」「📌 行きたい」「❤️ いいね」チップを表示し、「×」で個別に解除可能。
     - 価格帯フィルター: 「💰 ¥min〜¥max」「💰 ¥min〜」「💰 〜¥max」チップを表示し、「×」で解除可能。
     - 評価フィルター: 「★ min〜max」「★ min以上」「★ 未評価のみ」チップを表示し、「×」で解除可能。
   - **「🗓️ none」表示バグの修正:**
     - `period` が `'none'` または `'all'` の場合に不正なチップが表示されていた問題を修正。
   - **フィルター一括クリアボタンの完全対応:**
     - 「クリア」ボタン押下時に状態、グループ、詳細フィルターすべてを一括リセット。
   - **FilterModal との連携強化:**
     - FilterModal の適用時・初期表示時に `status`（activeTab）を双方向同期。

   - **PWA マニフェスト (`src/app/api/manifest/route.ts`):**
     - `start_url` が旧 `/posts` になっていたため、PWA（ホーム画面アイコン）から起動した際にタイムラインが開いていた問題を解消し、`start_url: '/map'` に修正。
   - **ログインセッション復元 (`src/app/login/page.tsx`):**
     - `localStorage` からの自動セッション復元時の遷移先を旧 `/posts` から `/map`（またはクエリ指定先）に修正。

1. **futariba（ふたりば）準拠の中央「＋」FABボトムナビゲーション & カラーシステム完全統一**
   - **ボトムナビゲーション（案A ＋ センターFAB登録ボタン）:**
     - 構成: 【 🔍 検索 ｜ 📊 統計 ｜ ［ ＋ 投稿 ］ ｜ 🏆 ランキング ｜ 👤 マイページ 】
     - 中央に浮遊感のあるモダンなグラデーション丸ボタン（`bg-gradient-to-tr from-primary-500 to-orange-400 shadow-soft active:scale-90`）を新設。どの画面からでもワンタップで即座に `/posts/new`（記録・登録）へ遷移可能。
   - **アプリ初期画面を「検索画面（/map）」に変更:**
     - アプリ起動時（ルート `/`）、未指定アクセス、およびログイン成功後の初期遷移先をすべて `/map`（検索・マップ画面）に統一。
     - 旧ホーム画面のコンテンツは `/home` でいつでもアクセス可能。
   - **位置情報プロンプトの永続化（次回以降の自動問い合わせ抑止）:**
     - `src/app/map/page.tsx` のキャッシュ保存先を `sessionStorage` から `localStorage` に変更。
     - 一度位置情報が許可・保存された後は、自動でブラウザの `getCurrentPosition` を再実行せず、保存された都道府県 Bounds を即座に適用。手動で現在地ボタン（🎯）を押した時のみ手動更新。
   - **テーマカラー & ボタン色を futariba パレット（#FF6F91）に完全同期:**
     - `tailwind.config.mjs` に `futariba` と完全同一の `primary-50` 〜 `primary-900` パレット（メイン: `#FF6F91`）を定義。
     - `globals.css` の `--color-primary` を `#FF6F91`（コーラルピンク）に同期。
     - `ConfirmDialog` のボタン色を `primary` 準拠に統一。

1. **メインナビゲーション改編（タイムライン・検索の重複解消 & 統計・振り返りへの導線昇格）**
   - **ボトムナビゲーション (`BottomNav.tsx`) のタブ構成変更（案1）:**
     - 従来の「ホーム / タイムライン / マイページ / 検索 / ランキング」から、「ホーム (`/`) / 検索 (`/map`) / マイページ (`/mypage`) / 統計 (`/stats`) / ランキング (`/rankings`)」へ再編。
     - タイムラインと検索・マップの機能重複（キーワード検索・詳細フィルター・リスト表示）を解消し、検索機能は `/map` に集約。
     - これまで奥にあったリッチなグラフ分析画面（`/stats`）をボトムナビから1タップで直接開けるように昇格。
   - **統計（`/stats`）とカレンダー（`/calendar`）の相互シームレス連携:**
     - 統計画面の上部に「統計・グラフ」と「カレンダー」の切り替えタブおよびヘッダー右上のカレンダーダイレクト遷移アイコンを新設。
     - カレンダー画面の上部ヘッダーにも「統計・グラフ」への切り替えタブを新設し、過去の食事・旅行ログをグラフ分析（統計）と日別履歴（カレンダー）の両面からシームレスに行き来できるように統合。
     - カレンダー画面閲覧中もボトムナビの4番目（統計タブ）がアクティブ表示されるようにパス判定を拡張。
   - **タイムラインへの導線確保:**
     - ホーム画面（`/`）のクイックアクションおよび最新の投稿からタイムライン（`/posts`）へ従来通りアクセス可能。

2. **futariba（ふたりば）リポジトリとの実装方式・アーキテクチャ統一**
   - **Tailwind 設定の拡充 (`tailwind.config.mjs`):**
     - カード共通角丸 `rounded-card` (`20px`)、浮遊感シャドウ `shadow-soft`, `shadow-soft-sm`、iOS Safe Area 用の `spacing` (`safe-bottom`, `safe-top`) を追加定義。
   - **グローバルスタイル & iOS 最適化 (`src/app/globals.css`):**
     - Safe Area CSS変数 (`--safe-area-inset-*`)、タップハイライト無効化 (`-webkit-tap-highlight-color: transparent`)、モバイル向けスクロールバー非表示、レイヤークラス (`.pb-tab-safe`, `.pb-safe`, `.pt-safe`) を `futariba` と完全同期。
   - **ボトムナビゲーション最適化 (`src/components/BottomNav.tsx`):**
     - iOS Safari 復帰時の `visibilitychange` による強制リフロー処理、ハードウェアアクセラレーション (`transform: translateZ(0)`) を追加し、fixed ナビゲーションのチラつきや固まりを防止。
   - **共通UIコンポーネント新設 (`src/components/ui/`):**
     - `ConfirmDialog`（iOS風の統一確認ダイアログ。ESCキー・背景タップキャンセル・ローディング対応）を作成し、`DeleteButton` のインラインモーダルをこれに差し替え。
     - `EmptyState`（アイコン・絵文字・メッセージ・アクションボタンを持つ統一空状態表示部品）を作成。
   - **API型定義の拡充 (`src/types/api.ts`):**
     - `futariba` と共通の `ApiResponse<T>`, `PaginationMeta`, `PaginatedResponse<T>` を追加。

2. **Turbopack ビルドエラー修正（`next/font/google` から CSS `@import` + CSS変数定義へ移行）**
   - Next.js 16 (Turbopack) 環境で `next/font/google` の `Noto_Sans_JP` / `Outfit` 解決時に発生していた `@vercel/turbopack-next/internal/font/google/font` モジュール解決エラーを解消。
   - `futariba` (`src/app/globals.css`) と同一の実装方式に統一：
     - `src/app/globals.css` に `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@400;500;600;700&display=swap');` を定義。
     - `:root` で `--font-outfit` および `--font-noto` のCSS変数を定義。
     - `src/app/layout.tsx` から `next/font/google` のインポートおよび変数を削除し、Turbopack/Webpack双方で安定してビルドが成功するように改修。

2. **Neon データベースの `neondb` から `tabereco` への完全移行**
   - 移行先 `tabereco` データベースに `prisma db push` を実行し、全テーブル・インデックス・外部キー制約を同期生成。
   - 外部キー依存関係を遵守した専用移行スクリプトを実行し、`neondb` の全15テーブル（users 26件, posts 682件, tags 427件, post_tags 1326件, notifications 1493件等）を1件の欠損もなく `tabereco` へ完全コピー＆照合検証を完了。
   - `.env` の `DATABASE_URL` および `DIRECT_URL` の接続先を `/tabereco` に更新。

2. **リポジトリ内の不要ファイル・レガシー残骸コード・一時ファイルの徹底クリーンアップ**
   - **ルート直下の作業ログ・一時ダンプ・バッチ削除:**
     - `build_output.txt`: 過去のビルドログ
     - `db_dump.json`: 過去のDBダンプ
     - `push.bat`, `setup_git.bat`: 過去の初期化・ハードコードされたバッチ
   - **一時フォルダの削除:**
     - `tmp/`: 過去のDBカラム追加・調査用スクリプト群（`add-columns.js`, `add-price.js`, `check_db.js`, `check_db_restore.js`, `find-schema.js`, `plan.md`）
     - `scratch/`: 画像サイズ調査等のスクラッチスクリプト群（`check-images.js`, `measure-image-sizes.js`, `test-s3-list.js`）
   - **不要なワンタイムスクリプトの削除:**
     - `scripts/migrate-supabase-to-neon.js`: 旧SupabaseからNeonへの移行スクリプト（接続文字列平文含むためセキュリティ面でも削除）
     - `scripts/debug-tags.js`, `scripts/fix-post-tags.js`: 過去のタグデバッグ・修正用
     - `scripts/make_icon.py`, `scripts/resize-tabireco-icons.js`: 過去のアイコン生成・リサイズ用
     - `scripts/migrate_hot_spring.js`: 過去の温泉スキーマV2移行用
     - `scripts/check-image-urls.mjs`: 過去の画像ドメイン検証用
     - `prisma/check-posts.ts`: 過去の確認用ログスクリプト
   - **未使用コード・コンポーネント・フックの削除:**
     - `src/lib/database.types.ts`: 0バイトの空ファイル
     - `src/hooks/useFilteredPosts.ts`: 検索画面のサーバーサイドAPI移行（`/api/posts/search`）に伴い完全不要となった全件取得フック
     - `src/hooks/usePosts.ts`, `src/hooks/useProfile.ts`: どこからも未使用の古いフック
     - `src/components/PostDetailSheet.tsx`: 投稿詳細フルページ化に伴い完全未使用となった古いボトムシート
     - `src/components/SchemaSetupHelp.tsx`: 旧Supabase時代の古いSQL案内コンポーネント
     - `src/components/ShareButton.tsx`: どこからも未使用の古いシェアボタン
   - **クリーンアップ後の検証:**
     - `npx tsc --noEmit` および `npm run build` を実行し、全58ルートのビルドおよびTypeScript型検査が完全にエラーなく成功することを確認。

---

## 2026-11-12
### 変更内容
1. **検索画面（/map）の高速化・リスト100件ずつページネーション & 無限スクロールの実装**
   - リスト検索API (`GET /api/posts/search`) を新設。Prismaの `take: 100`, `skip: (page - 1) * 100` によりサーバー/DB側で取得件数を厳格に100件へ制限。
   - `IntersectionObserver` による無限スクロールを導入し、リスト末尾到達時に次の100件を自動取得。
   - 全フィルター条件（キーワード、住所/店名、ステータス、タグ、期間、価格、評価、グループ、温泉等）をDBクエリで適用し、全ソート順で第2ソートにIDを指定してページネーション順序を安定化。
   - リクエストIDによる競合防止、重複排除、末尾ローディングスピナーおよび全件読み込み完了メッセージを表示。

2. **マップ初期表示範囲の最適化（都道府県全体Boundsの自動適用）**
   - 47都道府県の境界定義（Bounds: north, south, east, west）および座標からの都道府県判定ユーティリティ (`src/lib/prefectures.ts`) を新設。
   - Geolocation APIから現在地の都道府県（愛知県、東京都等）を即座に判定し、Google Maps の `fitBounds(bounds, padding)` により、愛知県なら愛知県全体、東京都なら東京都全体が画面いっぱいに収まる適切な縮尺で初期表示するよう最適化。
   - 位置情報未許可・取得失敗時も保存済みキャッシュまたは愛知県Boundsへ安全にフォールバック。

3. **マップ表示範囲（Bounds）に応じた軽量ピンデータ取得の実装**
   - マップ用検索API (`GET /api/posts/map`) を新設。地図の移動・ズーム停止時（`idle` イベント＋350msデバウンス）に画面内表示範囲（Bounds）のみをDB側で絞り込み取得。
   - 画像配列や長文コメントを除外した超軽量データ構造（ピン表示に必要なID・座標・ステータス・評価・代表画像URL1枚・タグのみ）により、大量データ時でも地図操作が重くならないよう最適化。

4. **リスト・マップのフィルター完全共有**
   - 共通クエリビルダー (`src/lib/searchQuery.ts`) を新設し、リスト用APIとマップ用APIで全く同一の検索・権限・フィルター条件をDBレベルで保証。
   - リスト／マップのタブ切り替え時も検索条件・キーワード・フィルターチップ・件数を完全に維持。

### 影響範囲
- `src/lib/prefectures.ts`（新規作成: 47都道府県境界データ・判定ロジック）
- `src/lib/searchQuery.ts`（新規作成: 共通検索クエリ・OrderBy構築・パラメータビルダー）
- `src/app/api/posts/search/route.ts`（新規作成: リスト表示用ページネーションAPI）
- `src/app/api/posts/map/route.ts`（新規作成: マップ表示用表示範囲ピンAPI）
- `src/hooks/useGroupMembers.ts`（新規作成: フィルター用軽量グループ・メンバー情報フック）
- `src/components/MapView.tsx`（`initialBounds` の `fitBounds` 適用、`onBoundsChange` の `idle` イベント通知追加）
- `src/app/map/page.tsx`（検索画面全体の高速化・100件ページネーション・無限スクロール・都道府県初期表示統合）
- `APP_SPECIFICATION.md`、`API_SPECIFICATION.md`、`TECHNICAL_DOCUMENTATION.md`、`IMPLEMENTATION_STATUS.md`、`PROJECT_HANDOVER.md`、`CHANGELOG.md`

---

## 2026-11-10
### 変更内容
1. **店舗写真の表示切り替え・フレンド共有写真ギャラリー機能の追加**
   - 店舗詳細画面（`/posts/[id]`）に「この投稿」「みんなの写真」の表示切り替えタブを導入。
   - 「この投稿」タブでは、選択中の投稿に登録された写真カルーセル（`ImageCarousel`）やお気に入りボタンの既存動作をそのまま維持。
   - 「みんなの写真」タブでは、同一店舗（`getStoreKey` 判定準拠）に属する自分・フレンド・所属グループメンバーの写真をグリッド形式でまとめて表示。
   - グリッドの各サムネイル左下に投稿者アバター（自分の場合は「自分」バッジ）を表示。
   - 写真タップ時に拡大モーダルを表示し、高解像度写真・投稿者名・訪問日・コメント・元投稿への遷移リンク（「この投稿を見る」）・前後送りナビゲーションを提供。

2. **店舗写真共有API (`GET /api/posts/[id]/store-photos`) の新設**
   - サーバーサイドで同一店舗の全投稿（Post）および訪問記録（PostVisited）から写真データを集約。
   - 閲覧権限チェックを厳密に実施（閲覧者本人、相互フレンド、同一グループメンバーのみに限定。非公開 `is_mine_only` 投稿は本人のみ）。
   - 権限のないユーザーの写真や情報はレスポンスから完全に除外。
   - 新しい訪問日/作成日の記録を優先ソートし、画像URL単位で重複排除を実施。

3. **下部メニュー「マップ」を「検索」に変更＆リスト・マップ切り替え機能の実装**
   - 下部ナビゲーション（`BottomNav`）のラベルを「検索」、アイコンを `Search` に変更。
   - 検索画面（`/map`）の初期表示をカード形式の「リスト」に変更。
   - 上部に「思い出」画面と完全に同一デザイン・サイズ・余白（`bg-gray-100/80 rounded-[14px] p-1 border border-black/5 shadow-inner`）の「リスト」「マップ」切り替えUIを配置。
   - リスト表示時は `groupPostsByStore` により店舗単位で集約した `SearchStoreCard` 一覧を表示し、同一店舗の重複カード発生を防止。
   - フィルター・検索状態（店名/住所、キーワード、絞り込みモーダル、チップ）を共通の `useFilteredPosts` state で管理し、リスト ⇄ マップの切り替え時も完全に状態を維持。
   - マップ上のピン・クラスタリング・現在地・下部カードプレビュー等の既存マップ機能はそのまま維持。

### 影響範囲
- `src/components/BottomNav.tsx`（メニューラベル・アイコン変更）
- `src/components/SearchStoreCard.tsx`（新規店舗カードコンポーネント）
- `src/app/map/page.tsx`（検索画面リニューアル・リスト/マップ切り替え・フィルター連動）
- `src/app/api/posts/[id]/store-photos/route.ts`（新規APIエンドポイント）
- `src/components/PostPhotoSection.tsx`（新規タブ切り替え・ギャラリー・拡大モーダルコンポーネント）
- `src/app/posts/[id]/page.tsx`（写真エリアを `PostPhotoSection` に統合）

---

## 2026-11-10（追記）
### 変更内容

4. **詳細画面「行った」→「詳細を記録する」をタイムラインと同一動作に修正**
   - 店舗詳細画面（`/posts/[id]`）の `RatingAndActions` コンポーネントで、未登録時に `VisitChoiceModal` → 「詳細を記録する」を選ぶと、タイムラインと同様に `buildNewPostUrlFromStore()` で投稿フォーム（`/posts/new?...`）へ遷移するように修正。
   - これにより、タグ・温泉情報・写真・金額・メモなどすべてのフィールドを入力可能になった。
   - `RatingAndActions` に `post` プロパティを追加し、詳細画面から渡すよう変更。

5. **検索画面（リスト表示）の SearchStoreCard を強化**
   - 画像左上のバッジを「行った」テキストから「👤 N人」（行った人数）表示に変更（マイページと同様）。
   - タイムラインと同一デザインのアクションバー（行った / 行きたい / マップ）を追加。
   - 「行った」ボタン：未登録時は `VisitChoiceModal` を表示し、詳細記録は投稿フォームへ遷移。登録済みの場合は `VisitedModal` を開いて編集可能。
   - 「行きたい」ボタン：楽観的UIでトグル更新。
   - 「マップ」ボタン：座標がある場合に Google Maps 外部リンクを表示。
   - `StoreGroupItem` 型に `userCount` フィールドを追加し、`map/page.tsx` のグルーピング時にユニークユーザー数を計算。

6. **検索画面（リスト表示）に価格帯（¥min〜max）表示を追加**
   - `SearchStoreCard` の評価・件数エリアに価格帯バッジ（`formatPriceRange`）を追加。
   - `map/page.tsx` の `storeGroups` 集計時に、店舗内の全投稿から最小金額（`priceMin`）と最大金額（`priceMax`）を算出し、未設定時は代表投稿からフォールバックしてカードに連携。
   - 単一金額の場合は「¥1,000」、幅がある場合は「¥1,000〜2,000」、上限または下限のみの場合は「¥1,000〜」「〜¥2,000」形式で直感的に表示。

7. **タイムライン画面（PostCard）に投稿コメント表示＆「詳細を見る」インライン展開を追加**
   - タイムライン上のカード内に投稿者の感想・メモ（`post.comment`）を表示。
   - デフォルトは1行表示（`line-clamp-1`）とし、長いコメントには「詳細を見る」ボタンを表示。
   - タップ時に親カード遷移を防ぎつつその場で全文展開 ⇄「閉じる」ができるアコーディオンUIを実装。

8. **検索画面（リスト表示）の SearchStoreCard にフルアクションバー＆インラインパネルを追加**
   - タイムライン（PostCard）と同一のフルアクションバー（コメント / いいね / 行った / 行きたい / 評価 / マップ / 詳細を見る ∨）を実装。
   - 「コメント」ボタン：`InlineCommentPanel` を展開し、スレッド閲覧およびコメント投稿が可能。
   - 「いいね」ボタン：ワンタップでいいねトグル（楽観的UI）。
   - 「評価」ボタン：星評価スライダーパネルを展開しインライン保存。
   - 「詳細を見る ∨」ボタン：`InlineDetailPanel` を展開し、メモやいいね・行った・行きたい・評価したユーザー一覧を表示。

9. **「行った」ステータス判定バグ修正＆「行った」ボタン押下時の動作最適化**
   - 検索画面リスト表示（`map/page.tsx`）で、他人の訪問投稿がある店舗もすべて `hasVisited = true` になってしまっていた判定不具合を修正。ログインユーザー自身の投稿（`__is_mine === true` かつ `status === 'visited'`）または他人の投稿に対する自身の訪問マーク（`_isMarkedVisited`）のみで正しく判定するよう是正。
   - 「行った」登録済み状態で「行った」ボタンを押したときの挙動を改善：
     - 詳細を登録している場合（自身のPost投稿がある場合）: その投稿の編集画面（`/posts/${id}/edit`）へ遷移
     - 訪問記録に写真やコメントの詳細がある場合: `VisitedModal` を開いて編集
     - 単に行動記録（クイック訪問）のみの場合: ワンタップで単純に「行った」を解除（外す）するトグル動作に変更（`/api/posts/[id]/visited` の `DELETE` エンドポイントを新設対応）。

### 影響範囲（追記分）
- `src/app/map/page.tsx`（`hasVisited` / `hasWantToGo` のユーザー自身判定への修正、`myPostId` 追加）
- `src/components/SearchStoreCard.tsx`（「行った」解除トグルおよび詳細登録時の編集画面遷移分岐の実装）
- `src/components/PostCard.tsx`（クイック訪問時の「行った」解除トグルの実装）
- `src/app/api/posts/[id]/visited/route.ts`（`DELETE` ハンドラの新設）

---


## 2026-11-05
### 変更内容
1. **他人のマイページ「行った」カードに訪問者数バッジを追加**
   - `/api/profiles/[id]` のレスポンスに各投稿の `_visitedCount`（`PostVisited` 件数）を付与。
   - `targetUserId` が設定されている（他人のマイページ閲覧）かつ `status=visited` のカードで、訪問者数 > 0 の場合に左上に `👤 N+1` バッジ（白いUserアイコン＋投稿者含む合計人数）を表示。
   - `_visitedCount > 0` の場合は評価バッジより訪問者数バッジを優先表示。

2. **マイページ「行った」タブの訪問人数バッジ Userアイコン色を白っぽく変更**
   - `text-orange-400` → `text-white/70` に変更し、黒背景バッジとの対比を向上。

3. **マップの同一座標クラスタリング表示**
   - 緯度経度を小数点4桁で丸めて一致する投稿を同一座標グループとして扱い、複数投稿がある場合は丸いクラスターピン（件数バッジ付き円形）で表示。
   - 訪問済みのみ: 赤（`#EA4335`）、行きたいのみ: 青（`#1A73E8`）、混在: アンバー（`#F59E0B`）で色分け。
   - クラスターピンタップ時は最初の代表投稿の詳細カードを表示。

4. **`/api/posts/[id]/visited` 訪問者リストのソート順修正**
   - 返却する訪問者一覧を `isMe（自分）→ isAuthor（投稿者）→ その他` の順にソートし、ログインユーザー自身の記録が常に先頭に表示されるように修正。

### 影響範囲
- `src/app/api/profiles/[id]/route.ts`（`_visitedCount` 追加）
- `src/app/mypage/page.tsx`（訪問者バッジ追加・Userアイコン色変更）
- `src/components/MapView.tsx`（クラスタリングロジック追加）
- `src/app/api/posts/[id]/visited/route.ts`（訪問者リストのソート）

---

## 2026-11-04
### 変更内容
1. **`storeUtils.ts` に `buildNewPostUrlFromStore` 関数を追加**
   - 既存投稿の店舗情報（店名・住所・PlaceID・座標・タグ）を引き継いで `/posts/new` へ遷移するURLを生成するユーティリティ関数を追加。
   - `StoreVisitorsSection` の「詳細を記録する」ボタンからこの関数を呼び出し、`status=visited` パラメータ付きで `PostForm` を開くフローを確立。

2. **「行った」詳細記録の2パターンを明確化**
   - `VisitChoiceModal` → 「詳細を記録する」 → `/posts/new?status=visited&name=...&tags=...` → `PostForm`（通常の新規投稿フォーム：タグ・写真・評価・住所・コメントなど全フィールドあり）
   - `VisitChoiceModal` → 「行ったのみ記録」 → `PostVisited` テーブルへ直接登録（評価・訪問日・写真・コメントのみ）
   - これにより「行った」登録時に通常投稿と同じ全フィールドでの記録が可能になった。

3. **`StoreVisitorsSection` の「自分も記録」ボタンの遷移フロー改善**
   - 「自分も記録」ボタンタップ時に `VisitChoiceModal` を経由して、詳細 (`PostForm`) またはクイック (`PostVisited`) を選択できるようにした。

4. **マイページ「行った」タブの店舗単位統合集約表示（二段構成・区切り線の撤廃）**
   - 「自分の行った」と「みんなの投稿の行った」の区切り線を撤廃し、同一店舗（Google Place ID または店名+住所）単位で1つのグリッドに完全集約して表示。
   - 自分の投稿が存在する店舗は自分の投稿が代表として優先され、他ユーザーの投稿のみの店舗は最新の投稿が代表表示される（同一店舗の重複排除）。
   - 各店舗カード上に代表写真、店舗名、住所、ユニーク訪問人数バッジ（`👤 〇人`）、平均評価を表示。

5. **ビルド確認**
   - `npm run build` が全ルートエラーなしで成功することを確認済み。

### 影響範囲
- `src/app/mypage/page.tsx`（「行った」タブのグルーピングロジックおよびUI表示の統合）
- `src/lib/storeUtils.ts`（`buildNewPostUrlFromStore` 追加）
- `src/components/StoreVisitorsSection.tsx`（`VisitChoiceModal` 連携）
- `src/components/PostForm.tsx`（URLパラメータ読み込み確認）
- `src/components/PostCard.tsx`
- `src/components/PostSocial.tsx`
- `src/components/VisitChoiceModal.tsx`

---

## 2026-10-30
### 変更内容
1. **「みんなの投稿の『行った』」店舗単位グルーピング表示へのUX改善**
   - これまで投稿ごとに個別表示されていた他人の「行った」投稿を、同一店舗単位で1枚の店舗カードに集約表示するようマイページ（`/mypage`）を改修。
   - 同一店舗の識別ロジックを共通ユーティリティ（`src/lib/storeUtils.ts`）に集約：
     - ① `google_place_id` が存在する場合はプレイスIDで厳密に同一判定。
     - ② プレイスIDがない場合は `store_name + address` の組み合わせで判定（店名単体での全国チェーン誤統合を防止）。
     - ③ 情報が不十分な場合は個別扱い。
   - 店舗カード上に代表写真（最新の訪問・投稿写真）、店舗名、住所、ユニーク訪問人数バッジ（`👤 〇人`）、平均評価を表示。
2. **投稿・店舗詳細画面（`/posts/[id]`）における「同じ店に行った人の記録」セクション新設**
   - 新規コンポーネント `StoreVisitorsSection` を作成し、投稿詳細ページに配置。
   - 同一店舗に対するすべての訪問者（元投稿者 + `PostVisited` 登録者）を重複排除（ユニーク化）してリスト表示。
   - 各訪問者のアバター、ユーザー名、訪問日、評価（星）、訪問回数、コメント、写真サムネイル（タップで全画面プレビュー可能）を一覧表示。
   - プライバシー制御（`is_restricted`）：本人・フレンド・共通グループ以外の閲覧者に対しては、非公開記録の写真やコメントを非表示（「身内限定」表示）にする保護を徹底。
   - ログインユーザー自身の記録カードには「編集」ボタンを常時提供し、`VisitedModal` から日付・写真・コメント・評価を直接修正・削除可能。
   - 未記録のユーザーには「自分も記録」ボタンを提供し、ワンタップで記録フローを開始可能。
3. **バックエンド API（`/api/posts/[id]/visited`）の店舗横断集約・プライバシー制御強化**
   - 該当投稿と同一店舗（`google_place_id` または `store_name + address`）のすべての投稿・訪問記録を検索し、ユーザー単位でマージして返却。
   - フレンドシップ・グループ所属判定に基づき、身外者アクセス時の写真・コメントのマスク処理をAPI側で厳格に適用。
4. **ブランド名称の「食べレコ（tabereco）」への完全統一（mogureco の徹底排除）**
   - 各画面のメタデータタイトル（`/posts/[id]`, `/posts/[id]/edit`, `/posts/new`）や SNS シェア文言（`ShareButton.tsx`）等に残存していた「モグレコ」「MoguReco」をすべて「食べレコ」「tabereco」に修正。

### 影響範囲
- `src/lib/storeUtils.ts` (新規作成)
- `src/components/StoreVisitorsSection.tsx` (新規作成)
- `src/app/mypage/page.tsx`
- `src/app/posts/[id]/page.tsx`
- `src/app/posts/[id]/edit/page.tsx`
- `src/app/posts/new/page.tsx`
- `src/components/ShareButton.tsx`
- `src/components/SchemaSetupHelp.tsx`
- `src/app/api/posts/[id]/visited/route.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/profiles/[id]/route.ts`

---

## 2026-10-28
### 変更内容
1. **「行った」記録モーダル (`VisitedModal`) のモバイル表示・保存ボタン視認性改善**
   - モバイル端末（iOS Safari / Chrome）でアドレスバーや下部メニューバー、ホームインジケータにモーダル下部の「記録を保存」「あとで入力」ボタンが隠れて見えなくなる問題を修正。
   - モーダル最大高さを `max-h-[85dvh]` に設定し、フッターに `shrink-0` と `safe-area-inset-bottom` 対応パディングを適用して常時固定表示化。
   - スクロールしなくても即座に保存できるよう、ヘッダー右上（閉じるボタンの左）にクイック「保存」ボタンを追加配置。
   - コンテンツ部分に `min-h-0` と `overscroll-contain` を追加し、縦スクロールがフッターを画面外へ押し出さないようレイアウトを最適化。
2. **「行った」ボタン押下時のステップ選択機能（`VisitChoiceModal`）の新設**
   - 未登録の投稿で「行った」ボタンを押下した際、即座に詳細入力画面を開くのではなく、ワンクッション選択モーダル（`VisitChoiceModal`）を起動するように改善。
   - 「詳細を記録する（写真・日付・コメント・評価を入力）」と「行ったのみ記録（詳細入力不要で即座にAPI登録）」の2つの選択肢を提供。
   - これにより、手軽にチェックだけ付けたいユーザーと、じっくり詳細を記録したいユーザーの双方に対応。
3. **既存「行った」データの編集・追記導線の整備**
   - すでに「行った」に登録済みの投稿でボタンを押下した場合は、選択ステップをスキップして直接 `VisitedModal` を開き、保存済みの写真・評価・コメント・日付をフォーム初期値として自動展開。
   - 既存データの修正・写真の追加・再評価・記録の解除（削除）をスムーズに行える導線を確立。
4. **`google_place_id` 欠損データの救済・フォールバック共通ユーティリティ実装**
   - `src/lib/utils.ts` に `getGoogleMapsUrl` を新設し、タイムラインカード (`PostCard`)、投稿詳細 (`/posts/[id]`)、マイページ (`/mypage`) で共通化。
   - `google_place_id` が存在する場合は `&query_place_id` を最優先で付与。
   - `google_place_id` が欠損している場合でも、店名単体の一致による別店舗誤認を防ぐため、`store_name + address` を重視した検索クエリを生成。
   - DBへ勝手に `google_place_id` を上書き書き込みしない安全な仕様を担保。
5. **`VisitedModal` / `VisitChoiceModal` の z-index 引き上げ（下部メニュー被り解消）**
   - 下部固定ナビゲーションバー（`BottomNav`: `z-50`）がモーダル前面に重なって表示され、モーダル下部のアクションボタン（「記録を保存」「あとで入力」「削除」）が隠れて押せなくなる問題を修正。
   - `VisitedModal` および `VisitChoiceModal` の z-index を `z-50` から `z-[110]` に引き上げ、暗幕（backdrop）ごと画面最前面に展開されるように修正。
   - フッター下部のパディングを `pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))]` に最適化し、iOSホームバーとのタップ干渉を解消。
### 影響範囲
- `src/components/VisitedModal.tsx`
- `src/components/VisitChoiceModal.tsx`
- `src/components/PostCard.tsx`
- `src/components/PostSocial.tsx`
- `src/lib/utils.ts`
- `src/app/posts/[id]/page.tsx`
- `src/app/mypage/page.tsx`
- `APP_SPECIFICATION.md`
- `IMPLEMENTATION_STATUS.md`

---

## 2026-10-27
### 変更内容
1. **`post_visiteds`（行った記録）のスキーマ拡張とAPI対応**
   - 他人の投稿に対する「行った」記録に、ユーザー自身の写真 (`image_url`, `image_urls`)、コメント (`comment`)、訪問日 (`visited_at`) を保存できるよう Prisma スキーマ (`PostVisited` モデル) を拡張。
   - `/api/posts/[id]/visited` (POST / PUT) にて、コメント、画像URL、訪問日、星評価を保存・更新できるようエンドポイントを改修。
   - `/api/posts?marked_visited=true` において、ユーザーが登録した写真やコメントを元投稿のデータよりも優先してマージするよう改善。
2. **閲覧者の関係性に基づくプロフィール・マイページ表示制御（権限管理）のAPI実装**
   - `/api/profiles/[id]` (GET) において、赤の他人（本人・フレンド・共有グループ外）のアクセス時に一律 `403` を返していた仕様を改め、基本プロフィールの閲覧を許可。
   - 赤の他人が閲覧した際、「行きたい」投稿の画像URL・プライベートメモを非表示（`null`）にし、`is_restricted: true` フラグを付与。
   - 身内（本人・フレンド・共有グループ）の場合は通常通り画像や詳細を返却。
   - 対象ユーザーが他人の投稿に付けた「行った」一覧 (`markedVisitedPosts`) を、本人の写真・コメントで優先マージした状態でレスポンスに含めるよう拡張。
### 影響範囲
- `prisma/schema.prisma`
- `src/app/api/posts/[id]/visited/route.ts`
- `src/app/api/profiles/[id]/route.ts`
- `src/app/api/posts/route.ts`
- `DATABASE_SPECIFICATION.md`

---

## 2026-10-27 (追記)
### 変更内容
3. **マイページ (`/mypage`) の `is_restricted` 表示制御（フロントエンド実装）**
   - 赤の他人のプロフィールを閲覧した際、APIから `is_restricted: true` で返ってくる投稿カードに対して、専用の「知り合い限定」プレースホルダーを表示するよう実装。
   - 制限付きカードには画像を表示せず、店名のみ表示。「知り合い限定」バッジと「Maps」バッジを表示。
   - タップ時はアプリ内詳細ページではなく、Google マップ検索 (`https://www.google.com/maps/search/`) へ直接遷移するよう変更。
   - 他人投稿への「行った」タブ (`filteredMarkedVisited`) にも `is_restricted` の判定処理を追加。
   - `Post` 型 (`src/lib/types.ts`) に `is_restricted?: boolean` フィールドを追加。
4. **「行った」詳細記録モーダル (`VisitedModal`) のコンポーネント統合・バグ修正**
   - `VisitedModal.tsx` の `isOpen` プロパティをオプショナル（デフォルト `true`）に変更。
   - `src/components/PostSocial.tsx`: 未定義関数 `toggleVis` の参照エラーを解消し、`openVisitedModal` ハンドラーに修正。モーダル本体の JSX 配置を追加。
   - `src/components/PostCard.tsx`: タイムラインカードの「行った」ボタン押下時に即時APIトグルするのではなく `VisitedModal` を起動するように改修。モーダル内の写真・コメント・訪問日・★評価の登録および解除コールバック（`onSuccess`, `onDeleted`）を配備。
   - 全体 TypeScript 型チェック (`npx tsc --noEmit`) を実行しエラー0件を確認。
5. **各種仕様書・ドキュメントの同期更新**
   - `APP_SPECIFICATION.md`: セクション 2.4、2.11、3 に VisitedModal と is_restricted 表示制御を反映。
   - `API_SPECIFICATION.md`: セクション 4.10 (`/api/posts/[id]/visited`) を詳細化し、セクション 8.7 (`/api/profiles/[id]`) を新規追加。
   - `IMPLEMENTATION_STATUS.md`: セクション 2.4 および 2.8 の実装ステータスを更新。
   - `PROJECT_HANDOVER.md`: セクション 5 に ADR 5.6 (`PostVisited` 個人保存) および ADR 5.7 (`is_restricted` プライバシー保護) を追記。
### 影響範囲
- `src/lib/types.ts`
- `src/app/mypage/page.tsx`
- `src/components/VisitedModal.tsx`
- `src/components/PostSocial.tsx`
- `src/components/PostCard.tsx`
- `APP_SPECIFICATION.md`
- `API_SPECIFICATION.md`
- `IMPLEMENTATION_STATUS.md`
- `PROJECT_HANDOVER.md`

---

## 2026-10-26
### 変更内容
1. **マップ画面（`/map`）の検索バー整理（重複解消）**
   - マップ画面上部に2重で表示されていた検索バーのうち、不要となった上部の Google Places 検索欄（`PlaceAutocomplete`）を削除。
   - タイムライン画面と同期する「🏪 店名で絞り込み / 📍 住所で絞り込み」検索バーに一本化し、すっきりとしたUIへ整理。
### 影響範囲
- `src/app/map/page.tsx`

---

## 2026-10-21
### 変更内容
1. **マップ画面への投稿絞り込み検索の追加（タイムラインとフィルター同期）**
   - マップ画面のフローティング検索エリアに「🏪 店名で絞り込み / 📍 住所で絞り込み」トグルボタンとキーワード入力フィールドを追加。
   - `useSharedFilter` 経由でタイムライン画面とフィルター状態（keyword・searchMode）を完全同期。タイムラインで設定した絞り込みワードがそのままマップに引き継がれ、逆も同様。
   - キーワード入力は300msデバウンスで共有フィルターへ反映。Xボタンでクリアするとタイムラインにもリセットが伝わる。
   - 現在表示中のピン数バッジ（「📍 X 件表示中」）を追加し、絞り込みワードがある場合はラベルにも表示。
   - 既存の `PlaceAutocomplete`（Google Places 検索・地図移動）はそのまま維持し、役割を分離（地図移動用 vs 投稿絞り込み用）。
### 影響範囲
- `src/app/map/page.tsx`

---

## 2026-10-19
### 変更内容
1. **ボトムナビゲーションのスライドピル背景アニメーションの改善（Instagramスタイル）**
   - ピルの位置計算を `offsetLeft` 基準に刷新し、中央のマイページだけでなく全5つのアイコンにおいてズレなく100%正確に中央配置されるよう修正。
   - タップ時に即座にアクティブ状態とピル移動を開始する楽観的更新を導入し、タップからアニメーション開始までの体感遅延をゼロ化。
   - 2つ以上離れたアイコンへの移動時（左端から右端など）も移動中のスライドがはっきりと視認できるよう、移動距離に応じた動的な遷移時間（340ms〜540ms）およびスプリングカーブの調整を実施。
### 影響範囲
- `src/components/BottomNav.tsx`

---

## 2026-10-15
### 変更内容
1. **都道府県マップからのタイムライン住所絞り込み連動の実装**
   - ホーム画面の都道府県マップで各都道府県をクリックした際、タイムライン（`/posts`）へ遷移し、該当都道府県の住所フィルターが自動適用されるよう連動。
   - 住所検索・一致判定ロジックを最適化し、クリックした都道府県に合致する投稿のみがスムーズに絞り込まれるよう改修。
2. **ホーム画面「みんなのピックアップ」コンポーネントの削除**
   - ホーム画面のレイアウト整理の一環として、不要となった「みんなのピックアップ」セクションおよび関連ロジックを完全撤去。
3. **Google Places 住所検索・候補選択UIの刷新（futariba 同等挙動）**
   - 姉妹アプリ `futariba` の住所検索・オートコンプリートUIに合わせ、検索入力時の候補選択とスクロール処理をリファクタリング。
   - モバイル端末における上下スクロール時の誤タップ・意図しない候補決定を防止するタッチ判定処理を導入。
### 影響範囲
- `src/app/page.tsx` (ホーム画面)
- `src/components/PrefectureMapModal.tsx`
- `src/components/PlaceAutocomplete.tsx` / `src/app/posts/new/page.tsx`
- `src/hooks/useSharedFilter.ts`

---

## 2026-10-14
### 変更内容
1. **モバイル端末における住所候補スクロール時のタップ誤動作防止**
   - スマートフォン操作時、住所候補リストをスワイプスクロールしようとするとタップイベントが発火して候補が勝手に確定してしまう問題を修正。
   - `touchmove` イベント検知フラグおよびタッチ開始時間・移動距離判定によるスクロールとタップの厳密な分離。
   - 候補アイテムに対するテキスト選択の禁止（`user-select: none`）を適用。
### 影響範囲
- `src/components/PlaceAutocomplete.tsx`
- 投稿新規作成・編集フォーム

---

## 2026-10-13
### 変更内容
1. **Googleマップ写真取得トグル機能の追加（デフォルトOFF）**
   - 店舗名入力時に Google Places API から店舗写真を取得する機能を、ユーザーが任意で有効化できるトグルスイッチに変更（API呼び出しコストと通信量抑制のため、デフォルトはOFF）。
   - トグル行全体をタップしても状態が切り替わるようアクセシビリティ・クリック領域を改善。
2. **投稿フォーム画面の横幅崩れ修正**
   - モバイル表示時に一部要素が画面幅を超過して横スクロールが発生していた CSS レイアウトを修正。
### 影響範囲
- `src/app/posts/new/page.tsx`
- `src/app/posts/[id]/edit/page.tsx`
- `src/components/Toggle.tsx`

---

## 2026-10-06
### 変更内容
1. **Google Maps の店舗写真選択機能の追加**
   - Places API の `photos` 属性から店舗の写真を取得し、ユーザー自身の写真に加えて店舗写真を選択・投稿画像に含められる機能を追加。
2. **マップ画面（`/map`）の初期表示最適化**
   - 初回ロード時に日本全体を見渡せるズームレベル（Zoom: 5）および日本中央座標への自動センタリングを設定。
   - ピンサイズの視認性向上、ズームコントローラーボタンの配置調整など、Google Maps 公式アプリに近い操作感へ改善。
### 影響範囲
- `src/app/map/page.tsx`
- `src/components/GoogleMapView.tsx`

---

## 2026-10-05
### 変更内容
1. **投稿作成・更新・削除時のタイムライン即時更新（SWR Cache Invalidation）**
   - 投稿を新規作成、編集、または削除した直後にタイムライン（`/posts`）へ戻った際、古いキャッシュが表示される問題を解消。
   - SWR の `mutate` を適切なキーで明示的にトリガーし、画面遷移と同時に最新一覧が即座に再描画されるよう修正。
### 影響範囲
- `src/app/posts/page.tsx`
- `src/app/posts/new/page.tsx`
- `src/app/posts/[id]/page.tsx`
- `src/hooks/usePosts.ts`

---

## 2026-09-15
### 変更内容
1. **アプリ内「戻る」ナビゲーションの追跡スタック改善**
   - 複雑な画面遷移（ホーム → フィルター → マップ → 投稿詳細等）において、ブラウザバックや左上「戻る」ボタンを押した際に意図しないページへ戻る事象を解消するため、セッションストレージを用いた画面スタック管理を導入。
2. **バックグラウンド画像アップロードとプログレスバナー**
   - 投稿ボタン押下後、画像アップロードが完了するのを待たずに即座にタイムラインへ遷移可能とし、ヘッダー直下のプログレスバーでアップロード進行状況を表示する非同期UXを実装。
### 影響範囲
- `src/components/Header.tsx`
- `src/components/UploadProgressBanner.tsx`
- `src/contexts/UploadContext.tsx`
- `src/lib/navigationHistory.ts`

---

## 2026-09-09
### 変更内容
1. **ホーム画面の機能拡充（4大新機能）**
   - ルーレット（今日のごはん決め機能）
   - 思い出振り返り（過去の同日に訪れた店舗の表示）
   - 現在地周辺のおすすめ・訪問済みスポット
   - 日本地図（都道府県別制覇マップ）
2. **画像URLのS3キー化（CloudFrontドメイン直書きの廃止）**
   - DB に保存する画像パスを `https://xxxx.cloudfront.net/posts/xxx.webp` から `posts/xxx.webp`（相対S3キー）に変更。
   - 既存データベースの全画像レコードを一括変換するマイグレーションスクリプト（`scripts/migrate-image-urls-to-keys.mjs`）を実行。
3. **PWA マニフェスト認証除外 & ハイドレーション警告修正**
   - `/manifest.webmanifest` へのアクセスが認証ミドルウェアでブロックされる問題を修正。
   - 日付表示のクライアント・サーバー不一致による React ハイドレーション警告を解消。
### 影響範囲
- `src/app/page.tsx`
- `src/middleware.ts`
- `prisma/schema.prisma`
- `scripts/migrate-image-urls-to-keys.mjs`

---

## 2026-09-08
### 変更内容
1. **S3 画像削除の漏れ防止 & 孤立オブジェクトクリーンアップスクリプト**
   - 投稿削除時・画像差し替え時に古い S3 オブジェクトが確実に削除されるようトランザクション処理を強化。
   - DB から参照されていない孤立 S3 オブジェクトを定期検出・削除するスクリプト（`scripts/cleanup-orphaned-s3.mjs`）を配備。
2. **マイランキング画面における友だち／自分のみトグル追加**
   - グループ全体の人気店舗ランキングと自分自身のマイベストランキングを切り替えて閲覧できる機能を追加。
3. **統計画面（マイページ）のフィルター統一**
   - ホーム画面と統一された投稿者・グループフィルターを追加し、マイページ遷移時に自動的に「自分のみ」フィルターを適用する連動を実装。
### 影響範囲
- `src/app/rankings/page.tsx`
- `src/app/mypage/page.tsx`
- `src/app/api/posts/[id]/route.ts`
- `scripts/cleanup-orphaned-s3.mjs`

---

## 2026-09-01
### 変更内容
1. **食べレコ／旅レコごとのフィルター設定の完全分離**
   - `useSharedFilter` を改修し、LocalStorage のキーを `filter_tabereco` と `filter_tabireco` に分離。
   - モードを切り替えても前回のグルメ用フィルター条件／温泉用フィルター条件がそれぞれ独立して保持されるよう改善。
2. **フィルターモーダルの機能拡張**
   - 数値評価範囲（星3.5〜5.0等）、価格帯スライダー、温泉施設タイプ（日帰り、旅館、共同浴場等）の複数選択に対応。
### 影響範囲
- `src/hooks/useSharedFilter.ts`
- `src/components/FilterModal.tsx`
- `src/app/api/posts/route.ts`

---

## 2026-08-25
### 変更内容
1. **旅レコ（温泉・宿）詳細項目（HotSpringInfo v2）の表示と入力対応**
   - 投稿詳細画面およびフォームにおいて、泉質、サウナ温度、水風呂温度、源泉掛け流し有無、客室風呂有無の表示・入力をサポート。
   - 任意項目の折りたたみUI（詳細設定トグル）を導入。
### 影響範囲
- `src/app/posts/[id]/page.tsx`
- `src/components/HotSpringFields.tsx`
- `prisma/schema.prisma`
