// 제휴업체 웹의 데이터 계층입니다.
// .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 있으면 서버(Supabase)에 연결하고,
// 없으면 시연용으로 브라우저 저장소(localStorage)에만 저장합니다. 두 구현은 같은 함수와 같은 모양을 가집니다.
// 서버 호출 이름은 docs/api.md 의 "제휴업체 웹"과 맞춥니다.
import { createClient } from '@supabase/supabase-js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY // anon(publishable) key 만 넣습니다
export const remote = !!(SB_URL && SB_KEY)
const sb = remote ? createClient(SB_URL, SB_KEY) : null

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

const local = {
  remote: false,
  init: async () => {},
  signedIn: () => true,
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

// ── 서버 연결 ─────────────────────────────────────────
const ERRORS = {
  NOT_PARTNER: '업체 등록이 필요해요',
  INVALID_NAME: '업체 이름은 2~30자로 적어 주세요',
  INVALID_INPUT: '입력한 내용을 다시 확인해 주세요',
  CANNOT_CANCEL: '검토 중인 의뢰만 취소할 수 있어요',
  LOGIN_REQUIRED: '로그인이 필요해요',
  'Invalid login credentials': '이메일이나 비밀번호가 맞지 않아요',
  'Email not confirmed': '메일로 보낸 확인 링크를 먼저 눌러 주세요',
  'User already registered': '이미 가입한 이메일이에요. 로그인해 주세요',
  'Password should be': '비밀번호는 6자 이상으로 정해 주세요',
}
const check = (error) => {
  if (!error) return
  const msg = error.message || ''
  const k = Object.keys(ERRORS).find((x) => msg.includes(x))
  throw new Error(k ? ERRORS[k] : /fetch|network/i.test(msg) ? '서버에 연결하지 못했어요' : msg || '문제가 생겼어요')
}
const rpc = async (name, args) => {
  const { data, error } = await sb.rpc(name, args)
  check(error)
  return data
}
const NO_REPORT = { quests: 0, joined: 0, completed: 0, paid: 0, daily: [0, 0, 0, 0, 0, 0, 0], byPlace: [], rows: [], photos: [] }
// 화면은 값을 바로 읽으므로, 서버에서 받은 값을 여기에 두고 바뀔 때마다 다시 받습니다.
const cache = { signedIn: false, partner: null, quests: [], report: NO_REPORT }
async function load() {
  cache.partner = (await rpc('partner_me')) || null
  if (!cache.partner) {
    cache.quests = []
    cache.report = NO_REPORT
    return
  }
  const [quests, report] = await Promise.all([rpc('partner_quests'), rpc('partner_report')])
  cache.quests = quests || []
  cache.report = { ...NO_REPORT, ...(report || {}) }
}

const server = {
  remote: true,
  async init() {
    const { data } = await sb.auth.getSession()
    cache.signedIn = !!data.session
    if (cache.signedIn) await load()
  },
  signedIn: () => cache.signedIn,
  // mode: 'in' 로그인 | 'up' 가입. 메일 확인이 켜진 서버에서는 가입 직후 로그인되지 않아 'confirm' 을 돌려줍니다.
  async signIn(email, password, mode = 'in') {
    const { data, error } = mode === 'up' ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password })
    check(error)
    if (!data.session) return 'confirm'
    cache.signedIn = true
    await load()
    return 'ok'
  },
  partner: () => cache.partner,
  async start(name, manager) {
    await rpc('partner_register', { p_name: name.trim(), p_manager: manager.trim() || null })
    await load()
    return cache.partner
  },
  async leave() {
    await sb.auth.signOut()
    Object.assign(cache, { signedIn: false, partner: null, quests: [], report: NO_REPORT })
  },
  reset() {},
  quests: () => cache.quests,
  async create(q) {
    const made = await rpc('partner_create_quest', {
      p_title: q.title,
      p_description: q.description,
      p_place_type: q.place_type,
      p_place_name: q.place_name,
      p_address: q.address,
      p_proof_mode: q.proof_mode,
      p_reward_type: q.reward_type,
      p_reward_amount: q.reward_amount,
      p_capacity: q.capacity,
      p_starts_on: q.starts_on,
      p_ends_on: q.ends_on,
    })
    await load()
    return made
  },
  async cancel(id) {
    await rpc('partner_cancel_quest', { p_quest_id: id })
    await load()
  },
  report: () => cache.report,
}

export const api = remote ? server : local
