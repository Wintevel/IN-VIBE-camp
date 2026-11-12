import { supabase } from '../lib/supabase'
import { errorText } from './errors'

// 백엔드 호출 모음. 이름·인자는 백엔드 API 가이드(supabase/migrations/API.md)와 맞춥니다.
// 쓰기는 전부 RPC 로만 합니다. 판정(승격·보상·인원)은 서버가 합니다.

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(errorText(error))
  return data
}

export const getSession = async () => (await supabase.auth.getSession()).data.session
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session)).data.subscription
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw new Error(errorText(error))
  return data.session
}
export const signOut = () => supabase.auth.signOut()

export const getNearbyReports = ({ lat, lng, radiusM = 1500 }) =>
  rpc('get_nearby_reports', { p_lat: lat, p_lng: lng, p_radius_m: radiusM, p_place_type: null, p_only_promoted: false, p_include_completed: true })

export const toggleLike = (id) => rpc('toggle_like', { p_report_id: id })
export const acceptReport = (id) => rpc('accept_report', { p_report_id: id })
export const cancelParticipation = (id) => rpc('cancel_participation', { p_report_id: id })
export const getMyProfile = () => rpc('get_my_profile')
export const setNickname = (nickname) => rpc('set_nickname', { p_nickname: nickname })

export const photoUrl = (path) => (path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null)

// 사진 경로는 반드시 `{내 user id}/파일명` 이어야 업로드됩니다.
async function uploadPhoto(userId, name, uri) {
  const body = await (await fetch(uri)).arrayBuffer()
  const path = `${userId}/${name}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, body, { contentType: 'image/jpeg' })
  if (error) throw new Error(errorText(error))
  return path
}

export async function createReport(userId, { title, placeType, description, requiredMembers, shot, address, dong }) {
  const path = await uploadPhoto(userId, 'report', shot.uri)
  return rpc('create_report', {
    p_title: title,
    p_place_type: placeType,
    p_lat: shot.lat,
    p_lng: shot.lng,
    p_address: address,
    p_description: description,
    p_dong: dong,
    p_photo_path: path,
    p_required_members: requiredMembers,
  })
}

export async function submitProof(userId, reportId, before, after) {
  const [b, a] = await Promise.all([uploadPhoto(userId, `${reportId}-before`, before.uri), uploadPhoto(userId, `${reportId}-after`, after.uri)])
  return rpc('submit_proof', { p_report_id: reportId, p_before_path: b, p_after_path: a })
}

// 크루: 백엔드에 아직 없습니다. 생기면 여기만 채우면 됩니다(응답 모양은 local.js 의 crewView 참고).
const notReady = async () => {
  throw new Error(errorText({ message: 'CREW_NOT_READY' }))
}
export const getCrews = async () => []
export const getMyCrew = async () => null
export const createCrew = notReady
export const joinCrew = notReady
export const leaveCrew = notReady

// 포인트 교환 상점. 컬럼 이름은 백엔드 확정 후 맞춥니다(이름·가격 후보를 순서대로 읽음).
export async function getShopItems() {
  const { data, error } = await supabase.from('reward_items').select('*').eq('active', true)
  if (error) throw new Error(errorText(error))
  return (data || []).map((x) => ({ id: x.id, name: x.name ?? x.title, cost: x.cost ?? x.price ?? x.points ?? 0 }))
}
export const redeemItem = (itemId) => rpc('redeem_item', { p_item_id: itemId })
