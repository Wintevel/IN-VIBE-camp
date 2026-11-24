// 전시 시연판(인터넷 없이 zip 으로 도는 빌드). `EXPO_PUBLIC_DEMO=1` 로 빌드할 때만 켜집니다(scripts/build-offline.js).
// 켜지면: 서버 없이 기기 저장소 모드로 돌고, 위치는 고정된 시연 장소를 쓰고, 이웃 제보·크루 예시가 미리 들어가고,
// 카메라가 없는 PC 에서도 "시연용 사진"으로 촬영 단계를 넘길 수 있습니다. 일반 빌드(웹 배포·폰 앱)에는 영향이 없습니다.
export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1'

// 시연 장소(인하대 근처). 위치 권한을 묻지 않고 항상 여기를 내 위치로 씁니다.
export const DEMO_SPOT = { lat: 37.452, lng: 126.656 }
export const DEMO_ADDRESS = { address: '인하대 근처', dong: '용현동' }

// 전·후 사진 최소 간격. 일반 빌드는 1분, 전시 시연판은 관람객이 기다리지 않게 10초입니다.
export const PROOF_GAP_MS = DEMO ? 10 * 1000 : 60 * 1000
export const PROOF_GAP_LABEL = DEMO ? '10초' : '1분'
export const PROOF_GAP_TOPIC = DEMO ? '10초는' : '1분은' // 문장 속 조사까지 붙인 형태

// 시연 장소에서 동서·남북으로 m 만큼 떨어진 좌표
export const offset = (base, eastM, northM) => ({
  lat: base.lat + northM / 111320,
  lng: base.lng + eastM / (111320 * Math.cos((base.lat * Math.PI) / 180)),
})

// ── 시연용 사진(그림) ──────────────────────────────────
// 실제 사진 대신 쓰는 간단한 그림입니다. 바닥 색과 쓰레기 모양을 장소마다 다르게 그립니다.
const GROUND = {
  street: ['#5B6270', '#454B57', '#8A919E'],
  park: ['#5E8C55', '#47713F', '#C9B98F'],
  bus_stop: ['#6B7280', '#4B5260', '#9AA3B2'],
  etc: ['#6A6470', '#514B57', '#9C95A3'],
}
const rnd = (seed) => {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
function trash(r, n, w, h) {
  const out = []
  for (let i = 0; i < n; i++) {
    const x = Math.round(w * 0.18 + r() * w * 0.64)
    const y = Math.round(h * 0.5 + r() * h * 0.38)
    const k = r()
    const g = (inner) => `<g transform="translate(${x} ${y}) rotate(${Math.round(r() * 180)}) scale(2.2)">${inner}</g>`
    if (k < 0.3) out.push(g('<rect x="-17" y="-8" width="34" height="16" rx="5" fill="#E8EDF2"/><rect x="7" y="-6" width="8" height="12" rx="2" fill="#3182F6"/>')) // 페트병
    else if (k < 0.55) out.push(g('<rect x="-8" y="-13" width="16" height="26" rx="3" fill="#F04452"/><rect x="-8" y="-4" width="16" height="6" fill="#fff" opacity=".8"/>')) // 캔
    else if (k < 0.75) out.push(g('<rect x="-7" y="-2" width="14" height="4" rx="2" fill="#F5E6C8"/><rect x="-7" y="-2" width="5" height="4" rx="1" fill="#E3A35B"/>')) // 꽁초
    else if (k < 0.9) out.push(g('<path d="M-18 -4 l26 -6 l10 16 l-24 10 z" fill="#FFFFFF" opacity=".85"/>')) // 종이
    else out.push(g('<ellipse cx="0" cy="0" rx="20" ry="15" fill="#2B2F36"/><path d="M-5 -15 q5 -9 10 0" stroke="#2B2F36" stroke-width="4" fill="none"/>')) // 봉투
  }
  return out.join('')
}

// 장면 하나를 SVG data: 주소로 만듭니다. clean 이면 쓰레기 없이 밝게 그리고 확인 표시를 넣습니다.
export function sceneUri({ place = 'street', seed = 1, count = 9, clean = false, w = 640, h = 480 }) {
  const [top, bottom, line] = GROUND[place] || GROUND.etc
  const r = rnd(seed * 7919 + count)
  const body = clean
    ? `<circle cx="${w / 2}" cy="${h * 0.62}" r="64" fill="#3DD68C" opacity=".95"/><path d="M${w / 2 - 30} ${h * 0.62} l20 22 l40 -44" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : trash(r, count, w, h)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clean ? '#9FB3C8' : '#7C8796'}"/><stop offset=".38" stop-color="${clean ? '#C7D3DF' : '#A3ADB9'}"/><stop offset=".4" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect x="0" y="${h * 0.4 - 6}" width="${w}" height="10" fill="${line}"/>
<rect x="${w * 0.08}" y="${h * 0.1}" width="${w * 0.16}" height="${h * 0.3}" fill="#00000022"/><rect x="${w * 0.7}" y="${h * 0.04}" width="${w * 0.22}" height="${h * 0.36}" fill="#00000022"/>
${clean ? `<rect width="${w}" height="${h}" fill="#ffffff" opacity=".12"/>` : `<rect width="${w}" height="${h}" fill="#000" opacity=".06"/>`}
${body}
<rect x="14" y="${h - 40}" width="120" height="26" rx="13" fill="#000" opacity=".45"/><text x="74" y="${h - 22}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#fff">시연용 사진</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

// 촬영 화면의 "시연용 사진" 버튼이 쓰는 사진. 치우기 전·제보는 쓰레기가 있는 장면, 치운 뒤는 깨끗한 장면입니다.
export function demoShotUri(slot) {
  const seed = Math.floor(Math.random() * 100000) + 1
  const after = slot === 'after'
  return sceneUri({ place: ['street', 'park', 'bus_stop'][seed % 3], seed, count: 7 + (seed % 5), clean: after })
}

// ── 시연용 이웃 데이터 ─────────────────────────────────
// 기기 저장소 모드는 처음에 의뢰판이 비어 있어서, 전시 시연판은 이웃 제보·크루 몇 개를 미리 넣습니다.
// 모두 지어낸 예시입니다(이름·장소·숫자). 설정 > "이 기기의 기록 모두 지우기"를 누르면 지워지고 다음 실행 때 다시 들어갑니다.
const NEIGHBORS = ['용현동고양이', '새벽산책러', '분리수거장인', '집게든토끼', '줍줍대장', '버스기다리는중', '퇴근길청소부', '인하냥이']
const REPORTS = [
  { title: '버스정류장 의자 밑 컵·빨대', description: '의자 밑에 일회용 컵이랑 빨대가 굴러다녀요.', place_type: 'bus_stop', issue_type: 'litter', spot: '정류장 의자 밑', at: [70, 40], hearts: 7, ago: 50, by: 0, count: 8 },
  { title: '산책로 입구 담배꽁초 무더기', description: '산책로 들어가는 계단 옆에 꽁초가 잔뜩 모여 있어요.', place_type: 'park', issue_type: 'butt', spot: '계단 옆 화단', at: [-180, 120], hearts: 12, ago: 140, by: 1, count: 14 },
  { title: '골목 끝 무단투기 봉투', description: '전봇대 아래에 종량제 봉투가 아닌 비닐봉투가 몇 개 쌓였어요. 같이 치울 분!', place_type: 'street', issue_type: 'dumping', spot: '전봇대 아래', at: [240, -150], hearts: 4, ago: 300, by: 2, count: 10, crew: 2 },
  { title: '놀이터 옆 페트병들', description: '놀이터 벤치 옆에 페트병이 여러 개 있어요.', place_type: 'park', issue_type: 'litter', spot: '벤치 옆', at: [-90, -210], hearts: 2, ago: 25, by: 3, count: 6 },
  { title: '편의점 앞 넘친 쓰레기통', description: '쓰레기통이 넘쳐서 주변에 흩어졌어요.', place_type: 'street', issue_type: 'bin', spot: '편의점 앞', at: [360, 260], hearts: 9, ago: 600, by: 4, count: 12 },
  { title: '하천 산책로 캔 쓰레기', description: '산책로 난간 쪽에 캔이 버려져 있어요.', place_type: 'etc', issue_type: 'litter', spot: '난간 아래', at: [-420, 330], hearts: 1, ago: 15, by: 5, count: 5 },
]
const CREWS = [
  { name: '용현동 줍깅단', area: '용현동', members: 6, score: 1420, season: 820 },
  { name: '새벽 집게클럽', area: '학익동', members: 4, score: 760, season: 540 },
  { name: '인하 플로깅', area: '인하대 주변', members: 3, score: 380, season: 310 },
]
const START_POINTS = 200 // 시연용 시작 포인트(꾸미기 상점을 바로 써 볼 수 있게)

export function seedDemo(db, center) {
  if (!DEMO || db.demoSeeded || !db.user) return
  db.demoSeeded = true
  const now = Date.now()
  const fake = (i) => `demo-${i}`
  REPORTS.forEach((r, i) => {
    const p = offset(center, r.at[0], r.at[1])
    db.reports.push({
      id: db.nextId++,
      title: r.title,
      description: r.description,
      place_type: r.place_type,
      issue_type: r.issue_type,
      lat: p.lat,
      lng: p.lng,
      address: DEMO_ADDRESS.address,
      dong: DEMO_ADDRESS.dong,
      spot: r.spot,
      photo_path: sceneUri({ place: r.place_type, seed: i + 3, count: r.count }),
      status: 'open',
      likes: Array.from({ length: r.hearts }, (_, k) => fake(`h${i}-${k}`)),
      members: [],
      required_members: r.crew || 1,
      deadline_at: null,
      created_at: new Date(now - r.ago * 60 * 1000).toISOString(),
      reporter_id: fake(`u${r.by}`),
      reporter_nickname: NEIGHBORS[r.by],
      marks: { [fake('m1')]: 'still', ...(r.hearts > 5 ? { [fake('m2')]: 'still', [fake('m3')]: 'worse' } : {}) },
    })
  })
  const maxId = db.crews.reduce((m, c) => Math.max(m, c.id), 0)
  CREWS.forEach((c, i) => {
    const ids = Array.from({ length: c.members }, (_, k) => fake(`c${i}-${k}`))
    const names = Object.fromEntries(ids.map((id, k) => [id, NEIGHBORS[(i * 3 + k) % NEIGHBORS.length] + (k >= NEIGHBORS.length ? k : '')]))
    const contrib = Object.fromEntries(ids.map((id, k) => [id, Math.round((c.season * (ids.length - k)) / ((ids.length * (ids.length + 1)) / 2))]))
    const at = (m) => new Date(now - m * 60 * 1000).toISOString()
    db.crews.push({
      id: maxId + i + 1,
      name: c.name,
      area: c.area,
      owner_id: ids[0],
      members: ids,
      score: c.score,
      season_score: c.season,
      contrib,
      names,
      feed: [
        { id: `seed-${i}-1`, at: at(600), type: 'create', user: names[ids[0]] },
        { id: `seed-${i}-2`, at: at(240), type: 'complete', user: names[ids[1]], title: '정류장 주변 컵 쓰레기', crew_xp: 80, points: 15, is_crew_quest: false },
        { id: `seed-${i}-3`, at: at(45), type: 'complete', user: names[ids[0]], title: '공원 벤치 옆 페트병', crew_xp: 150, points: 20, is_crew_quest: false },
      ],
      created_at: at(60 * 24 * 10),
    })
  })
  db.user.points = (db.user.points || 0) + START_POINTS
}
