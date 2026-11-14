import { hasSupabase } from '../lib/supabase'
import * as local from './local'
import * as remote from './remote'

// 서버 주소(.env 의 EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)가 있으면 Supabase, 없으면 기기 저장소로 동작합니다.
// 두 구현은 같은 함수·같은 응답 모양을 가지므로 화면 코드는 바뀌지 않습니다.
export const isLocal = !hasSupabase
const impl = hasSupabase ? remote : local

export const { getSession, onAuthChange, signInAnonymously, signOut, getNearbyReports, toggleLike, acceptReport, cancelParticipation, getMyProfile, setNickname, photoUrl, createReport, submitProof, getCrews, getMyCrew, getShopItems, redeemItem, createCrew, joinCrew, leaveCrew } = impl
// 기기 저장소 모드에서만 있는 기능: 이 기기의 기록 지우기
export const resetLocal = isLocal ? local.resetLocal : null
// 서버 모드에서만 있는 기능: 이메일 로그인, 가입 동의 저장, 인증 사진을 찍자마자 올리기
export const authApi = isLocal ? null : { signIn: remote.signInEmail, signUp: remote.signUpEmail, saveConsent: remote.saveConsent, getConsent: remote.getConsent }
export const uploadProofPhoto = isLocal ? null : remote.uploadProofPhoto
// 아래 묶음은 두 구현이 같은 모양으로 갖고 있습니다.
export const cosmeticsApi = { list: impl.getCosmetics, buy: impl.buyCosmetic, equip: impl.equipCosmetic }
export const profileApi = { setAvatar: impl.setAvatar, setTitle: impl.setTitle, claimFeat: impl.claimFeat }
export const socialApi = { mark: impl.setMark, notices: impl.getNotices, answer: impl.answerNotice, flag: impl.reportAbuse }
export { errorText } from './errors'
