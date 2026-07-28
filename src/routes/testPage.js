import { renderNav } from '../lib/nav.js'
import { PAGE_STYLE } from '../lib/theme.js'

export function renderTestPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Pushman テスト送信</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  ${renderNav('/test')}
  <h1>Pushman テスト送信</h1>
  <p class="desc">このページを開いたブラウザ自身に、テストのPush通知を送ります。HTTPS（または localhost）でアクセスしている必要があります。</p>

  <button id="subscribeBtn">1. 通知を許可して購読</button>
  <div id="subscribeStatus"></div>

  <form id="sendForm" style="display:none">
    <label><span>タイトル</span><input name="title" value="テスト通知" required></label>
    <label><span>本文</span><input name="body" value="pushmanからのテスト送信です"></label>
    <label><span>クリック時に開くURL（任意）</span><input name="url" placeholder="https://example.com"></label>
    <button type="submit">2. テスト送信</button>
  </form>
  <div id="sendResult"></div>

  <hr>

  <h2>LINEテスト送信</h2>
  <p class="desc">LINE公式アカウントを友だち追加すると自動返信されるuserIdを使って送信します。</p>

  <form id="lineSendForm">
    <label><span>userId（Uで始まる文字列）</span><input name="to" placeholder="U4af4980629..." required></label>
    <label><span>メッセージ</span><input name="message" value="pushmanからのLINEテスト送信です" required></label>
    <button type="submit">LINEへ送信</button>
  </form>
  <div id="lineSendResult"></div>

<script>
  let subscription = null

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
  }

  document.getElementById('subscribeBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('subscribeStatus')
    statusEl.className = ''
    try {
      if (!window.isSecureContext) {
        statusEl.className = 'ng'
        statusEl.textContent = 'HTTPS（またはlocalhost）でアクセスしてください。現在は非セキュアコンテキストのためPush購読できません。'
        return
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        statusEl.className = 'ng'
        statusEl.textContent = 'このブラウザはWeb Pushに対応していません。'
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        statusEl.className = 'ng'
        statusEl.textContent = '通知が許可されませんでした。'
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { publicKey } = await fetch('/vapid-public-key').then((r) => r.json())
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      statusEl.className = 'ok'
      statusEl.textContent = '購読しました。下のフォームからテスト送信できます。'
      document.getElementById('sendForm').style.display = 'block'
    } catch (err) {
      statusEl.className = 'ng'
      statusEl.textContent = 'エラー: ' + err.message
    }
  })

  document.getElementById('sendForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const resultEl = document.getElementById('sendResult')
    const formData = new FormData(e.target)
    const payload = {
      subscription: subscription.toJSON(),
      title: formData.get('title'),
      body: formData.get('body') || undefined,
    }
    const url = formData.get('url')
    if (url) payload.url = url

    try {
      const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      resultEl.className = res.ok ? 'ok' : 'ng'
      resultEl.textContent = (res.ok ? '送信成功: ' : '送信失敗: ') + JSON.stringify(json)
    } catch (err) {
      resultEl.className = 'ng'
      resultEl.textContent = 'エラー: ' + err.message
    }
  })

  document.getElementById('lineSendForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const resultEl = document.getElementById('lineSendResult')
    const formData = new FormData(e.target)
    const payload = {
      to: formData.get('to'),
      message: formData.get('message'),
    }

    try {
      const res = await fetch('/line/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      resultEl.className = res.ok ? 'ok' : 'ng'
      resultEl.textContent = (res.ok ? '送信成功: ' : '送信失敗: ') + JSON.stringify(json)
    } catch (err) {
      resultEl.className = 'ng'
      resultEl.textContent = 'エラー: ' + err.message
    }
  })
</script>
</body>
</html>`
}

export const SERVICE_WORKER_JS = `
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '通知'
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url, ...(data.data || {}) },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  }
})
`
