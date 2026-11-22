import { Platform } from 'react-native'
import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'
import { CREW_SHOP, seasonRewards } from '../lib/cosmetics'
import { supabase } from '../lib/supabase'
import { errorText } from './errors'

// 서버(Supabase) 호출 모음. 이름·인자·응답은 docs/api.md 와 맞춥니다.
// 화면은 local.js 와 같은 모양의 값을 기대하므로, 서버 응답을 여기서 그 모양으로 바꿉니다.
// 판정(승격·보상·하루 상한·위치)은 전부 서버가 하고, 여기서는 전달만 합니다.

const fail = (code) => {
  throw new Error(errorText({ message: code }))
}
const check = (error) => {
  if (error) throw new Error(errorText(error))
}
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  check(error)
  return data
}

// ── 로그인 ────────────────────────────────────────────
export const getSession = async () => (await supabase.auth.getSession()).data.session
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session)).data.subscription
// 둘러보기(익명) 계정: 읽기만 됩니다. 쓰기는 서버가 LOGIN_REQUIRED 로 막습니다.
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously()
  check(error)
  return data.session
}
export async function signInEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  check(error)
  return data.session
}
// 메일 확인을 켜 둔 서버에서는 session 이 없이 돌아옵니다(메일의 링크를 누른 뒤 로그인).
// nickname: 아이디로 가입하면 아이디를 첫 닉네임으로 씁니다(2026-11-23). 가입 정보(user_metadata)에도 남겨 서버가 쓸 수 있게 합니다.
export async function signUpEmail(email, password, nickname) {
  const { data, error } = await supabase.auth.signUp({ email, password, ...(nickname ? { options: { data: { nickname } } } : {}) })
  check(error)
  if (nickname && data.session) {
    // 닉네임 저장이 실패해도 가입은 된 것이므로 기본 닉네임으로 둡니다.
    await supabase.from('profiles').update({ nickname }).eq('id', data.session.user.id)
  }
  return data.session
}
export const signOut = () => supabase.auth.signOut()
// 가입 동의를 서버에 남깁니다. 필수 항목이 없으면 서버가 쓰기 기능을 CONSENT_REQUIRED 로 막습니다.
export const saveConsent = (items) => rpc('save_consent', { p_items: { age: !!items.age, terms: !!items.terms, privacy: !!items.privacy, location: !!items.location, push: !!items.push } })
export const getConsent = () => rpc('my_consent')

// ── 사진 ──────────────────────────────────────────────
const publicUrl = (bucket, path) => (!path ? null : /^(https?:|data:|file:)/.test(path) ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl)
// 화면에는 이미 주소로 바꾼 값을 내려 주므로 그대로 씁니다.
export const photoUrl = (path) => path || null

const bytesOf = async (uri) => (Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer())
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (buf) => hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(buf)))

// 경로는 반드시 `{내 user id}/파일명` 이어야 서버가 받습니다(아니면 INVALID_PHOTO).
async function upload(bucket, path, buf, upsert = false) {
  const { error } = await supabase.storage.from(bucket).upload(path, buf, { contentType: 'image/jpeg', upsert })
  check(error)
  return path
}

// 32×32 RGB 미리보기(3072바이트)를 base64 로. 서버의 NO_CHANGE 검사에 씁니다. 웹에서만 만들 수 있고, 없으면 서버가 그 검사를 건너뜁니다.
async function thumbOf(uri) {
  if (Platform.OS !== 'web') return null
  try {
    const img = new Image()
    await new Promise((ok, no) => {
      img.onload = ok
      img.onerror = no
      img.src = uri
    })
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 32
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0, 32, 32)
    const px = g.getImageData(0, 0, 32, 32).data
    let s = ''
    for (let i = 0; i < px.length; i += 4) s += String.fromCharCode(px[i], px[i + 1], px[i + 2])
    return btoa(s)
  } catch {
    return null
  }
}

// ── 의뢰판 ────────────────────────────────────────────
// 서버는 의뢰(quests)와 아직 의뢰가 되지 않은 주민 제보(reports)를 따로 줍니다. 번호가 겹치므로 앞에 q / r 을 붙여 한 목록으로 합칩니다.
const PLACE_KEY = { 빗물받이: 'drain', 버스정류장: 'bus_stop', 공원: 'park', '골목·거리': 'street', 기타: 'etc' }
const PLACE_NAME = Object.fromEntries(Object.entries(PLACE_KEY).map(([k, v]) => [v, k]))
const NO_MARKS = { still: 0, gone: 0, worse: 0 }
const known = new Map() // 목록에서 본 행: 앱 id → { kind, questId, reportId, claimId, partner }
const deadlines = new Map() // 수락할 때 받은 인증 마감 시각

function fromQuest(x) {
  const id = `q${x.id}`
  const partner = x.kind === 'partner'
  const mineNow = x.my_status === 'accepted'
  // 인증을 올리고 확인(투표·업체·운영진)을 기다리는 중
  const verifying = x.my_status === 'submitted' || x.my_status === 'staff_review'
  known.set(id, { questId: x.id, reportId: x.report_id || null, claimId: x.my_claim_id || null, partner })
  const full = (x.current_members || 0) >= (x.required_members || 1)
  return {
    id,
    code: x.code,
    kind: x.kind,
    partner_name: partner ? x.org : null,
    proof_mode: x.proof_mode || 'before_after',
    proof_label: x.proof_label || null,
    reward_label: x.reward_label || null,
    reward_value: x.reward_value || null,
    reward_unit: x.reward_unit || null,
    title: x.title,
    description: x.description,
    place_type: PLACE_KEY[x.category] || 'etc',
    place_label: x.category || '기타',
    issue_type: x.issue_type || null,
    is_mine: !!x.is_mine,
    marks: x.marks || NO_MARKS,
    my_mark: x.my_mark || null,
    pending_until: null,
    lat: x.lat,
    lng: x.lng,
    address: x.address,
    spot: x.spot || '',
    dong: '',
    photo_path: publicUrl('report-photos', x.photo_url),
    // 제휴 의뢰는 각자 수락해서 각자 인증합니다. 나머지는 인원이 다 모여야 시작됩니다.
    status: x.cleared || x.status === 'done' ? 'completed' : partner ? (mineNow ? 'in_progress' : 'open') : full ? 'in_progress' : 'open',
    is_promoted: x.kind === 'report',
    like_count: x.hearts || 0,
    required_members: x.required_members || 1,
    current_members: x.current_members || 0,
    reward_xp: x.reward_xp || 0,
    reward_points: x.point || 0,
    reward_crew_xp: x.reward_crew_xp || 0,
    deadline_at: mineNow ? deadlines.get(id) || null : null,
    created_at: x.created_at || null,
    reporter_id: null,
    reporter_nickname: partner ? x.org : null,
    distance_m: x.distance_m,
    liked_by_me: !!x.hearted,
    i_am_participating: mineNow,
    verifying,
    is_demo: !!x.is_demo,
  }
}

function fromReport(x) {
  const id = `r${x.id}`
  known.set(id, { questId: null, reportId: x.id, claimId: null, partner: false })
  return {
    id,
    code: x.code,
    kind: 'report',
    partner_name: null,
    proof_mode: 'before_after',
    proof_label: null,
    reward_label: null,
    reward_value: null,
    reward_unit: null,
    title: x.title,
    description: x.description,
    place_type: PLACE_KEY[x.category] || 'etc',
    place_label: x.category || '기타',
    issue_type: x.issue_type || null,
    is_mine: !!x.mine,
    marks: x.marks || NO_MARKS,
    my_mark: x.my_mark || null,
    pending_until: x.pending_until || null,
    lat: x.lat,
    lng: x.lng,
    address: x.address,
    spot: x.spot || '',
    dong: '',
    photo_path: publicUrl('report-photos', x.photo_url),
    status: 'open',
    is_promoted: false,
    like_count: x.hearts || 0,
    required_members: x.required_members || 1,
    current_members: 0,
    reward_xp: x.reward_xp || 0,
    reward_points: x.point || 0,
    reward_crew_xp: 0,
    deadline_at: null,
    created_at: x.created_at,
    reporter_id: null,
    reporter_nickname: x.author,
    distance_m: x.distance_m,
    liked_by_me: !!x.hearted,
    i_am_participating: false,
    is_demo: !!x.is_demo,
  }
}

export async function getNearbyReports({ lat, lng, radiusM = 1500 }) {
  const args = { p_lat: lat, p_lng: lng, p_radius_m: radiusM }
  const [quests, reports] = await Promise.all([rpc('quests_nearby', { ...args, p_kind: null }), rpc('reports_nearby', args)])
  // 시험용으로 넣었던 데이터(is_demo)는 첫 시즌부터 보이지 않게 뺍니다(2026-11-22). 서버에서 지우는 건 docs/backend-requests.md 9-1.
  return [...(quests || []).map(fromQuest), ...(reports || []).map(fromReport)].filter((x) => !x.is_demo).sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
}

const row = (id) => known.get(id) || fail('REPORT_NOT_OPEN')
const reportIdOf = (id) => row(id).reportId || fail('REPORT_NOT_OPEN')

// 하트는 취소가 없습니다. 주민 제보에서 나온 의뢰에는 원래 제보 번호로 보냅니다.
export async function toggleLike(id) {
  const d = await rpc('give_heart', { p_report_id: reportIdOf(id) })
  return { liked: true, like_count: d.like_count, is_promoted: false, just_promoted: false, points_gained: d.points_gained || 0, hearts_left: d.hearts_left }
}

export async function acceptReport(id) {
  const k = row(id)
  // 제보는 올리는 즉시 의뢰가 됩니다. 의뢰 번호가 없는 행은 아직 공개 전(3분)이거나 예전 제보입니다.
  if (!k.questId) fail('REPORT_NOT_READY')
  const d = await rpc('accept_quest', { p_quest_id: k.questId })
  k.claimId = d.claim_id
  deadlines.set(id, d.deadline_at)
  return { status: k.partner ? 'in_progress' : d.status, current_members: d.current_members, required_members: d.required_members, deadline_at: d.deadline_at }
}

export async function cancelParticipation(id) {
  const k = row(id)
  if (!k.claimId) fail('NOT_PARTICIPATING')
  await rpc('cancel_claim', { p_claim_id: k.claimId })
  uploads.delete(`${id}:before`)
  uploads.delete(`${id}:after`)
}

// ── 인증 ──────────────────────────────────────────────
// 서버는 "찍고 바로 완료"를 사진이 올라온 시각으로 판정합니다. 그래서 사진은 찍는 즉시 올립니다.
const uploads = new Map() // `${id}:${slot}` → { uri, done: Promise<{ path, hash }> }

export function uploadProofPhoto(userId, id, slot, shot) {
  const k = row(id)
  if (!k.claimId) fail('NOT_PARTICIPATING')
  const done = (async () => {
    const buf = await bytesOf(shot.uri)
    const hash = await sha256(buf)
    const path = await upload('claim-photos', `${userId}/${k.claimId}-${slot}-${Date.now()}.jpg`, buf)
    return { path, hash }
  })()
  done.catch(() => {}) // 실패는 submitProof 에서 다시 시도하며 알립니다
  uploads.set(`${id}:${slot}`, { uri: shot.uri, done })
  return done
}

async function uploaded(userId, id, slot, shot) {
  const u = uploads.get(`${id}:${slot}`)
  if (u && u.uri === shot.uri) {
    try {
      return await u.done
    } catch {
      // 아래에서 다시 올립니다
    }
  }
  return uploadProofPhoto(userId, id, slot, shot)
}

export async function submitProof(userId, id, before, after) {
  const k = row(id)
  if (!k.claimId) fail('NOT_PARTICIPATING')
  const single = !after || after.uri === before.uri
  const b = await uploaded(userId, id, 'before', before)
  const args = {
    p_claim_id: k.claimId,
    p_before_photo_url: b.path,
    p_before_lat: before.lat,
    p_before_lng: before.lng,
    p_before_accuracy_m: before.accuracyM ?? null,
    p_before_taken_at: before.takenAt,
    p_before_photo_hash: b.hash,
    p_mocked: !!(before.mocked || (!single && after.mocked)),
  }
  if (!single) {
    const a = await uploaded(userId, id, 'after', after)
    Object.assign(args, {
      p_after_photo_url: a.path,
      p_after_lat: after.lat,
      p_after_lng: after.lng,
      p_after_accuracy_m: after.accuracyM ?? null,
      p_after_taken_at: after.takenAt,
      p_after_photo_hash: a.hash,
    })
    const [tb, ta] = await Promise.all([thumbOf(before.uri), thumbOf(after.uri)])
    if (tb && ta) Object.assign(args, { p_before_thumb: tb, p_after_thumb: ta })
  }
  const d = await rpc('approve_claim', args)
  uploads.delete(`${id}:before`)
  uploads.delete(`${id}:after`)
  deadlines.delete(id)
  // 확인 대기면 화면이 쓰는 이름(points_gained 등)에 "받을 예정" 값을 담고 pending 으로 구분합니다.
  // 개편(7-1) 뒤에는 표본에 뽑히지 않으면 서버가 바로 승인(approved)하고 지급합니다. 그때는 pending 이 아닙니다.
  const now = d.status === 'approved'
  return {
    pending: !now,
    dispute_until: d.dispute_until || null,
    status: d.status,
    title: d.title,
    reward_label: d.reward_label || null,
    points_gained: (now ? d.points_gained : d.points_pending) || 0,
    xp_gained: (now ? d.xp_gained : d.xp_pending) || 0,
    crew_xp_gained: (now ? d.crew_xp_gained : d.crew_xp_pending) || 0,
    level: d.level,
    leveled_up: !!d.leveled_up,
    voters: d.voters || 0,
    verify_deadline: d.verify_deadline || null,
    by_partner: k.partner,
  }
}

// ── 바로 치웠어요 (7-4, 서버 함수 quick_clean 요청 중) ──────────
// 의뢰 없이 전·후 사진으로 기록합니다. 사진은 찍자마자 올립니다(서버가 업로드 시각으로 TOO_FAST 판정).
const quickUploads = new Map() // slot → { uri, done }

export function uploadQuickPhoto(userId, slot, shot) {
  const done = (async () => {
    const buf = await bytesOf(shot.uri)
    const hash = await sha256(buf)
    const path = await upload('claim-photos', `${userId}/self-${Date.now()}-${slot}.jpg`, buf)
    return { path, hash }
  })()
  done.catch(() => {})
  quickUploads.set(slot, { uri: shot.uri, done })
  return done
}

async function quickUploaded(userId, slot, shot) {
  const u = quickUploads.get(slot)
  if (u && u.uri === shot.uri) {
    try {
      return await u.done
    } catch {
      // 다시 올립니다
    }
  }
  return uploadQuickPhoto(userId, slot, shot)
}

export async function quickClean(userId, { before, after, placeType, issueType, title }) {
  if (!before || !after) fail('MISSING_PROOF')
  const [b, a] = [await quickUploaded(userId, 'before', before), await quickUploaded(userId, 'after', after)]
  const [tb, ta] = await Promise.all([thumbOf(before.uri), thumbOf(after.uri)])
  const d = await rpc('quick_clean', {
    p_category: PLACE_NAME[placeType] || '기타',
    p_issue_type: issueType || 'litter',
    p_title: title || null,
    p_before_photo_url: b.path, p_before_lat: before.lat, p_before_lng: before.lng, p_before_accuracy_m: before.accuracyM ?? null, p_before_taken_at: before.takenAt, p_before_photo_hash: b.hash,
    p_after_photo_url: a.path, p_after_lat: after.lat, p_after_lng: after.lng, p_after_accuracy_m: after.accuracyM ?? null, p_after_taken_at: after.takenAt, p_after_photo_hash: a.hash,
    p_mocked: !!(before.mocked || after.mocked),
    p_before_thumb: tb, p_after_thumb: ta,
  })
  quickUploads.clear()
  return { self: true, title: d.title, xp_gained: d.xp_gained || 0, points_gained: 0, crew_xp_gained: d.crew_xp_gained || 0, level: d.level, leveled_up: !!d.leveled_up }
}

// 내가 올린 인증 중 확인 대기·운영진 검토·최근 반려. 수락만 한 것은 의뢰 목록에 이미 있으므로 뺍니다.
export async function getMyClaims() {
  const list = (await rpc('my_claims')) || []
  return list.filter((c) => c.status !== 'accepted')
}

// ── 제보하기 ──────────────────────────────────────────
export async function createReport(userId, { title, placeType, issueType, description, requiredMembers, shot, address, spot }) {
  const path = await upload('report-photos', `${userId}/${Date.now()}.jpg`, await bytesOf(shot.uri))
  const { error } = await supabase.from('reports').insert({
    title,
    category: PLACE_NAME[placeType] || '기타',
    issue_type: issueType || 'litter',
    required_members: Math.max(1, requiredMembers || 1),
    photo_url: path,
    lat: shot.lat,
    lng: shot.lng,
    address: address || null,
    description: description || null,
    spot: spot || null,
  })
  check(error)
  return true
}

// ── 내 정보 ───────────────────────────────────────────
export async function getMyProfile() {
  const p = await rpc('my_profile')
  if (!p) return null
  return {
    ...p,
    avatar_url: publicUrl('avatars', p.avatar_url),
    weekly: p.weekly || [],
    stats: p.stats || {},
    cleaned: p.cleaned || [],
    rewards: p.rewards || [],
    coupons: p.coupons || [],
    feats_claimed: p.feats_claimed || [],
  }
}

async function me() {
  const id = (await getSession())?.user?.id
  if (!id) fail('LOGIN_REQUIRED')
  return id
}

export async function setNickname(nickname) {
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', await me())
  check(error)
}

// 프로필 사진: avatars 버킷의 내 폴더에 올리고 경로를 저장합니다. null 이면 기본으로 돌아갑니다.
export async function setAvatar(uri) {
  const id = await me()
  // 같은 경로를 덮어쓰면 화면이 예전 사진을 계속 보여 주므로 파일 이름에 시각을 붙입니다.
  const path = uri ? await upload('avatars', `${id}/avatar-${Date.now()}.jpg`, await bytesOf(uri), true) : null
  const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', id)
  check(error)
}
export const setTitle = (key) => rpc('set_title', { p_key: key || null })
// 도전과제 보상: 달성 여부는 서버가 판정합니다.
export const claimFeat = (id) => rpc('claim_feat', { p_id: id })

// ── 크루 ──────────────────────────────────────────────
export async function getCrews() {
  const list = (await rpc('crew_ranking')) || []
  // 시험용 크루(is_demo)는 순위에서 빼고 순위를 다시 매깁니다.
  return list.filter((c) => !c.is_demo).map((c, i) => ({ ...c, id: c.crew_id, is_mine: !!c.mine, rank: i + 1 }))
}
export async function getMyCrew() {
  const c = await rpc('my_crew')
  return c ? { ...c, is_mine: true, members: c.members || [], feed: c.feed || [] } : null
}
export const createCrew = ({ name, area }) => rpc('create_crew', { p_name: name, p_area: area || null })
export const joinCrew = (id) => rpc('join_crew', { p_crew_id: id })
export const leaveCrew = () => rpc('leave_crew')

// ── 상점 · 꾸미기 ─────────────────────────────────────
export async function getShopItems() {
  const { data, error } = await supabase.from('shop_items').select('id, name, cost').order('sort')
  check(error)
  return data || []
}
export const redeemItem = (itemId) => rpc('redeem_item', { p_item_id: itemId })
export const getCosmetics = async () => (await rpc('cosmetics_list')) || []
export const buyCosmetic = (id) => rpc('buy_cosmetic', { p_id: id })
export const equipCosmetic = (id) => rpc('equip_cosmetic', { p_id: id })

// ── 시즌 · 크루 상점 (docs/backend-requests.md 9장) ───────
// current_season 은 서버에 있습니다. 보상 테두리 목록은 앱(lib/cosmetics.js)이 갖고, 지급은 서버가 시즌이 끝날 때 합니다.
export async function getSeason() {
  const s = await rpc('current_season')
  if (!s) return null
  const no = Number(String(s.label || '').replace(/\D/g, '')) || null
  const left = new Date(s.ends_at).getTime() - Date.now()
  return {
    no,
    label: s.label,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    days_left: Math.max(0, Math.ceil(left / 86400000)),
    rewards: seasonRewards(1).map((c) => ({ rank: c.rank, id: c.id, name: c.name, frame: { style: c.style, colors: c.colors, rank: c.rank } })),
    last: s.last || null,
  }
}
// 크루 상점 RPC(crew_shop, buy_crew_item)가 아직 서버에 없으면 목록만 보여 주고 살 수는 없게 합니다.
export async function getCrewShop() {
  try {
    return { ...(await rpc('crew_shop')), ready: true }
  } catch {
    return { crew_points: 0, crew_level: 0, in_crew: false, ready: false, items: CREW_SHOP.map((c) => ({ ...c, owned: false, locked: true, equipped: false })) }
  }
}
export const buyCrewItem = (id) => rpc('buy_crew_item', { p_id: id })

// ── 상태 버튼 · 해결 확인 알림 · 신고 ───────────────────
export const setMark = (id, mark) => rpc('set_mark', { p_report_id: reportIdOf(id), p_mark: mark })
export async function getNotices() {
  const list = (await rpc('my_notices')) || []
  return list.map((n) => ({ ...n, before_path: publicUrl('claim-photos', n.before_path), after_path: publicUrl('claim-photos', n.after_path) }))
}
export const answerNotice = (noticeId, answer) => rpc('answer_notice', { p_notice_id: noticeId, p_answer: answer === 'ok' ? 'ok' : 'not' })
export const reportAbuse = (id, reason) => rpc('flag_report', { p_report_id: reportIdOf(id), p_reason: reason })
