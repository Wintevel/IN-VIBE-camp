// 앱 아이콘 PNG 만들기: node scripts/make-icons.js (Playwright 의 Chromium 으로 SVG 를 그려 assets/ 와 public/icons/ 에 저장)
const path = require('path')
const { chromium } = require('playwright')
const { mark } = require('./icon-mark')
const dir = path.join(__dirname, '..', 'assets')
const pwaDir = path.join(__dirname, '..', 'public', 'icons') // 웹(PWA) 설치용 아이콘
const svg = (bg, opt, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" width="100%" height="100%">${bg ? `<rect width="112" height="112" fill="${bg}"/>` : ''}<g transform="translate(56 56) scale(${scale}) translate(-56 -56)">${mark(opt)}</g></svg>`
const white = { main: '#FFFFFF', shade: '#FFFFFF', cut: 'transparent', hole: 'transparent' }
;(async () => {
  const b = await chromium.launch()
  const out = async (name, size, html, transparent, to = dir) => {
    const p = await b.newPage({ viewport: { width: size, height: size } })
    await p.setContent(`<body style="margin:0;background:${transparent ? 'transparent' : '#3182F6'}">${html}</body>`)
    await p.screenshot({ path: path.join(to, name), omitBackground: !!transparent })
    await p.close()
  }
  await out('icon.png', 1024, svg('#3182F6'))
  await out('android-icon-foreground.png', 1024, svg(null, {}, 0.6), true) // 적응형 아이콘 안전 영역
  await out('android-icon-background.png', 1024, '<div style="width:100vw;height:100vh;background:#3182F6"></div>')
  await out('android-icon-monochrome.png', 1024, svg(null, white, 0.6), true)
  await out('splash-icon.png', 1024, svg(null, {}, 0.8), true)
  await out('favicon.png', 48, svg('#3182F6'))
  // PWA: any(전체 면 파랑), maskable(안전 영역 안쪽으로 줄임), iOS 홈 화면(투명 없이 꽉 찬 면)
  require('fs').mkdirSync(pwaDir, { recursive: true })
  await out('icon-192.png', 192, svg('#3182F6'), false, pwaDir)
  await out('icon-512.png', 512, svg('#3182F6'), false, pwaDir)
  await out('maskable-512.png', 512, svg('#3182F6', {}, 0.72), false, pwaDir)
  await out('apple-touch-icon.png', 180, svg('#3182F6'), false, pwaDir)
  await b.close()
})()
