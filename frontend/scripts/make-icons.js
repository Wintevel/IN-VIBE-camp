// 앱 아이콘 PNG 만들기: node scripts/make-icons.js (Playwright 의 Chromium 으로 SVG 를 그려 assets/ 에 저장)
const path = require('path')
const { chromium } = require('playwright')
const { mark } = require('./icon-mark')
const dir = path.join(__dirname, '..', 'assets')
const svg = (bg, opt, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" width="100%" height="100%">${bg ? `<rect width="112" height="112" fill="${bg}"/>` : ''}<g transform="translate(56 56) scale(${scale}) translate(-56 -56)">${mark(opt)}</g></svg>`
const white = { main: '#FFFFFF', shade: '#FFFFFF', cut: 'transparent', hole: 'transparent' }
;(async () => {
  const b = await chromium.launch()
  const out = async (name, size, html, transparent) => {
    const p = await b.newPage({ viewport: { width: size, height: size } })
    await p.setContent(`<body style="margin:0;background:${transparent ? 'transparent' : '#3182F6'}">${html}</body>`)
    await p.screenshot({ path: path.join(dir, name), omitBackground: !!transparent })
    await p.close()
  }
  await out('icon.png', 1024, svg('#3182F6'))
  await out('android-icon-foreground.png', 1024, svg(null, {}, 0.6), true) // 적응형 아이콘 안전 영역
  await out('android-icon-background.png', 1024, '<div style="width:100vw;height:100vh;background:#3182F6"></div>')
  await out('android-icon-monochrome.png', 1024, svg(null, white, 0.6), true)
  await out('splash-icon.png', 1024, svg(null, {}, 0.8), true)
  await out('favicon.png', 48, svg('#3182F6'))
  await b.close()
})()
