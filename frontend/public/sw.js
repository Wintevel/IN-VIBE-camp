// 집게표 서비스 워커(앱 셸 캐시). 배포 때 워크플로가 __BUILD_ID__ 를 커밋 해시로 바꿔서, 새 배포마다 이 파일이 달라지고 옛 캐시가 지워집니다.
// 캐시하는 것: 같은 출처의 GET 중 앱 셸(index.html)과 해시 이름이 붙은 번들·폰트·이미지.
// 캐시하지 않는 것: Supabase 등 다른 출처 요청 전부, 업체 웹(/partner/), 그 밖의 비 GET 요청.
const BUILD = '__BUILD_ID__'
const CACHE = 'jipgepyo-' + BUILD
const BASE = '/IN-VIBE-camp/'
const SHELL = [BASE, BASE + 'manifest.webmanifest', BASE + 'icons/icon-192.png', BASE + 'icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('jipgepyo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase·지도 SDK 등은 건드리지 않음
  if (!url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + 'partner/')) return // 업체 웹은 제외

  // 화면 이동(주소 진입·새로고침): 항상 서버 먼저, 오프라인이면 저장해 둔 앱 셸
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(BASE, copy))
          }
          return res
        })
        .catch(() => caches.match(BASE).then((r) => r || Response.error()))
    )
    return
  }

  // 번들·폰트·이미지: 파일 이름에 해시가 있어 내용이 안 바뀌므로 캐시 먼저
  if (url.pathname.startsWith(BASE + '_expo/') || url.pathname.startsWith(BASE + 'assets/') || url.pathname.startsWith(BASE + 'icons/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
      )
    )
  }
})
