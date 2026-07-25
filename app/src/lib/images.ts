const placeholderSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">
    <rect width="1200" height="800" fill="#1b1b1b"/>
    <rect x="90" y="90" width="1020" height="620" rx="36" fill="#262626" stroke="#a38a61" stroke-opacity="0.25" stroke-width="4"/>
    <circle cx="600" cy="300" r="76" fill="#a38a61" fill-opacity="0.18"/>
    <path d="M530 470L600 400L670 470H530Z" fill="#a38a61" fill-opacity="0.35"/>
    <text x="600" y="560" text-anchor="middle" fill="#d6c7a8" font-family="Arial, sans-serif" font-size="38">ACOES</text>
    <text x="600" y="610" text-anchor="middle" fill="#9a9a9a" font-family="Arial, sans-serif" font-size="24">Imagen no disponible</text>
  </svg>
`)

export const FALLBACK_COURSE_IMAGE = `data:image/svg+xml;charset=UTF-8,${placeholderSvg}`
