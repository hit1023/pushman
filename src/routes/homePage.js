import { renderNav } from '../lib/nav.js'
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
  ${renderNav('/')}
  <h1>Pushman</h1>
  <p class="desc">VAPIDを使ったWeb Push通知送信API。上のタブから各ページに移動できます。</p>
</body>
</html>`
}
