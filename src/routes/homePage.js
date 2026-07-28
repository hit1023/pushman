import { renderNav, renderBrand } from '../lib/nav.js'
import { PAGE_STYLE } from '../lib/theme.js'
import { FAVICON_LINK } from '../lib/favicon.js'

export function renderHomePage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Pushman</title>
${FAVICON_LINK}
<style>${PAGE_STYLE}</style>
</head>
<body>
  ${renderBrand()}
  ${renderNav('/')}

  <div class="hero">
    <img src="/favicon.svg" alt="Pushman">
    <h1>Pushman</h1>
    <p class="desc">VAPIDを使ったWeb Push通知送信API。ブラウザとLINE、2つのチャネルに対応。</p>
    <span class="badge" id="statusBadge"><span class="dot"></span><span id="statusText">確認中...</span></span>
  </div>

  <div class="cards">
    <div class="card">
      <h3>ブラウザ Web Push</h3>
      <p>VAPID鍵で署名し、Chrome/Firefox/Safariの標準Push APIへ直接配信。外部サービスへの登録は不要。</p>
    </div>
    <div class="card">
      <h3>LINE連携</h3>
      <p>LINE公式アカウント経由でメッセージを送信。OSの通知設定に左右されず、トーク画面に残る。</p>
    </div>
  </div>

  <h2 class="section">はじめに</h2>
  <ul class="linklist">
    <li><a href="/docs">APIドキュメント<span>エンドポイント仕様・リクエスト例を見る</span></a></li>
    <li><a href="/test">テスト送信<span>ブラウザ購読とLINE送信を試す</span></a></li>
    <li><a href="/settings">環境設定<span>VAPID鍵・LINEトークン等を設定する</span></a></li>
  </ul>

<script>
  fetch('/health').then((r) => r.ok ? r.json() : Promise.reject())
    .then(() => {
      const badge = document.getElementById('statusBadge')
      badge.classList.add('up')
      document.getElementById('statusText').textContent = '稼働中'
    })
    .catch(() => {
      const badge = document.getElementById('statusBadge')
      badge.classList.add('down')
      document.getElementById('statusText').textContent = '応答なし'
    })
</script>
</body>
</html>`
}
