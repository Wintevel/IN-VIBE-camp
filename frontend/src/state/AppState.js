import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CREWS_TO_JOIN, DAILY_LIMIT, QUESTS, REPORTS } from '../data/mock'

// 앱 상태(목 데이터 기반). 서버 연결 후에는 src/api 호출로 바뀝니다.
// 인증·포인트·하루 상한 판정은 서버가 최종 결정하고, 여기 값은 안내용입니다.
const Ctx = createContext(null)

export function AppStateProvider({ children }) {
  const [signedIn, setSignedIn] = useState(false)
  const [accepted, setAccepted] = useState(() => new Set())
  const [cleared, setCleared] = useState(() => new Set(QUESTS.filter((q) => q.clearedAtStart).map((q) => q.id)))
  const [photos, setPhotos] = useState({}) // { [questId]: { before, after } } 촬영 결과
  const [hearted, setHearted] = useState(() => new Set())
  const [reports, setReports] = useState(REPORTS)
  const [clearedToday, setClearedToday] = useState(0)
  const [points, setPoints] = useState(1320)
  const [crew, setCrew] = useState('인하런앤줍') // 없으면 null → 크루 미가입 화면
  const [toast, setToast] = useState(null)
  const [draftPhoto, setDraftPhoto] = useState(null) // 제보하기 화면의 촬영 결과

  const showToast = useCallback((message) => {
    const id = Date.now()
    setToast({ id, message })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2200)
  }, [])

  const value = useMemo(
    () => ({
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
      accepted,
      cleared,
      photos,
      reports,
      hearted,
      points,
      crew,
      toast,
      showToast,
      draftPhoto,
      setDraftPhoto,
      dailyRemaining: Math.max(0, DAILY_LIMIT - clearedToday),
      accept: (id) => {
        setAccepted((s) => new Set(s).add(id))
        showToast('의뢰를 수락했어요. 현장에서 사진을 찍어 주세요')
      },
      setPhoto: (id, slot, shot) => setPhotos((p) => ({ ...p, [id]: { ...p[id], [slot]: shot } })),
      complete: (quest) => {
        if (clearedToday >= DAILY_LIMIT) {
          showToast('오늘은 3개까지 완료할 수 있어요. 내일 다시 도전해요')
          return false
        }
        setCleared((s) => new Set(s).add(quest.id))
        setClearedToday((n) => n + 1)
        setPoints((p) => p + quest.point)
        showToast(`완료했어요. +${quest.point}점, 지도에 구역이 칠해졌어요`)
        return true
      },
      toggleHeart: (id) => {
        const on = hearted.has(id)
        setHearted((s) => {
          const n = new Set(s)
          on ? n.delete(id) : n.add(id)
          return n
        })
        // 하트 1개당 5점은 시안 예시값. 실제 점수는 서버가 계산합니다.
        setReports((rs) => rs.map((r) => (r.id === id ? { ...r, hearts: r.hearts + (on ? -1 : 1), point: r.point + (on ? -5 : 5) } : r)))
      },
      addReport: (r) =>
        setReports((rs) => [{ id: `R-${String(Date.now()).slice(-4)}`, author: '나', dist: '0m', near: true, time: '약 15분', hearts: 0, point: 0, ...r }, ...rs]),
      joinCrew: (name) => {
        setCrew(name)
        showToast(`${name} 크루에 가입했어요`)
      },
      leaveCrew: () => setCrew(null),
      crewsToJoin: CREWS_TO_JOIN,
    }),
    [signedIn, accepted, cleared, photos, reports, hearted, points, crew, toast, clearedToday, draftPhoto, showToast],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
