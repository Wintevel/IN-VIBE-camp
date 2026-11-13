// 제휴업체 웹의 데이터 계층입니다.
// 지금은 서버가 없어 브라우저 저장소(localStorage)에만 저장합니다.
// Supabase 가 준비되면 이 파일의 함수 안쪽만 바꾸면 화면은 그대로 씁니다.
// 필요한 서버 작업은 docs/backend-requests.md 의 "제휴업체 웹" 항목을 보세요.

const KEY = 'jipgepyo:partner:v1'

export const PLACES = [
  ['park', '공원'],
  ['street', '골목·거리'],
  ['drain', '빗물받이'],
  ['bus_stop', '버스정류장'],
  ['etc', '기타'],
]
export const placeLabel = (v) => (PLACES.find((p) => p[0] === v) || PLACES[4])[1]

export const STATUS = {
  review: ['검토 중', 'wait'],
  open: ['모집 중', 'on'],
  done: ['종료', 'off'],
  rejected: ['반려', 'bad'],
}

// 아래 숫자는 모두 임시값입니다. 요금 정책이 정해지면 서버 설정으로 옮깁니다.
export const FEE_RATE = 0.15 // 운영 수수료
export const estimate = (q) => {
  const reward = Number(q.reward_amount || 0) * Number(q.capacity || 0)
  const fee = Math.round(reward * FEE_RATE)
  return { reward, fee, total: reward + fee }
}

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { partner: null, quests: [], nextId: 1 }
  } catch {
    return { partner: null, quests: [], nextId: 1 }
  }
}
const write = (db) => localStorage.setItem(KEY, JSON.stringify(db))

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

// 처음 들어온 업체가 빈 화면만 보지 않도록 넣는 예시입니다. 실제 데이터가 아닙니다.
function sample(db) {
  const mk = (o) => ({ id: db.nextId++, sample: true, proof_mode: 'before_after', reward_type: 'voucher', ...o })
  db.quests = [
    mk({ title: '호암지 산책로 쓰레기 줍기', description: '산책로 주변 쓰레기를 주워 주세요.', place_type: 'park', place_name: '호암지 생태공원', address: '충주시 호암동', reward_amount: 5000, capacity: 30, starts_on: daysAgo(20).slice(0, 10), ends_on: daysAgo(6).slice(0, 10), status: 'done', created_at: daysAgo(24), joined: 30, completed: 27, daily: [2, 4, 3, 5, 6, 4, 3] }),
    mk({ title: '성서동 상가 골목 담배꽁초 치우기', description: '상가 골목 빗물받이 주변 담배꽁초를 치워 주세요.', place_type: 'street', place_name: '성서동 젊음의 거리', address: '충주시 성서동', reward_amount: 3000, capacity: 40, starts_on: daysAgo(5).slice(0, 10), ends_on: daysAgo(-9).slice(0, 10), status: 'open', created_at: daysAgo(8), joined: 18, completed: 11, daily: [0, 1, 2, 1, 3, 2, 2] }),
  ]
}

export const api = {
  partner: () => read().partner,
  start(name, manager) {
    const db = read()
    db.partner = { name: name.trim(), manager: manager.trim(), joined_at: new Date().toISOString() }
    if (!db.quests.length) sample(db)
    write(db)
    return db.partner
  },
  leave() {
    const db = read()
    db.partner = null
    write(db)
  },
  reset() {
    localStorage.removeItem(KEY)
  },
  quests: () => read().quests.slice().sort((a, b) => b.id - a.id),
  create(input) {
    const db = read()
    const q = { ...input, id: db.nextId++, status: 'review', created_at: new Date().toISOString(), joined: 0, completed: 0, daily: [0, 0, 0, 0, 0, 0, 0] }
    db.quests.push(q)
    write(db)
    return q
  },
  cancel(id) {
    const db = read()
    db.quests = db.quests.filter((q) => !(q.id === id && q.status === 'review'))
    write(db)
  },
  report() {
    const qs = read().quests.filter((q) => q.status === 'open' || q.status === 'done')
    const sum = (f) => qs.reduce((a, q) => a + f(q), 0)
    const daily = [0, 0, 0, 0, 0, 0, 0]
    qs.forEach((q) => (q.daily || []).forEach((v, i) => (daily[i] += v)))
    const byPlace = {}
    qs.forEach((q) => (byPlace[q.place_type] = (byPlace[q.place_type] || 0) + q.completed))
    return {
      quests: qs.length,
      joined: sum((q) => q.joined),
      completed: sum((q) => q.completed),
      paid: sum((q) => q.completed * q.reward_amount),
      daily,
      byPlace: Object.entries(byPlace).sort((a, b) => b[1] - a[1]),
      rows: qs,
    }
  },
}
