import { hasSupabase } from '../lib/supabase'
import * as local from './local'
import * as remote from './remote'

// 서버 주소(.env 의 EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)가 있으면 Supabase, 없으면 기기 저장소로 동작합니다.
// 두 구현은 같은 함수·같은 응답 모양을 가지므로 화면 코드는 바뀌지 않습니다.
export const isLocal = !hasSupabase
const impl = hasSupabase ? remote : local

export const { getSession, onAuthChange, signInAnonymously, signOut, getNearbyReports, toggleLike, acceptReport, cancelParticipation, getMyProfile, setNickname, photoUrl, createReport, submitProof } = impl
export { errorText } from './errors'
