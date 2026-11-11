import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import * as api from '../api'

// 앱 상태. 데이터는 전부 서버(Supabase)에서 옵니다. 예시 데이터는 없습니다.
const Ctx = createContext(null)

// 위치를 못 받을 때 쓰는 기준점(인하대 주변).
const FALLBACK = { lat: 37.452, lng: 126.656 }

export function AppStateProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined: 확인 중, null: 로그아웃
  const [coords, setCoords] = useState(null)
  const [located, setLocated] = useState(false) // 실제 위치를 받았는지
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [photos, setPhotos] = useState({}) // { [reportId]: { before, after } }
  const [draftPhoto, setDraftPhoto] = useState(null)
  const [sheet, setSheet] = useState({ id: null, visible: false })
  const [toast, setToast] = useState(null)
  const coordsRef = useRef(null)

  const showToast = useCallback((message) => {
    const id = Date.now()
    setToast({ id, message })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600)
  }, [])

  useEffect(() => {
    api.getSession().then(setSession).catch(() => setSession(null))
    const sub = api.onAuthChange(setSession)
    return () => sub.unsubscribe()
  }, [])

  const locate = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (perm.status !== 'granted') throw new Error('denied')
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setLocated(true)
      setCoords(c)
      coordsRef.current = c
      return c
    } catch {
      setLocated(false)
      setCoords(FALLBACK)
      coordsRef.current = FALLBACK
      return FALLBACK
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await api.getMyProfile())
    } catch {
      // 프로필은 다음 새로고침에서 다시 시도
    }
  }, [])

  const refresh = useCallback(
    async ({ relocate = false } = {}) => {
      setLoading(true)
      setLoadError(null)
      try {
        const c = !relocate && coordsRef.current ? coordsRef.current : await locate()
        setReports((await api.getNearbyReports(c)) || [])
      } catch (e) {
        setLoadError(e.message)
      } finally {
        setLoading(false)
      }
      loadProfile()
    },
    [locate, loadProfile],
  )

  const userId = session?.user?.id
  useEffect(() => {
    if (userId) refresh({ relocate: true })
    else {
      setReports([])
      setProfile(null)
    }
  }, [userId, refresh])

  const patch = (id, fields) => setReports((rs) => rs.map((r) => (r.id === id ? { ...r, ...fields } : r)))

  // 서버 호출을 감싸 실패하면 안내만 띄웁니다.
  const run = useCallback(
    async (fn) => {
      try {
        return await fn()
      } catch (e) {
        showToast(e.message)
        return null
      }
    },
    [showToast],
  )

  const value = useMemo(
    () => ({
      session,
      userId,
      coords,
      located,
      reports,
      loading,
      loadError,
      profile,
      photos,
      draftPhoto,
      setDraftPhoto,
      toast,
      showToast,
      refresh,
      sheet,
      openSheet: (id) => setSheet({ id, visible: true }),
      hideSheet: () => setSheet((s) => ({ ...s, visible: false })),
      reopenSheet: () => setSheet((s) => (s.id ? { ...s, visible: true } : s)),
      signIn: () => run(api.signInAnonymously),
      signOut: () => api.signOut(),
      setPhoto: (id, slot, shot) => setPhotos((p) => ({ ...p, [id]: { ...p[id], [slot]: shot } })),
      toggleHeart: (id) =>
        run(async () => {
          const d = await api.toggleLike(id)
          patch(id, { liked_by_me: d.liked, like_count: d.like_count, is_promoted: d.is_promoted })
          if (d.just_promoted) refresh() // 포인트가 붙었으니 목록을 새로 받습니다(문구로는 알리지 않음)
        }),
      accept: (id) =>
        run(async () => {
          const d = await api.acceptReport(id)
          patch(id, { i_am_participating: true, status: d.status, current_members: d.current_members, required_members: d.required_members, deadline_at: d.deadline_at })
          showToast(d.status === 'in_progress' ? '의뢰를 수락했어요. 현장에서 사진을 찍어 주세요' : '참여했어요. 인원이 모이면 시작돼요')
          return d
        }),
      cancel: (id) =>
        run(async () => {
          await api.cancelParticipation(id)
          setPhotos((p) => ({ ...p, [id]: undefined }))
          showToast('수락을 취소했어요')
          await refresh()
          return true
        }),
      submitProof: (id) =>
        run(async () => {
          const p = photos[id] || {}
          const d = await api.submitProof(userId, id, p.before, p.after)
          setPhotos((x) => ({ ...x, [id]: undefined }))
          const gain = [d.points_gained ? `+${d.points_gained}점` : null, d.xp_gained ? `+${d.xp_gained}XP` : null].filter(Boolean).join(' · ')
          showToast(`${d.leveled_up ? `레벨 업! Lv.${d.level} · ` : '완료했어요. '}${gain}`)
          await refresh()
          return d
        }),
      createReport: (input) =>
        run(async () => {
          const id = await api.createReport(userId, input)
          await refresh()
          return id ?? true
        }),
      saveNickname: (nickname) =>
        run(async () => {
          await api.setNickname(nickname)
          await loadProfile()
          showToast('닉네임을 바꿨어요')
          return true
        }),
    }),
    [session, userId, coords, located, reports, loading, loadError, profile, photos, draftPhoto, toast, sheet, showToast, refresh, run, loadProfile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
