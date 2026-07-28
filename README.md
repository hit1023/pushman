# pushman

VAPID (`web-push`) を使ったシンプルなWeb Push通知送信 REST API。
Hono + OpenAPI で構築され、Docker で動作する。mailman のPush版。

## 設計方針

このAPIは購読情報（PushSubscription）を保存しない。呼び出し元アプリがブラウザから取得した
subscriptionを自分のDB等で保持し、送信のたびにこのAPIへ渡す（mailmanが宛先メールアドレスの
一覧を持たないのと同じ考え方）。

## 機能

- `GET /` — ホーム（タブナビゲーション）
- `GET /vapid-public-key` — VAPID公開鍵取得（クライアント側の`pushManager.subscribe()`に使用）
- `POST /send` — Push通知送信
- `GET /test` — ブラウザからテスト送信できるページ（HTTPS必須）
- `GET /sw.js` — テストページ用のService Worker
- `GET /settings` — 環境設定WebUI（Basic認証必須）
- `GET /health` — ヘルスチェック
- `GET /docs` — API ドキュメント（タブ内にScalar UIをiframe埋め込み）
- `GET /api-docs` — Scalar による API ドキュメント UI 本体
- `GET /openapi.json` — OpenAPI 3.0 スペック

`/`, `/docs`, `/test`, `/settings` は上部にタブナビゲーションがあり、直接URLを打たずに行き来できる。

## 構成

```
src/
├── index.js               # エントリーポイント・ルート登録
├── lib/
│   └── envFile.js          # .env の読み書き
└── routes/
    ├── send.js             # POST /send
    ├── vapidPublicKey.js   # GET /vapid-public-key
    ├── settingsPage.js     # GET/POST /settings のHTML
    └── health.js           # GET /health
```

## 環境変数

`.env.example` をコピーして `.env` を作成する。VAPID鍵は以下で生成できる。

```bash
npx web-push generate-vapid-keys
```

| 変数名 | 必須 | 説明 |
|---|---|---|
| `VAPID_PUBLIC_KEY` | ✅ | VAPID公開鍵 |
| `VAPID_PRIVATE_KEY` | ✅ | VAPID秘密鍵 |
| `VAPID_SUBJECT` | — | `mailto:` または `https://` のURL（省略時: `mailto:noreply@yahoi.jp`）|
| `ADMIN_PASSWORD` | ✅ | `/settings` のBasic認証パスワード（ユーザー名は`admin`固定）|

## 起動

```bash
cp .env.example .env
# .env を編集してVAPID鍵を設定

docker compose up -d
```

ポート `8766` で起動する。

## API

### GET /vapid-public-key

クライアント側（ブラウザ）で購読登録する際に使う公開鍵を返す。

```json
{ "publicKey": "BN4G..." }
```

ブラウザ側の購読登録例:

```js
const { publicKey } = await fetch('https://pushman.example.com/vapid-public-key').then(r => r.json())
const registration = await navigator.serviceWorker.ready
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: publicKey,
})
// subscription.toJSON() を自分のアプリのサーバーに保存する
```

### POST /send

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/xxxxx",
    "keys": { "p256dh": "BN4G...", "auth": "k8Jt..." }
  },
  "title": "お知らせ",
  "body": "本文",
  "icon": "https://example.com/icon.png",
  "url": "https://example.com/page"
}
```

**レスポンス (200)**

```json
{ "success": true }
```

**レスポンス (410)** — 購読が無効（期限切れ・解除済み）。呼び出し元でsubscriptionを削除すること。

```json
{ "error": "...", "statusCode": 410 }
```

詳細は `http://localhost:8766/docs` を参照。

## テスト送信ページ (`/test`)

このページを開いたブラウザ自身に対して、テストのPush通知を送信できる。認証なし（`/send`自体が
認証なしのため）。

**HTTPS（または`localhost`）でのアクセスが必須。** ブラウザのPush購読APIはセキュアコンテキスト
以外では動作しない。`http://<LAN IP>:8766/test` のような平文HTTP経由ではブラウザにブロックされる。

## 環境設定WebUI (`/settings`)

`.env` の値をブラウザから閲覧・編集できる。`admin` / `ADMIN_PASSWORD` のBasic認証で保護されている。

保存すると `.env` ファイルが書き換わるだけで、コンテナは自動再起動しない。反映するには
`docker compose restart`（または `run.sh` の「更新 & 再起動」）を実行する。

## 開発

```bash
npm install
npm run dev   # --watch モードで起動
```
