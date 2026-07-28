export function renderLogo(idSuffix) {
  const gradId = `logo-grad-${idSuffix}`
  return `<svg viewBox="0 0 264 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pushman">
<defs>
<linearGradient id="${gradId}-icon" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#6ea8fe"/>
<stop offset="1" stop-color="#8b7cf6"/>
</linearGradient>
<linearGradient id="${gradId}-text" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#e5e9f0"/>
<stop offset="0.55" stop-color="#6ea8fe"/>
<stop offset="1" stop-color="#8b7cf6"/>
</linearGradient>
</defs>
<path d="M24 15 A18 18 0 0 1 52 15" fill="none" stroke="#6ea8fe" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="38" cy="43" r="22" fill="url(#${gradId}-icon)"/>
<circle cx="30" cy="41" r="4.4" fill="#0a0e14"/>
<circle cx="46" cy="41" r="4.4" fill="#0a0e14"/>
<path d="M29 51 Q38 58 47 51" fill="none" stroke="#0a0e14" stroke-width="3.4" stroke-linecap="round"/>
<text x="76" y="56" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="40" font-weight="800" letter-spacing="-1.2" fill="url(#${gradId}-text)">Pushman</text>
</svg>`
}
