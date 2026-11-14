import { ISSUES, TITLES, levelTitle } from './format'

// 도전과제. 달성하면 이름을 칭호로 쓸 수 있습니다. 조건 숫자는 임시값입니다.
// value(s) 는 지금 값, goal 은 목표. s 는 프로필의 stats 에 level·streak·crew 를 더한 것(statsOf).
export const ACHIEVEMENTS = [
  { id: 'first', name: '첫 줍', desc: '의뢰를 처음 해결하기', goal: 1, value: (s) => s.completed },
  { id: 'ten', name: '열 번 찍어 안 치워지는 길 없다', desc: '의뢰 10건 해결하기', goal: 10, value: (s) => s.completed },
  { id: 'thirty', name: '이쯤 되면 직업', desc: '의뢰 30건 해결하기', goal: 30, value: (s) => s.completed },
  { id: 'heart10', name: '하트 인플루언서', desc: '하트 10개 누르기', goal: 10, value: (s) => s.hearts },
  { id: 'heart50', name: '공감 능력 만렙', desc: '하트 50개 누르기', goal: 50, value: (s) => s.hearts },
  { id: 'report1', name: '동네 파수꾼', desc: '제보를 처음 올리기', goal: 1, value: (s) => s.reports },
  { id: 'report10', name: '프로 제보러', desc: '제보 10건 올리기', goal: 10, value: (s) => s.reports },
  { id: 'streak2', name: '작심삼일 탈출', desc: '2주 연속 활동하기', goal: 2, value: (s) => s.streak },
  { id: 'streak4', name: '한 달째 출근 중', desc: '4주 연속 활동하기', goal: 4, value: (s) => s.streak },
  { id: 'crew', name: '혼자가 아니야', desc: '크루에 들어가기', goal: 1, value: (s) => (s.crew ? 1 : 0) },
  { id: 'places', name: '동네 한 바퀴', desc: '모든 장소 종류에서 한 번씩 해결하기', goal: 5, value: (s) => Object.keys(s.places).length },
  { id: 'issues', name: '편식 없는 집게', desc: '모든 문제 유형을 한 번씩 해결하기', goal: 5, value: (s) => Object.keys(s.issues).length },
  { id: 'reward', name: '상품권 사냥꾼', desc: '제휴 보상을 처음 받기', goal: 1, value: (s) => s.rewards },
]

// 도감: 내가 치워 본 장소 종류와 문제 유형. 한 번이라도 해결하면 채워집니다.
export const DEX_PLACES = [
  ['drain', '빗물받이', '비 오는 날의 숨은 영웅'],
  ['bus_stop', '버스정류장', '기다림이 남긴 흔적'],
  ['park', '공원', '돗자리가 떠난 자리'],
  ['street', '골목·거리', '꽁초의 주 서식지'],
  ['etc', '기타', '분류를 거부한 곳'],
]
const ISSUE_NOTES = { litter: '가장 흔한 야생 쓰레기', dumping: '밤사이 나타나는 봉투', bin: '과식한 쓰레기통', drain: '낙엽과 꽁초의 합작', graffiti: '허락받지 않은 작품' }
export const DEX_ISSUES = ISSUES.map(([key, label]) => [key, label, ISSUE_NOTES[key] || ''])

const EMPTY = { completed: 0, hearts: 0, reports: 0, rewards: 0, places: {}, issues: {} }
export const statsOf = (profile, myCrew) => ({ ...EMPTY, ...(profile?.stats || {}), level: profile?.level || 1, streak: profile?.streak_weeks || 0, crew: !!myCrew })

export const progress = (s) => ACHIEVEMENTS.map((a) => ({ ...a, now: Math.min(a.goal, a.value(s)), done: a.value(s) >= a.goal }))
export const dexCount = (s) => Object.keys(s.places).length + Object.keys(s.issues).length
export const DEX_TOTAL = DEX_PLACES.length + DEX_ISSUES.length

// 고를 수 있는 칭호: 지금 레벨까지의 레벨 칭호 + 달성한 도전과제 이름. 잠긴 것도 조건과 함께 보여 줍니다.
export function titleOptions(s) {
  const levels = [...TITLES].reverse().map(([min, label]) => ({ key: `lv:${min}`, label, open: s.level >= min, how: `레벨 ${min}` }))
  const feats = progress(s).map((a) => ({ key: `ach:${a.id}`, label: a.name, open: a.done, how: a.desc }))
  return [...levels, ...feats]
}
// 화면에 보일 칭호. 고른 칭호가 없거나 더는 쓸 수 없으면 지금 레벨 칭호.
export function titleText(profile, myCrew) {
  const s = statsOf(profile, myCrew)
  const picked = profile?.title_key && titleOptions(s).find((t) => t.key === profile.title_key && t.open)
  return picked ? picked.label : levelTitle(s.level)
}
