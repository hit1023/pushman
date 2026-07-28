import { renderNav, renderBrand } from '../lib/nav.js'
import { PAGE_STYLE } from '../lib/theme.js'
import { FAVICON_LINK } from '../lib/favicon.js'

export const SETTINGS_FIELDS = [
  { key: 'VAPID_PUBLIC_KEY', label: 'VAPID公開鍵', type: 'text' },
  { key: 'VAPID_PRIVATE_KEY', label: 'VAPID秘密鍵', type: 'password' },
  { key: 'VAPID_SUBJECT', label: 'VAPID Subject (mailto: または https://)', type: 'text' },
  { key: 'LINE_CHANNEL_ACCESS_TOKEN', label: 'LINEチャネルアクセストークン', type: 'password' },
  { key: 'LINE_CHANNEL_SECRET', label: 'LINEチャネルシークレット', type: 'password' },
  { key: 'ADMIN_PASSWORD', label: '管理画面パスワード', type: 'password' },
]

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

export function renderSettingsPage(values, saved) {
  const fields = SETTINGS_FIELDS.map(
    (f) => `
    <label>
      <span>${f.label}</span>
      <input type="${f.type}" name="${f.key}" value="${escapeHtml(values[f.key])}" autocomplete="off">
    </label>`
  ).join('\n')

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Pushman 設定</title>
${FAVICON_LINK}
<style>${PAGE_STYLE}</style>
</head>
<body>
  ${renderBrand()}
  ${renderNav('/settings')}
  <h1>Pushman 環境設定</h1>
  ${saved ? '<div class="notice">保存しました。反映するには docker compose up -d（またはrun.shの「起動」）が必要です。docker compose restartでは反映されません。</div>' : ''}
  <div class="warning">変更は .env に書き込まれるだけで、コンテナは自動再作成されません。</div>
  <form method="POST" action="/settings">
    ${fields}
    <button type="submit">保存</button>
  </form>
</body>
</html>`
}
