// 전시 시연판(인터넷 없이 zip 으로 실행) 만들기.
//   cd frontend && node scripts/build-offline.js
// 결과: dist-offline/jipgepyo-offline/ 폴더와 dist-offline/jipgepyo-offline.zip
//   START.bat            더블클릭하면 로컬 서버를 켜고 브라우저로 앱을 엽니다
//   README.txt           실행·초기화 안내
//   server/              jipgepyo-server.exe(Go 가 있을 때만 만듦), server.ps1(PowerShell 판, 항상 들어감)
//   site/IN-VIBE-camp/   웹 빌드(EXPO_PUBLIC_DEMO=1) + 폰트·Leaflet 파일(offline/)
// 앱 쪽 시연판 동작은 src/lib/demo.js 에 있습니다. 서버(Supabase) 값은 넣지 않습니다.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const FRONT = path.resolve(__dirname, '..')
const OUT = path.join(FRONT, 'dist-offline')
const PKG = path.join(OUT, 'jipgepyo-offline')
const SITE = path.join(PKG, 'site', 'IN-VIBE-camp')
const BUILD = path.join(OUT, 'web')
const has = (cmd) => {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: FRONT, ...opts })

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// 1) 웹 빌드: 시연판 켜고, 서버 주소·APK 주소는 비웁니다.
console.log('▶ 웹 빌드 (EXPO_PUBLIC_DEMO=1)')
run(`npx expo export --platform web --output-dir "${BUILD}" --clear`, {
  env: { ...process.env, EXPO_PUBLIC_DEMO: '1', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '', EXPO_PUBLIC_APK_URL: '' },
})

// 2) 폴더 구성
fs.mkdirSync(path.dirname(SITE), { recursive: true })
fs.cpSync(BUILD, SITE, { recursive: true })
fs.cpSync(path.join(FRONT, 'offline', 'START.bat'), path.join(PKG, 'START.bat'))
fs.cpSync(path.join(FRONT, 'offline', 'README.txt'), path.join(PKG, 'README.txt'))
fs.mkdirSync(path.join(PKG, 'server'), { recursive: true })
fs.cpSync(path.join(FRONT, 'offline', 'server', 'server.ps1'), path.join(PKG, 'server', 'server.ps1'))

// 서비스 워커 캐시 이름에 빌드 시각을 넣어, 새 zip 으로 바꾸면 옛 캐시가 지워지게 합니다.
const sw = path.join(SITE, 'sw.js')
if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD_ID__', 'offline-' + Date.now().toString(36)))

// 3) 폰트(구글 폰트 대신 같은 글꼴 파일) — src/theme/loadFonts.web.js 가 offline/fonts/fonts.css 를 읽습니다.
const FONT_DIR = path.join(SITE, 'offline', 'fonts')
fs.mkdirSync(FONT_DIR, { recursive: true })
const FONTS = [
  ['Black Han Sans', 400, 'black-han-sans', '400Regular/BlackHanSans_400Regular.ttf'],
  ['Noto Sans KR', 400, 'noto-sans-kr', '400Regular/NotoSansKR_400Regular.ttf'],
  ['Noto Sans KR', 500, 'noto-sans-kr', '500Medium/NotoSansKR_500Medium.ttf'],
  ['Noto Sans KR', 700, 'noto-sans-kr', '700Bold/NotoSansKR_700Bold.ttf'],
  ['Noto Sans KR', 800, 'noto-sans-kr', '800ExtraBold/NotoSansKR_800ExtraBold.ttf'],
  ['JetBrains Mono', 500, 'jetbrains-mono', '500Medium/JetBrainsMono_500Medium.ttf'],
  ['JetBrains Mono', 700, 'jetbrains-mono', '700Bold/JetBrainsMono_700Bold.ttf'],
]
const css = FONTS.map(([family, weight, pkg, file]) => {
  const name = path.basename(file)
  fs.cpSync(path.join(FRONT, 'node_modules', '@expo-google-fonts', pkg, file), path.join(FONT_DIR, name))
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(${name}) format('truetype')}`
})
fs.writeFileSync(path.join(FONT_DIR, 'fonts.css'), css.join('\n') + '\n')
fs.cpSync(path.join(FRONT, 'node_modules', '@expo-google-fonts', 'noto-sans-kr', 'LICENSE_FONT'), path.join(FONT_DIR, 'OFL.txt'))

// 4) 지도 라이브러리(Leaflet) — src/components/mapHtml.js 가 offline/leaflet/ 을 읽습니다.
const LEAFLET = path.join(SITE, 'offline', 'leaflet')
fs.mkdirSync(LEAFLET, { recursive: true })
for (const f of ['leaflet.js', 'leaflet.css', 'images']) fs.cpSync(path.join(FRONT, 'node_modules', 'leaflet', 'dist', f), path.join(LEAFLET, f), { recursive: true })
fs.cpSync(path.join(FRONT, 'node_modules', 'leaflet', 'LICENSE'), path.join(LEAFLET, 'LICENSE.txt'))

// 5) 로컬 서버 exe (Go 가 있을 때만). 없으면 START.bat 이 server.ps1 을 씁니다.
if (has('go')) {
  console.log('▶ 로컬 서버 exe 빌드 (windows/amd64)')
  run(`go build -trimpath -o "${path.join(PKG, 'server', 'jipgepyo-server.exe')}" main.go`, {
    cwd: path.join(FRONT, 'offline', 'server'),
    env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0', GO111MODULE: 'off' },
  })
} else {
  console.log('… Go 가 없어 exe 는 건너뜁니다(PowerShell 서버만 들어감)')
}

// 6) zip
const zip = path.join(OUT, 'jipgepyo-offline.zip')
if (has('zip')) run(`zip -qr -X "${zip}" jipgepyo-offline`, { cwd: OUT })
else if (process.platform === 'win32') run(`powershell -NoProfile -Command "Compress-Archive -Path '${PKG}' -DestinationPath '${zip}' -Force"`)
else console.log('… zip 명령이 없어 폴더만 만들었습니다')
console.log('✔ 완료:', fs.existsSync(zip) ? zip : PKG)
