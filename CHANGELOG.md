# 食べレコ 変更履歴 (CHANGELOG.md)

本ドキュメントは、「食べレコ（tabereco）」における機能追加、仕様変更、リファクタリング、バグ修正の履歴を記録するものです。

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
