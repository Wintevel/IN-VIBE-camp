import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import * as api from '../api'

// 앱 상태. 데이터는 전부 서버(Supabase)에서 옵니다. 예시 데이터는 없습니다.
const Ctx = createContext(null)

// 위치를 못 받을 때 쓰는 기준점(인하대 주변).
const FALLBACK = { lat: 37.452, lng: 126.656 }
const SESSION_WAIT_MS = 5000
const HEART_UNDO_MS = 4000 // 하트를 누른 뒤 되돌릴 수 있는 시간

export function AppStateProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined: 확인 중, null: 로그아웃
  const [coords, setCoords] = useState(null)
  const [located, setLocated] = useState(false) // 실제 위치를 받았는지
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [crews, setCrews] = useState([])
  const [myCrew, setMyCrew] = useState(null)
  const [shop, setShop] = useState([])
  const [celebrate, setCelebrate] = useState(null) // 의뢰 완료 연출에 쓸 보상 정보
  const [photos, setPhotos] = useState({}) // { [reportId]: { before, after } }
  const [draftPhoto, setDraftPhoto] = useState(null)
  const [sheet, setSheet] = useState({ id: null, visible: false })
  const [toast, setToast] = useState(null)
  const coordsRef = useRef(null)

  const pendingHeart = useRef(null) // 되돌리기 시간 안에 있는 하트 { id, timer, commit }

  // action: { label, onPress } 를 주면 안내 안에 버튼이 붙습니다.
  const showToast = useCallback((message, { action = null, ms = 2600 } = {}) => {
    const id = Date.now() + Math.random()
    setToast({ id, message, action })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), ms)
  }, [])

  useEffect(() => {
    // 로그인 확인이 끝나지 않으면 빈 화면에 멈추므로, 몇 초 안에 답이 없으면 로그인 화면을 보여 줍니다.
    const giveUp = setTimeout(() => setSession((s) => (s === undefined ? null : s)), SESSION_WAIT_MS)
    api.getSession().then(setSession).catch(() => setSession(null))
    const sub = api.onAuthChange(setSession)
    return () => {
      clearTimeout(giveUp)
      sub.unsubscribe()
    }
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
      setCrews((await api.getCrews()) || [])
      setMyCrew(await api.getMyCrew())
      setShop((await api.getShopItems()) || [])
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
      setCrews([])
      setMyCrew(null)
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
      crews,
      myCrew,
      shop,
      celebrate,
      dismissCelebrate: () => setCelebrate(null),
      localMode: api.isLocal,
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
      resetLocal: api.resetLocal ? () => api.resetLocal() : null,
      setPhoto: (id, slot, shot) => setPhotos((p) => ({ ...p, [id]: { ...p[id], [slot]: shot } })),
      // 하트는 취소할 수 없습니다. 누른 뒤 몇 초 동안만 되돌릴 수 있고, 그 시간이 지나야 서버에 보내 확정합니다.
      // 되돌린 하트는 서버에 가지 않으므로 포인트·하트 수·하루 횟수에 아무 영향이 없습니다.
      toggleHeart: (id) => {
        const r = reports.find((x) => x.id === id)
        if (!r) return
        if (r.liked_by_me) return showToast(api.errorText({ message: 'HEART_FINAL' }))
        if (profile && profile.hearts_today >= profile.hearts_limit) return showToast(api.errorText({ message: 'HEART_DAILY_LIMIT' }))
        pendingHeart.current?.commit() // 앞서 누른 하트가 대기 중이면 먼저 확정
        const before = { liked_by_me: false, like_count: r.like_count ?? 0 }
        patch(id, { liked_by_me: true, like_count: before.like_count + 1 })
        const commit = () => {
          const p = pendingHeart.current
          if (!p || p.id !== id) return
          clearTimeout(p.timer)
          pendingHeart.current = null
          run(async () => {
            try {
              const d = await api.toggleLike(id)
              patch(id, { liked_by_me: d.liked, like_count: d.like_count, is_promoted: d.is_promoted })
              if (d.points_gained) showToast(`하트를 눌러 +${d.points_gained}P 받았어요`)
              refresh() // 하트에 따라 보상이 달라지므로 목록을 새로 받습니다
            } catch (e) {
              patch(id, before)
              throw e
            }
          })
        }
        const undo = () => {
          const p = pendingHeart.current
          if (!p || p.id !== id) return
          clearTimeout(p.timer)
          pendingHeart.current = null
          patch(id, before)
          showToast('하트를 되돌렸어요')
        }
        pendingHeart.current = { id, commit, timer: setTimeout(commit, HEART_UNDO_MS) }
        showToast('하트를 눌렀어요. 곧 확정돼요', { action: { label: '되돌리기', onPress: undo }, ms: HEART_UNDO_MS })
      },
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
          const d = await api.submitProof(userId, id, p.before, p.after || p.before)
          setPhotos((x) => ({ ...x, [id]: undefined }))
          setCelebrate(d)
          await refresh()
          return d
        }),
      createReport: (input) =>
        run(async () => {
          const id = await api.createReport(userId, input)
          await refresh()
          return id ?? true
        }),
      createCrew: (input) =>
        run(async () => {
          await api.createCrew(input)
          await loadProfile()
          showToast(`${input.name} 크루를 만들었어요`)
          return true
        }),
      joinCrew: (crew) =>
        run(async () => {
          await api.joinCrew(crew.id)
          await loadProfile()
          showToast(`${crew.name} 크루에 가입했어요`)
          return true
        }),
      leaveCrew: () =>
        run(async () => {
          await api.leaveCrew()
          await loadProfile()
          showToast('크루에서 나왔어요')
          return true
        }),
      redeem: (item) =>
        run(async () => {
          const d = await api.redeemItem(item.id)
          await loadProfile()
          showToast(`${item.name} 교환 완료 · 쿠폰 ${d.coupon_code}`)
          return d
        }),
      saveNickname: (nickname) =>
        run(async () => {
          await api.setNickname(nickname)
          await loadProfile()
          showToast('닉네임을 바꿨어요')
          return true
        }),
    }),
    [session, userId, coords, located, reports, loading, loadError, profile, crews, myCrew, shop, celebrate, photos, draftPhoto, toast, sheet, showToast, refresh, run, loadProfile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
