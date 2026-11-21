// 운영 웹(/dev)의 데이터 계층입니다.
// 서버 함수는 supabase/migrations/20261121160000_staff_console.sql 의 admin_* 입니다.
// 운영진(staff_members)으로 등록된 계정만 부를 수 있고, 판정은 모두 서버가 합니다.
// .env 가 없으면 시연 데이터로 이 브라우저 안에서만 동작합니다.
import { createClient } from '@supabase/supabase-js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY // anon(publishable) key 만 넣습니다
const remote = !!(SB_URL && SB_KEY)
const sb = remote ? createClient(SB_URL, SB_KEY) : null

export const CATEGORY = { partner: '제휴 의뢰', report: '주민 제보', crew: '크루 의뢰' }
export const FLAG_REASON = { photo: '부적절한 사진', fake: '거짓 제보', privacy: '개인정보', danger: '위험', etc: '기타' }
export const ACTION_LABEL = {
  quest_review: '제휴 의뢰 검토',
  claim_review: '인증 검토',
  report_hide: '제보 숨김',
  report_restore: '제보 다시 보이기',
  report_dismiss: '신고 기각',
  points: '포인트 조정',
  ban: '계정 정지',
}

// ── 시연 데이터 ───────────────────────────
const KEY = 'jipgepyo:dev:v1'
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString()
const dayOf = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
function seed() {
  return {
    quests: [
      { id: 31, org_name: '인하대 총학생회', title: '용현동 후문 골목 쓰레기 줍기', description: '후문부터 정문 방향 골목 300m 구간이에요.', place_type: 'street', place_name: '인하대 후문 골목', address: '인천 미추홀구 용현동 253', proof_mode: 'before_after', reward_type: 'point', reward_amount: 300, capacity: 30, starts_on: dayOf(1), ends_on: dayOf(14), status: 'review', created_at: ago(3), joined: 0, completed: 0 },
      { id: 30, org_name: '미추홀 카페 연합', title: '주안역 광장 담배꽁초 치우기', description: '광장 화단 주변 꽁초를 주워 주세요.', place_type: 'bus_stop', place_name: '주안역 남광장', address: '인천 미추홀구 주안동 1563', proof_mode: 'single', reward_type: 'coupon', reward_amount: 3000, capacity: 15, starts_on: dayOf(0), ends_on: dayOf(7), status: 'review', created_at: ago(20), joined: 0, completed: 0 },
      { id: 27, org_name: '충주시 자원순환과', title: '호암지 산책로 쓰레기 줍기', description: '', place_type: 'park', place_name: '호암지 생태공원', address: '충주시 호암동', proof_mode: 'before_after', reward_type: 'voucher', reward_amount: 5000, capacity: 30, starts_on: dayOf(-20), ends_on: dayOf(-6), status: 'done', created_at: ago(24 * 24), joined: 30, completed: 27 },
    ],
    claims: [
      { id: 88, quest_id: 12, title: '학산로 버스정류장 전단지 치우기', kind: 'report', org_name: '초록집게', user: '동네한바퀴', user_id: 'u2', before: null, after: null, single: false, lat: 37.4502, lng: 126.6531, submitted_at: ago(30), disputed_at: ago(6), status: 'staff_review', reject_reason: null, decided_at: null, decided_by: null },
      { id: 85, quest_id: 27, title: '호암지 산책로 쓰레기 줍기', kind: 'partner', org_name: '충주시 자원순환과', user: '줍줍이', user_id: 'u3', before: null, after: null, single: false, lat: 36.9731, lng: 127.9327, submitted_at: ago(50), disputed_at: null, status: 'staff_review', reject_reason: null, decided_at: null, decided_by: null },
      { id: 80, quest_id: 9, title: '용현시장 입구 쓰레기통 주변', kind: 'report', org_name: '시장지킴이', user: '초록집게', user_id: 'u1', before: null, after: null, single: true, lat: 37.4561, lng: 126.6512, submitted_at: ago(72), disputed_at: null, status: 'approved', reject_reason: null, decided_at: ago(70), decided_by: 'auto' },
    ],
    reports: [
      { id: 141, title: '놀이터 옆 대형 폐기물', description: '소파가 버려져 있어요', category: '공원', spot: '놀이터 미끄럼틀 뒤', photo: null, author: '익명줍기', author_id: 'u5', created_at: ago(26), hidden_at: ago(4), gone_flagged_at: null, flags: 3, reasons: ['fake', 'fake', 'photo'] },
      { id: 139, title: '편의점 앞 쓰레기 더미', description: '', category: '골목·거리', spot: 'CU 앞 전봇대', photo: null, author: '동네한바퀴', author_id: 'u2', created_at: ago(40), hidden_at: null, gone_flagged_at: null, flags: 1, reasons: ['privacy'] },
      { id: 133, title: '정류장 의자 밑 컵 쓰레기', description: '', category: '버스정류장', spot: null, photo: null, author: '줍줍이', author_id: 'u3', created_at: ago(90), hidden_at: null, gone_flagged_at: ago(10), flags: 0, reasons: [] },
    ],
    users: [
      { id: 'u1', nickname: '초록집게', email: 'gr****@gmail.com', anonymous: false, points: 1240, total_earned: 1900, xp: 2380, level: 12, created_at: ago(24 * 9), last_sign_in_at: ago(2), banned_until: null, staff: false, solved: 31, reports: 12 },
      { id: 'u2', nickname: '동네한바퀴', email: 'wa****@naver.com', anonymous: false, points: 310, total_earned: 520, xp: 860, level: 5, created_at: ago(24 * 7), last_sign_in_at: ago(30), banned_until: null, staff: false, solved: 9, reports: 4 },
      { id: 'u3', nickname: '줍줍이', email: null, anonymous: true, points: 90, total_earned: 90, xp: 310, level: 2, created_at: ago(24 * 3), last_sign_in_at: ago(5), banned_until: null, staff: false, solved: 3, reports: 1 },
      { id: 'u5', nickname: '익명줍기', email: 'te****@test.com', anonymous: false, points: 0, total_earned: 40, xp: 60, level: 1, created_at: ago(24 * 2), last_sign_in_at: ago(20), banned_until: new Date(Date.now() + 6 * 86400000).toISOString(), staff: false, solved: 0, reports: 6 },
      { id: 'me', nickname: '운영진', email: 'ad****@gmail.com', anonymous: false, points: 0, total_earned: 0, xp: 0, level: 1, created_at: ago(24 * 12), last_sign_in_at: ago(0), banned_until: null, staff: true, solved: 0, reports: 0 },
    ],
    log: [{ action: 'report_hide', target: 'report:141', detail: {}, at: ago(4), by: '운영진' }],
  }
}
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || seed()
  } catch {
    return seed()
  }
}
const write = (db) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* 저장이 막힌 브라우저에서는 새로고침하면 처음으로 돌아갑니다 */
  }
}
const log = (db, action, target, detail = {}) => db.log.unshift({ action, target, detail, at: new Date().toISOString(), by: '운영진' })
const fail = (m) => {
  throw new Error(m)
}

const local = {
  remote: false,
  async init() {
    return { signedIn: true, staff: true, name: '운영진' }
  },
  async signIn() {
    return { staff: true, name: '운영진' }
  },
  async leave() {},
  reset: () => localStorage.removeItem(KEY),
  async overview() {
    const db = read()
    return {
      quest_review: db.quests.filter((q) => q.status === 'review').length,
      claim_review: db.claims.filter((c) => c.status === 'staff_review').length,
      flagged: db.reports.filter((r) => r.hidden_at || r.flags > 0 || r.gone_flagged_at).length,
      users: db.users.length,
      banned: db.users.filter((u) => u.banned_until && u.banned_until > new Date().toISOString()).length,
      today_claims: 4,
      today_reports: 7,
      recent: db.log.slice(0, 8),
    }
  },
  async quests(status) {
    const db = read()
    return db.quests.filter((q) => status !== 'review' || q.status === 'review').sort((a, b) => (b.status === 'review') - (a.status === 'review') || b.id - a.id)
  },
  async reviewQuest(id, approve, reason) {
    const db = read()
    const q = db.quests.find((x) => x.id === id && x.status === 'review')
    if (!q) fail('이미 처리된 의뢰예요')
    q.status = approve ? 'open' : 'rejected'
    q.reject_reason = approve ? null : reason
    log(db, 'quest_review', `quest:${id}`, { approve, reason })
    write(db)
  },
  async claims(status) {
    const db = read()
    return db.claims.filter((c) => status !== 'staff_review' || c.status === 'staff_review')
  },
  async reviewClaim(id, approve, reason) {
    const db = read()
    const c = db.claims.find((x) => x.id === id && x.status === 'staff_review')
    if (!c) fail('이미 처리했거나 확인할 수 없는 인증이에요')
    Object.assign(c, { status: approve ? 'approved' : 'rejected', reject_reason: approve ? null : reason, decided_at: new Date().toISOString(), decided_by: 'staff' })
    log(db, 'claim_review', `claim:${id}`, { approve, reason })
    write(db)
  },
  async reports() {
    return read().reports.filter((r) => r.hidden_at || r.flags > 0 || r.gone_flagged_at)
  },
  async setReport(id, action) {
    const db = read()
    const r = db.reports.find((x) => x.id === id)
    if (!r) fail('제보를 찾지 못했어요')
    if (action === 'hide') Object.assign(r, { hidden_at: r.hidden_at || new Date().toISOString(), flags: 0, reasons: [] })
    if (action === 'restore') Object.assign(r, { hidden_at: null, gone_flagged_at: null, flags: 0, reasons: [] })
    if (action === 'dismiss') Object.assign(r, { gone_flagged_at: null, flags: 0, reasons: [] })
    log(db, `report_${action}`, `report:${id}`)
    write(db)
  },
  async users(query) {
    const q = (query || '').trim().toLowerCase()
    return read().users.filter((u) => !q || u.nickname.toLowerCase().includes(q) || u.id === q)
  },
  async adjustPoints(id, delta, reason) {
    const db = read()
    const u = db.users.find((x) => x.id === id)
    if (!u) fail('계정을 찾지 못했어요')
    const applied = Math.max(delta, -u.points)
    u.points += applied
    log(db, 'points', `user:${id}`, { delta: applied, reason })
    write(db)
    return u.points
  },
  async ban(id, days, reason) {
    const db = read()
    const u = db.users.find((x) => x.id === id)
    if (!u) fail('계정을 찾지 못했어요')
    if (u.staff) fail('운영진 계정은 정지할 수 없어요')
    u.banned_until = days ? new Date(Date.now() + days * 86400000).toISOString() : null
    log(db, 'ban', `user:${id}`, { days, reason })
    write(db)
    return u.banned_until
  },
}

// ── 서버 연결 ───────────────────────────────
const ERRORS = {
  NOT_STAFF: '운영진으로 등록된 계정이 아니에요',
  LOGIN_REQUIRED: '로그인이 필요해요',
  REASON_REQUIRED: '사유를 2자 이상 적어 주세요',
  NOT_IN_REVIEW: '이미 처리된 의뢰예요',
  CLAIM_NOT_ACTIVE: '이미 처리했거나 확인할 수 없는 인증이에요',
  CANNOT_BAN_STAFF: '운영진 계정은 정지할 수 없어요',
  NOT_FOUND: '대상을 찾지 못했어요',
  INVALID_INPUT: '입력한 값을 다시 확인해 주세요',
  'Could not find the function': '서버에 운영 함수가 아직 없어요. 마이그레이션을 먼저 실행해 주세요',
  'Invalid login credentials': '이메일이나 비밀번호가 맞지 않아요',
  'Email not confirmed': '메일로 보낸 확인 링크를 먼저 눌러 주세요',
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
const pub = (bucket, path) => (!path ? null : /^https?:/.test(path) ? path : sb.storage.from(bucket).getPublicUrl(path).data.publicUrl)

const server = {
  remote: true,
  async init() {
    const { data } = await sb.auth.getSession()
    if (!data.session) return { signedIn: false }
    const me = (await rpc('admin_me')) || {}
    return { signedIn: true, staff: !!me.staff, name: me.name }
  },
  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password })
    check(error)
    const me = (await rpc('admin_me')) || {}
    return { staff: !!me.staff, name: me.name }
  },
  async leave() {
    await sb.auth.signOut()
  },
  reset() {},
  overview: () => rpc('admin_overview'),
  quests: async (status) => (await rpc('admin_quests', { p_status: status })) || [],
  reviewQuest: (id, approve, reason) => rpc('admin_review_quest', { p_quest_id: id, p_approve: !!approve, p_reason: approve ? null : reason }),
  claims: async (status) => ((await rpc('admin_claims', { p_status: status })) || []).map((c) => ({ ...c, before: pub('claim-photos', c.before), after: pub('claim-photos', c.after) })),
  reviewClaim: (id, approve, reason) => rpc('admin_review_claim', { p_claim_id: id, p_approve: !!approve, p_reason: approve ? null : reason }),
  reports: async () => ((await rpc('admin_reports')) || []).map((r) => ({ ...r, photo: pub('report-photos', r.photo) })),
  setReport: (id, action) => rpc('admin_set_report', { p_report_id: id, p_action: action }),
  users: async (query) => (await rpc('admin_users', { p_query: query || '' })) || [],
  adjustPoints: (id, delta, reason) => rpc('admin_adjust_points', { p_user_id: id, p_delta: delta, p_reason: reason }),
  ban: (id, days, reason) => rpc('admin_ban_user', { p_user_id: id, p_days: days, p_reason: reason || null }),
}

export const dev = remote ? server : local
