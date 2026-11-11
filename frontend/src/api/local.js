import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { errorText } from './errors'

// 기기 저장소 구현. 서버가 준비되기 전까지 앱 기능을 이 기기 안에서 실제로 동작시킵니다.
// 응답 모양은 백엔드 API 가이드와 같게 맞췄고, 규칙은 docs/api.md 를 따릅니다
// (하루 3개 상한·KST 0시 기준, 인증 사진은 의뢰 위치 100m 이내, 포인트는 서버가 승격한 의뢰에만).
// 한계: 데이터가 이 기기에만 있어 다른 사람과 공유되지 않고, 하트·승격·포인트 판정은 서버가 있어야 의미가 있습니다.

const KEY = 'jubquest:v1'
const PLACE = {
  drain: ['빗물받이', 100],
  bus_stop: ['버스정류장', 80],
  park: ['공원', 150],
  street: ['골목·거리', 80],
  etc: ['기타', 50],
}
const XP_PER_LEVEL = 300
const DAILY_LIMIT = 3
const PROOF_RADIUS_M = 100
const DAY = 24 * 3600 * 1000
// 하트 1개당 포인트. 시안 예시값이고, 서버가 생기면 서버가 승격·포인트를 정합니다.
const POINTS_PER_HEART = 5
const pointsOf = (r) => r.likes.length * POINTS_PER_HEART

// 제휴 의뢰 예시 1건. 서버가 없어 제휴처가 올릴 경로가 없으므로 앱이 하나를 넣어 둡니다.
// 인증이 가능하도록 처음 받은 내 위치에서 약 60m 떨어진 곳에 둡니다. 보상 금액은 예시값입니다.
const PARTNER = {
  title: '망가진 공원 벤치 사진 찍기',
  description: '공원에서 부서지거나 망가진 벤치를 찾아 사진으로 알려 주세요. 확인되면 충주사랑상품권을 드려요.',
  place_type: 'park',
  proof_mode: 'single', // 치우는 의뢰가 아니라 사진 한 장으로 인증
  proof_label: '벤치 사진',
  partner_name: '충주시 제휴',
  reward_label: '충주사랑상품권 5,000원',
  reward_value: '5,000원',
  reward_unit: '상품권',
}

let cache = null
const listeners = new Set()

async function load() {
  if (!cache) {
    try {
      cache = JSON.parse(await AsyncStorage.getItem(KEY)) || null
    } catch {
      cache = null
    }
    cache = cache || { user: null, reports: [], nextId: 1 }
    cache.crews = cache.crews || []
  }
  return cache
}
const save = async () => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    throw new Error('기기 저장 공간이 부족해요. 완료된 의뢰가 많다면 설정에서 로그아웃해 기록을 비워 주세요')
  }
}

// 웹은 사진이 data: 주소로 저장소(약 5MB)에 들어가므로 작게 줄여 둡니다.
async function keepPhoto(uri) {
  if (Platform.OS !== 'web' || !uri?.startsWith('data:')) return uri
  try {
    const img = new Image()
    await new Promise((ok, no) => {
      img.onload = ok
      img.onerror = no
      img.src = uri
    })
    const scale = Math.min(1, 640 / img.width)
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return uri
  }
}
const fail = (code) => {
  throw new Error(errorText({ message: code }))
}

function meters(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(h))
}
// 한국 시간 기준 날짜(YYYY-MM-DD)
const kstDay = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
const kstWeek = (t) => Math.floor((new Date(t).getTime() + 9 * 3600 * 1000 - 4 * DAY) / (7 * DAY)) // 월요일 시작

const sessionOf = (user) => (user ? { user: { id: user.id } } : null)

export async function getSession() {
  return sessionOf((await load()).user)
}
export function onAuthChange(cb) {
  listeners.add(cb)
  return { unsubscribe: () => listeners.delete(cb) }
}
const emit = () => listeners.forEach((cb) => cb(sessionOf(cache.user)))

export async function signInAnonymously() {
  const db = await load()
  if (!db.user) {
    const id = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    db.user = { id, nickname: `줍줍이${Math.floor(1000 + Math.random() * 9000)}`, xp: 0, points: 0, completed: [], createdAt: new Date().toISOString() }
    await save()
  }
  emit()
  return sessionOf(db.user)
}
// 로그아웃하면 이 기기의 기록을 지웁니다(서버가 없어 다시 불러올 곳이 없음).
export async function signOut() {
  cache = { user: null, reports: [], nextId: 1, crews: [] }
  await save()
  emit()
}

// 인증 시간이 지난 의뢰는 다시 모집 중으로 돌립니다.
function sweep(db) {
  for (const r of db.reports) {
    if (r.status === 'in_progress' && r.deadline_at && new Date(r.deadline_at).getTime() < Date.now()) {
      r.status = 'open'
      r.members = []
      r.deadline_at = null
    }
  }
}

function view(r, me, from) {
  const [label, xp] = PLACE[r.place_type] || PLACE.etc
  return {
    id: r.id,
    kind: r.kind || 'report',
    partner_name: r.partner_name || null,
    proof_mode: r.proof_mode || 'before_after',
    proof_label: r.proof_label || null,
    reward_label: r.reward_label || null,
    reward_value: r.reward_value || null,
    reward_unit: r.reward_unit || null,
    title: r.title,
    description: r.description,
    place_type: r.place_type,
    place_label: label,
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    dong: r.dong,
    photo_path: r.photo_path,
    status: r.status,
    is_promoted: false,
    like_count: r.likes.length,
    required_members: r.required_members,
    current_members: r.members.length,
    reward_xp: xp,
    reward_points: pointsOf(r),
    deadline_at: r.deadline_at,
    created_at: r.created_at,
    reporter_id: r.reporter_id,
    reporter_nickname: r.reporter_id === me.id ? me.nickname : r.reporter_nickname,
    distance_m: from ? meters(from, r) : null,
    liked_by_me: r.likes.includes(me.id),
    i_am_participating: r.members.includes(me.id),
  }
}

export async function getNearbyReports({ lat, lng, radiusM = 1500 }) {
  const db = await load()
  if (!db.partnerSeeded) {
    db.partnerSeeded = true
    db.reports.push({ ...PARTNER, id: db.nextId++, kind: 'partner', lat: lat + 0.0004, lng: lng + 0.0004, address: '내 위치 근처', dong: '', photo_path: null, status: 'open', likes: [], members: [], required_members: 1, deadline_at: null, created_at: new Date().toISOString(), reporter_id: 'partner', reporter_nickname: PARTNER.partner_name })
  }
  sweep(db)
  await save()
  return db.reports
    .map((r) => view(r, db.user, { lat, lng }))
    .filter((r) => r.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m)
}

async function find(id) {
  const db = await load()
  const r = db.reports.find((x) => x.id === id)
  if (!r) fail('REPORT_NOT_OPEN')
  return { db, r, me: db.user }
}

export async function toggleLike(id) {
  const { r, me } = await find(id)
  const on = r.likes.includes(me.id)
  r.likes = on ? r.likes.filter((u) => u !== me.id) : [...r.likes, me.id]
  await save()
  return { liked: !on, like_count: r.likes.length, is_promoted: false, just_promoted: false }
}

export async function acceptReport(id) {
  const { r, me } = await find(id)
  if (r.status !== 'open') fail('REPORT_NOT_OPEN')
  if (r.members.includes(me.id)) fail('ALREADY_JOINED')
  if (r.members.length >= r.required_members) fail('REPORT_FULL')
  r.members.push(me.id)
  if (r.members.length >= r.required_members) {
    r.status = 'in_progress'
    r.deadline_at = new Date(Date.now() + DAY).toISOString()
  }
  await save()
  return { status: r.status, current_members: r.members.length, required_members: r.required_members, deadline_at: r.deadline_at }
}

export async function cancelParticipation(id) {
  const { r, me } = await find(id)
  if (!r.members.includes(me.id)) fail('NOT_PARTICIPATING')
  r.members = r.members.filter((u) => u !== me.id)
  if (r.status === 'in_progress') {
    r.status = 'open'
    r.deadline_at = null
  }
  await save()
}

const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1

function streak(completed) {
  const weeks = new Set(completed.map((c) => kstWeek(c.at)))
  let w = kstWeek(Date.now())
  if (!weeks.has(w)) w -= 1 // 이번 주에 아직 안 했으면 지난주부터 셉니다
  let n = 0
  while (weeks.has(w)) {
    n += 1
    w -= 1
  }
  return n
}

export async function getMyProfile() {
  const { user: me } = await load()
  return {
    id: me.id,
    nickname: me.nickname,
    xp: me.xp,
    points: me.points,
    level: levelOf(me.xp),
    xp_in_level: me.xp % XP_PER_LEVEL,
    xp_for_next_level: XP_PER_LEVEL,
    streak_weeks: streak(me.completed),
    active_this_week: me.completed.some((c) => kstWeek(c.at) === kstWeek(Date.now())),
    completed_count: me.completed.length,
    rewards: me.rewards || [],
  }
}

export async function setNickname(nickname) {
  const db = await load()
  db.user.nickname = nickname
  await save()
}

// 사진은 촬영 결과 주소를 그대로 가리킵니다(웹은 data: 주소, 폰은 앱 캐시 파일).
export const photoUrl = (path) => path || null

export async function createReport(userId, { title, placeType, description, requiredMembers, shot, address, dong }) {
  const db = await load()
  const photo = await keepPhoto(shot.uri)
  const id = db.nextId++
  db.reports.push({
    id,
    title,
    description,
    place_type: placeType,
    lat: shot.lat,
    lng: shot.lng,
    address,
    dong,
    photo_path: photo,
    status: 'open',
    likes: [],
    members: [],
    required_members: Math.max(1, requiredMembers || 1),
    deadline_at: null,
    created_at: new Date().toISOString(),
    reporter_id: userId,
    reporter_nickname: db.user.nickname,
  })
  await save()
  return id
}

export async function submitProof(userId, id, before, after) {
  const { db, r, me } = await find(id)
  if (!r.members.includes(me.id)) fail('NOT_PARTICIPATING')
  if (r.status !== 'in_progress') fail('REPORT_NOT_IN_PROGRESS')
  if (r.deadline_at && new Date(r.deadline_at).getTime() < Date.now()) fail('DEADLINE_PASSED')
  if (me.completed.filter((c) => kstDay(c.at) === kstDay(Date.now())).length >= DAILY_LIMIT) fail('DAILY_LIMIT')
  if (meters(before, r) > PROOF_RADIUS_M || meters(after, r) > PROOF_RADIUS_M) fail('TOO_FAR')

  const xp = (PLACE[r.place_type] || PLACE.etc)[1]
  const points = pointsOf(r)
  const was = levelOf(me.xp)
  me.xp += xp
  me.points += points
  if (r.reward_label) (me.rewards = me.rewards || []).push({ label: r.reward_label, from: r.partner_name, at: new Date().toISOString() })
  // 크루원이면 크루 점수에도 더합니다. 크루 의뢰(2명 이상)는 2배.
  const crew = db.crews.find((c) => c.members.includes(me.id))
  if (crew) crew.score += xp * (r.required_members > 1 ? 2 : 1)
  me.completed.push({ id, at: new Date().toISOString() })
  r.status = 'completed'
  r.deadline_at = null
  r.before_path = await keepPhoto(before.uri)
  r.after_path = await keepPhoto(after.uri)
  r.completed_at = new Date().toISOString()
  await save()
  return { xp_gained: xp, points_gained: points, reward_label: r.reward_label || null, level: levelOf(me.xp), leveled_up: levelOf(me.xp) > was, xp: me.xp, points: me.points, streak_weeks: streak(me.completed) }
}

// ── 크루 ──────────────────────────────────────────────
// 한 사람은 크루 하나에만 가입합니다(docs/api.md 에서 아직 미정인 항목, 우선 이렇게 둠).
const crewView = (c, me, rank) => ({ id: c.id, name: c.name, area: c.area, member_count: c.members.length, score: c.score, rank, is_mine: c.members.includes(me.id), is_owner: c.owner_id === me.id })

export async function getCrews() {
  const db = await load()
  return [...db.crews].sort((a, b) => b.score - a.score || a.id - b.id).map((c, i) => crewView(c, db.user, i + 1))
}

export async function createCrew({ name, area }) {
  const db = await load()
  if (db.crews.some((c) => c.members.includes(db.user.id))) fail('ALREADY_IN_CREW')
  if (db.crews.some((c) => c.name === name)) fail('CREW_NAME_TAKEN')
  const id = (db.crews.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1
  db.crews.push({ id, name, area, owner_id: db.user.id, members: [db.user.id], score: 0, created_at: new Date().toISOString() })
  await save()
  return id
}

export async function joinCrew(id) {
  const db = await load()
  if (db.crews.some((c) => c.members.includes(db.user.id))) fail('ALREADY_IN_CREW')
  const c = db.crews.find((x) => x.id === id)
  if (!c) fail('CREW_NOT_FOUND')
  c.members.push(db.user.id)
  await save()
}

// 마지막 크루원이 나가면 크루는 사라집니다.
export async function leaveCrew() {
  const db = await load()
  const c = db.crews.find((x) => x.members.includes(db.user.id))
  if (!c) fail('NOT_IN_CREW')
  c.members = c.members.filter((u) => u !== db.user.id)
  if (c.members.length === 0) db.crews = db.crews.filter((x) => x !== c)
  else if (c.owner_id === db.user.id) c.owner_id = c.members[0]
  await save()
}
