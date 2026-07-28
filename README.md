# pushman

VAPID (`web-push`) を使ったシンプルなWeb Push通知送信 REST API。
Hono + OpenAPI で構築され、Docker で動作する。[mailman](https://github.com/hit1023/mailman)のPush版。

## 目次

- [概要](#概要)
- [設計方針](#設計方針)
- [VAPIDとは（Resendとの違い）](#vapidとはresendとの違い)
- [画面・エンドポイント一覧](#画面エンドポイント一覧)
- [ディレクトリ構成](#ディレクトリ構成)
- [環境変数](#環境変数)
- [ローカル開発](#ローカル開発)
- [Dockerでの起動](#dockerでの起動)
- [本番デプロイ (h-1)](#本番デプロイ-h-1)
- [API仕様](#api仕様)
- [LINE連携](#line連携)
- [ブラウザ側の購読方法](#ブラウザ側の購読方法)
- [テスト送信ページ (`/test`)](#テスト送信ページ-test)
- [環境設定WebUI (`/settings`)](#環境設定webui-settings)
- [スマートフォンでの利用について](#スマートフォンでの利用について)
- [トラブルシューティング](#トラブルシューティング)

## 概要

自作のWebアプリ・ツールに「ブラウザのプッシュ通知を送る」機能を足したいときに、毎回
VAPID鍵管理や`web-push`ライブラリの扱いを実装しなくて済むよう、共通のHTTP APIとして
切り出した小さなマイクロサービス。呼び出し側は購読情報(PushSubscription)とタイトル・本文を
JSONでPOSTするだけで、ブラウザに通知を送れる。

mailmanと構成・見た目（Hono + OpenAPI + Docker + `/settings` + `/test` + タブナビゲーション）を
意図的に揃えてある。

## 設計方針

このAPIは**購読情報（PushSubscription）を保存しない、ステートレスな設計**にしている。

- 呼び出し元アプリ（＝このAPIを使う側のWebアプリ）が、ブラウザから取得した`PushSubscription`
  オブジェクトを自分のDB等で保持する
- 通知を送りたいタイミングで、保持しているsubscriptionをそのままこのAPIの`POST /send`に渡す
- pushman自身はその場でVAPID署名して送るだけで、誰にどんな通知を送ったかの記録は残さない

これはmailmanが「宛先メールアドレスの一覧」を持たないのと同じ考え方で、
「配信先リストの管理」と「実際の配信処理」を分離している。用途ごとに配信先リストの持ち方
（DB、Redis、ファイル等）が変わっても、pushman自体は変更不要になる。

## VAPIDとは（Resendとの違い）

mailmanがResendという**第三者の送信代行サービス**（アカウント登録・APIキー取得が必要）を
使っているのに対し、pushmanのVAPIDは仕組みが根本的に異なる。

- VAPID鍵ペア（公開鍵・秘密鍵）は`web-push`ライブラリで**自前生成**したものであり、
  どこかのサービスに登録する必要はない
- ブラウザへの実際の配送は、各ブラウザベンダーが運用する配信網
  （Chrome/Edge → Google FCM、Firefox → Mozilla Autopush、Safari → Apple Push Notification
  service）を経由するが、これは**ブラウザが自動的にどこへ送るか決めている**だけで、
  pushman側やアプリ開発者がそれらのベンダーに個別登録する必要はない
- VAPID鍵は「このサーバーが正当な送信者である」ことをブラウザの配信網に対して自己証明する
  ためだけのもの。無料・完全に自己完結している

つまりpushmanの運用にサインアップが必要な外部サービスは存在しない。

## 画面・エンドポイント一覧

| パス | メソッド | 認証 | 内容 |
|---|---|---|---|
| `/` | GET | なし | ホーム。タブナビゲーションの起点 |
| `/vapid-public-key` | GET | なし | VAPID公開鍵を返す。クライアント側の`pushManager.subscribe()`で使用 |
| `/send` | POST | なし | Push通知送信API本体 |
| `/line/send` | POST | なし | LINEメッセージ送信API本体 |
| `/line/webhook` | POST | 署名検証 | LINEからのWebhookイベント受信。友だち追加・メッセージ受信時にuserIdを自動返信する |
| `/test` | GET | なし | このブラウザ自身を購読させてテスト送信できる画面（HTTPS必須）。LINEテスト送信フォームも同居 |
| `/sw.js` | GET | なし | `/test`が使うService Worker本体 |
| `/settings` | GET/POST | Basic認証 | `.env`の値を閲覧・編集する画面 |
| `/health` | GET | なし | ヘルスチェック（`{"status":"ok"}`を返すだけ） |
| `/docs` | GET | なし | APIドキュメント画面（下記`/api-docs`をタブ内にiframe表示） |
| `/api-docs` | GET | なし | [Scalar](https://scalar.com/)によるAPIドキュメントUI本体 |
| `/openapi.json` | GET | なし | OpenAPI 3.0 スペック（`/api-docs`が参照する） |

`/`, `/docs`, `/test`, `/settings` の4画面は上部に共通のタブバーがあり、直接URLを
打たずに行き来できる。

## ディレクトリ構成

```
pushman/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── run.sh                    # 対話的なデプロイ管理メニュー(update/restart/logs等)
├── package.json
└── src/
    ├── index.js               # エントリーポイント。全ルートをここに登録
    ├── lib/
    │   ├── envFile.js          # .env ファイルの読み書き（/settings用）
    │   ├── nav.js               # タブナビゲーションのHTML生成
    │   ├── theme.js             # 全画面共通のダークテーマCSS
    │   └── line.js               # LINE Messaging APIの呼び出し・Webhook署名検証
    └── routes/
        ├── send.js              # POST /send のZodスキーマ・OpenAPIルート定義
        ├── vapidPublicKey.js    # GET /vapid-public-key のルート定義
        ├── line.js              # POST /line/send のZodスキーマ・OpenAPIルート定義
        ├── health.js            # GET /health のルート定義
        ├── homePage.js          # GET / のHTML
        ├── docsPage.js          # GET /docs のHTML（iframeラッパー）
        ├── settingsPage.js      # GET/POST /settings のHTML・フィールド定義
        └── testPage.js          # GET /test のHTML・クライアント側JS・Service Worker本体
```

## 環境変数

`.env.example` をコピーして `.env` を作成する。

```bash
cp .env.example .env
npx web-push generate-vapid-keys   # VAPID鍵ペアを生成して.envに貼り付ける
```

| 変数名 | 必須 | 説明 |
|---|---|---|
| `VAPID_PUBLIC_KEY` | ✅ | VAPID公開鍵。クライアント側にも配布される（`/vapid-public-key`経由） |
| `VAPID_PRIVATE_KEY` | ✅ | VAPID秘密鍵。外部に漏らしてはいけない |
| `VAPID_SUBJECT` | — | `mailto:`または`https://`で始まる連絡先URL（省略時: `mailto:noreply@yahoi.jp`）。ブラウザベンダーが送信者に連絡する際に使う |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE連携を使うなら✅ | LINE Developers Consoleで発行するチャネルアクセストークン（長期） |
| `LINE_CHANNEL_SECRET` | LINE連携を使うなら✅ | 同コンソールの「チャネル基本設定」に記載のチャネルシークレット。Webhookの署名検証に使用 |
| `ADMIN_PASSWORD` | ✅ | `/settings`のBasic認証パスワード（ユーザー名は`admin`固定）。未設定だと`/settings`は500を返しアクセス不可になる |
| `PORT` | — | コンテナ内リッスンポート（docker-compose側で`3000`固定。通常変更不要） |

## ローカル開発

```bash
npm install
npm run dev   # --watch モードで起動（ファイル変更で自動再起動）
```

`http://localhost:3000` で起動する（`.env`の`PORT`未設定時）。ブラウザPush APIは
`localhost`もセキュアコンテキスト扱いなので、`/test`もローカルでそのまま動作確認できる。

## Dockerでの起動

```bash
cp .env.example .env
# .env を編集して VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / ADMIN_PASSWORD を設定

docker compose up -d
```

ホストの`8766`番ポートにマッピングされる（`docker-compose.yml`参照）。

`docker-compose.yml`は`.env`ファイル自体を`/app/.env`としてコンテナにバインドマウントしている。
これは`/settings`画面からの書き込みが、docker-compose自体の変数展開に使われるホスト側`.env`と
同一ファイルになるようにするため（詳細は[環境設定WebUI](#環境設定webui-settings)を参照）。

`run.sh`を使うと更新・再起動・ログ確認などを対話メニューから実行できる:

```bash
./run.sh
```

## 本番デプロイ (h-1)

現在の本番運用は h-1（192.168.0.20）上のDockerコンテナ。

- コンテナ直: `http://192.168.0.20:8766`
- 外部公開URL: `https://pushman.s-quad.com`（gate上のnginx-proxy-managerが`*.s-quad.com`
  ワイルドカード証明書でHTTPS終端し、`192.168.0.20:8766`へリバースプロキシしている）

**`/test`のPush購読はブラウザのセキュアコンテキスト制約により`https://`または`localhost`
経由でないと動作しない**ため、h-1への平文HTTP直アクセス（`http://192.168.0.20:8766/test`）では
購読ボタンを押しても失敗する。実機テストは必ず`https://pushman.s-quad.com/test`から行うこと。

デプロイ手順（h-1上）:

```bash
cd ~/docker/pushman
git pull
docker compose up -d --build
```

## API仕様

### GET /vapid-public-key

クライアント側（ブラウザ）で購読登録する際に使う公開鍵を返す。

```json
{ "publicKey": "BHmR0TWonHrk2S..." }
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
  "badge": "https://example.com/badge.png",
  "url": "https://example.com/page",
  "data": { "any": "追加情報" }
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `subscription` | `object` | ✅ | ブラウザの`pushManager.subscribe()`が返すPushSubscriptionオブジェクト |
| `title` | `string` | ✅ | 通知タイトル |
| `body` | `string` | — | 通知本文 |
| `icon` | `string(url)` | — | 通知アイコン画像URL |
| `badge` | `string(url)` | — | 通知バッジ画像URL（モノクロアイコン向け） |
| `url` | `string(url)` | — | 通知クリック時に開くURL |
| `data` | `any` | — | Service Worker側の`push`イベントに渡す任意データ |

**レスポンス (200 OK)**

```json
{ "success": true }
```

**レスポンス (400 Bad Request)** — subscriptionの形式不正など

```json
{ "error": "エラーメッセージ", "statusCode": 400 }
```

**レスポンス (410 Gone)** — 購読が期限切れ・ユーザーが通知を解除済み

```json
{ "error": "エラーメッセージ", "statusCode": 410 }
```

410が返ってきたら、呼び出し元は保持しているそのsubscriptionを削除するべきタイミング
（そのブラウザには二度と送れないため）。

curlでの実行例:

```bash
curl -X POST https://pushman.s-quad.com/send \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } },
    "title": "お知らせ",
    "body": "こんにちは"
  }'
```

### GET /health

```json
{ "status": "ok" }
```

## LINE連携

ブラウザ通知はOS/ブラウザ側の通知設定次第で表示が抑制されることがある（実際に本サービスの
運用中にmacOS Chromeで発生した）。LINEはメッセージがトーク画面に残るため、通知バナーが
出なくても後から気づける。そのための第2の配信チャネルとして実装している。

### 事前準備（LINE Developers Consoleでの手動セットアップ）

LINEアカウントでのログインが必要なため、以下は利用者本人が行う。

1. [LINE Developers Console](https://developers.line.biz/console/) にログインし、プロバイダーを作成
2. 「Messaging API」チャネルを新規作成（無料）
3. チャネル作成後の設定画面で以下を取得し、`/settings`（または`.env`）に設定する:
   - **チャネルアクセストークン**（長期）— 「Messaging API設定」タブ下部で発行
   - **チャネルシークレット** — 「チャネル基本設定」タブに記載
4. 「Messaging API設定」タブで:
   - 「応答メッセージ」をOFFにする（LINE公式の自動応答と競合させないため）
   - 「Webhookの利用」をONにする
   - Webhook URLに `https://pushman.s-quad.com/line/webhook` を設定し、検証（Verify）が
     成功することを確認する

### userIdの調べ方

LINEはメールアドレスや電話番号ではなく、内部的な`userId`（`U`で始まる文字列）宛にしか
送信できない。取得方法は、作成したLINE公式アカウントを自分のLINEアプリで友だち追加するか、
何かメッセージを送ること。`/line/webhook`がその友だち追加/メッセージイベントを受け取り、
本人にトーク上で`userId`を自動返信する（`src/index.js`の`/line/webhook`ハンドラ参照）。
返ってきた`userId`を`POST /line/send`の`to`に指定する。

### POST /line/send

```json
{
  "to": "U4af4980629...",
  "message": "お知らせ"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `to` | `string` | ✅ | 送信先のLINE userId |
| `message` | `string` | ✅ | 送信するテキストメッセージ |

**レスポンス (200 OK)**

```json
{ "success": true }
```

**レスポンス (400 Bad Request)**

```json
{ "error": "エラーメッセージ" }
```

チャネルアクセストークンが無効、`to`が存在しないuserId、月間無料メッセージ数（Free プラン:
月200通）を超過、などの理由で失敗する。

curlでの実行例:

```bash
curl -X POST https://pushman.s-quad.com/line/send \
  -H "Content-Type: application/json" \
  -d '{ "to": "U4af4980629...", "message": "こんにちは" }'
```

### POST /line/webhook

LINEプラットフォームから送られてくるイベント（友だち追加・メッセージ受信等）を受け取る
エンドポイント。`x-line-signature`ヘッダーを`LINE_CHANNEL_SECRET`によるHMAC-SHA256で検証し、
一致しない場合は401を返す（`src/lib/line.js`の`verifyLineSignature`）。LINE Developers
Console以外からの呼び出しは全て拒否される。

`follow`（友だち追加）または`message`イベントを受信すると、そのイベントの送信者に対して
`userId`を返信する。これは無料の「reply API」を使っており、`POST /line/send`の
月間送信数カウントには影響しない。

## ブラウザ側の購読方法

呼び出し元アプリ（pushmanを使う側のWebアプリ）は、以下の手順でユーザーのブラウザを
Push通知の購読者にする。

```js
// 1. pushmanからVAPID公開鍵を取得
const { publicKey } = await fetch('https://pushman.s-quad.com/vapid-public-key').then(r => r.json())

// 2. Service Workerを登録（'push'イベントをlistenする自前のsw.jsが必要）
const registration = await navigator.serviceWorker.register('/sw.js')
await navigator.serviceWorker.ready

// 3. ユーザーに通知許可を求めた上で購読
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: publicKey,  // base64url文字列をUint8Arrayに変換して渡す（下記参照）
})

// 4. subscription.toJSON() を自分のアプリのサーバー/DBに保存する
//    （pushmanは保存しないので、呼び出し側で保持する）
```

`applicationServerKey`にはUint8Arrayが必要なため、base64url文字列からの変換関数が必要
（`src/routes/testPage.js`内の`urlBase64ToUint8Array`が実装例）。

## テスト送信ページ (`/test`)

このページを開いたブラウザ自身を購読させ、そのままそのブラウザへテスト通知を送信できる
自己完結型の検証ツール。永続化は一切行わず、ページを開いている間だけメモリ上に
subscriptionを保持する。認証なし（`/send`自体が認証なしのため）。

**HTTPS（または`localhost`）でのアクセスが必須。** ブラウザのPush購読API
（`pushManager.subscribe()`）はセキュアコンテキスト以外では動作しない。
`http://<LAN IP>:8766/test`のような平文HTTP経由ではブラウザにブロックされる。

手順:

1. 「1. 通知を許可して購読」を押す → OSの通知許可ダイアログが出るので許可する
2. 許可されるとフォームが表示されるので、タイトル・本文を入力して「2. テスト送信」
3. 送信結果（成功/失敗）がその場に表示される

通知が届かない場合は、ブラウザ側の権限だけでなく**OS側の通知設定**（macOSなら
システム設定 > 通知 > 該当ブラウザアプリ）や、フォーカス/おやすみモードの状態も確認すること。
サイトの権限とOSの権限は別物であり、どちらもオンでないと通知は表示されない。

## 環境設定WebUI (`/settings`)

`.env`の値をブラウザから閲覧・編集できる管理画面。VAPID秘密鍵などの機微情報を扱うため、
`admin` / `ADMIN_PASSWORD`のBasic認証で保護されている（`ADMIN_PASSWORD`未設定時は
アクセス自体を500エラーでブロックする）。

**保存の仕組みと注意点**（mailmanと共通の設計）:

1. フォーム送信すると、コンテナ内の`/app/.env`（＝ホストの`.env`とバインドマウントで同一ファイル）
   に新しい値が書き込まれる
2. Node.jsプロセスの`process.env`はプロセス起動時に一度読み込まれるだけなので、
   ファイルを書き換えても実行中のプロセスには反映されない
3. 反映するには明示的にコンテナを再作成する必要がある:

```bash
docker compose up -d
```

**`docker compose restart`ではダメ。** Composeの`environment:`にある`${LINE_CHANNEL_ACCESS_TOKEN}`等の
変数展開は`up`実行時にしか評価されないため、`restart`は起動済みコンテナに焼き込まれた古い環境変数の
ままプロセスを再起動するだけになる。実際にこの手順の誤りにより、LINE連携のトークンが最初
反映されずハマった（`.env`は正しいのにコンテナ内`process.env`が空、という状態になった）。
`.env`を変更したときは必ず`up -d`（`run.sh`なら「2. 起動」）を使うこと。

自動再起動を実装しない理由: コンテナ自身がdocker composeを操作できるようにするには
`docker.sock`をコンテナにマウントする必要があり、そのコンテナが侵害された場合ホスト全体の
Docker環境を操作されるリスクがある。個人運用のツールでそのリスクを取るより、
手動再起動というひと手間を許容する設計にしている。

## スマートフォンでの利用について

pushmanのWeb Pushは追加実装なしでスマートフォンにも届く。

- **Android Chrome**: アプリのインストールやPWA化は不要。上記の購読フローがそのまま動作し、
  ブラウザがバックグラウンドでも通知を受信できる
- **iOS Safari**: iOS 16.4以降が必要。加えて、対象サイトを事前に「ホーム画面に追加」して
  PWA化しておく必要がある（Apple独自の制約）。追加していない通常のSafariタブでは
  Web Pushの購読自体ができない

いずれの場合も、ネイティブアプリ向けのFCM/APNs個別実装は不要で、pushmanの
`POST /send`をそのまま使い回せる。

## トラブルシューティング

**`/test`で「HTTPS（またはlocalhost）でアクセスしてください」と表示される**
→ 平文HTTP（LAN IP直アクセス等）でアクセスしている。`https://pushman.s-quad.com/test`を使う。

**購読・送信APIは成功しているのに通知が表示されない**
→ ほぼ確実にOS側の通知設定が原因。macOSなら「システム設定 > 通知 > (ブラウザ名)」で
通知が許可されているか、通知スタイルが「なし」になっていないか確認する。フォーカス/
おやすみモードがオンだと画面に出ない（通知センターには記録される）。

**`/settings`で保存したのに反映されない**
→ 保存は`.env`ファイルへの書き込みのみ。`docker compose up -d`を実行したか確認する
（`docker compose restart`では反映されない。[環境設定WebUI](#環境設定webui-settings)参照）。

**`/settings`にアクセスすると500が返る**
→ `ADMIN_PASSWORD`が`.env`に設定されていない。設定して再起動する。

**`POST /send`が410を返す**
→ そのsubscriptionは期限切れ・解除済み。呼び出し元は保持しているsubscriptionを削除し、
ユーザーに再購読してもらう必要がある。

**友だち追加してもLINEでuserIdが返信されない**
→ LINE Developers Consoleの「Messaging API設定」で「Webhookの利用」がONになっているか、
Webhook URLの検証（Verify）が成功しているか確認する。「応答メッセージ」がONのままだと
LINE公式の自動応答が優先されうるので、OFFにしておくこと。

**`POST /line/send`が400を返す**
→ `error`メッセージを確認する。よくある原因: `LINE_CHANNEL_ACCESS_TOKEN`が無効、
`to`のuserIdが不正、Freeプランの月間無料メッセージ数（200通）を超過。
