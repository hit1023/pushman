import { renderNav, NAV_STYLE } from '../lib/nav.js'

export function renderTestPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Pushman テスト送信</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #1a1a1a; background: #fff; }
  h1 { font-size: 1.3rem; }
  p.desc { color: #555; font-size: 0.9rem; }
  label { display: block; margin-bottom: 16px; }
  label span { display: block; font-size: 0.85rem; color: #555; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; padding: 8px; font-size: 0.95rem; border: 1px solid #ccc; border-radius: 4px; background: #fff; color: #1a1a1a; }
  button { padding: 8px 20px; font-size: 0.95rem; border: none; border-radius: 4px; background: #2563eb; color: #fff; cursor: pointer; margin-bottom: 16px; }
  button:disabled { background: #9ca3af; cursor: not-allowed; }
  #subscribeStatus, #sendResult { font-size: 0.85rem; margin-bottom: 16px; white-space: pre-wrap; word-break: break-all; }
  .ok { color: #065f46; }
  .ng { color: #b91c1c; }
  ${NAV_STYLE}
</style>
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
