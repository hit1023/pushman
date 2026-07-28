export const NAV_ITEMS = [
  { path: '/', label: 'ホーム' },
  { path: '/docs', label: 'APIドキュメント' },
  { path: '/test', label: 'テスト送信' },
  { path: '/settings', label: '設定' },
]

export function renderBrand() {
  return `<a class="brand" href="/"><img src="/favicon.svg" alt=""><span>Pushman</span></a>`
}

export function renderNav(activePath) {
  return `<nav class="tabs">
${NAV_ITEMS.map((i) => `  <a href="${i.path}"${i.path === activePath ? ' class="active"' : ''}>${i.label}</a>`).join('\n')}
</nav>`
}
