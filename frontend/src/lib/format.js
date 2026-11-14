export const code = (id) => `Q-${String(id).padStart(4, '0')}`
export const dist = (m) => (m == null ? '' : m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`)
export const isCrew = (r) => (r.required_members || 1) > 1

// 남은 인증 시간
export function remain(deadline) {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return '시간 지남'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`
}

export const isPartner = (r) => r.kind === 'partner'

// 보상 표시: 제휴 의뢰는 제휴처 보상, 포인트가 붙은 의뢰는 포인트, 아니면 경험치
export const reward = (r) => (r.reward_value ? { value: r.reward_value, unit: r.reward_unit } : r.reward_points > 0 ? { value: r.reward_points, unit: 'POINT' } : { value: r.reward_xp ?? 0, unit: 'XP' })

// 제보 유형. 환경 미화 범위 안에서만 나눕니다. 값은 서버와 같아야 합니다.
export const ISSUES = [
  ['litter', '쓰레기'],
  ['dumping', '무단 투기'],
  ['bin', '넘친 쓰레기통'],
  ['drain', '빗물받이 막힘'],
  ['graffiti', '낙서'],
]
export const issueLabel = (key) => (ISSUES.find(([k]) => k === key) || [])[1] || null

// 레벨 칭호. 업적 이름처럼 가볍게 붙입니다(프론트 표시용, 서버 값과 무관).
const TITLES = [
  [20, '줍다 보니 여기까지 옴'],
  [15, '전설의 줍줍러'],
  [12, '지구가 감사 인사 보냄'],
  [10, '걸어 다니는 분리수거장'],
  [9, '환경미화원님이 알아봄'],
  [8, '골목길 고인물'],
  [7, '쓰레기가 먼저 피해 감'],
  [6, '이 구역의 청소 담당'],
  [5, '빗물받이가 나를 부른다'],
  [4, '꽁초와의 전쟁'],
  [3, '집게를 든 자'],
  [2, '허리 숙이기 장인'],
  [1, '일단 주워 봄'],
]
export const levelTitle = (level) => (TITLES.find(([min]) => level >= min) || TITLES[TITLES.length - 1])[1]

// 이웃 상태 버튼. 하트 옆에 나란히 둡니다(1인 1개, 바꿀 수 있음).
export const MARK_LABELS = [
  ['still', '아직 있어요'],
  ['gone', '치워졌어요'],
  ['worse', '더 늘었어요'],
]
// 신고 사유
export const FLAG_REASONS = [
  ['photo', '부적절한 사진'],
  ['fake', '장난·허위 제보'],
  ['privacy', '얼굴·번호판 노출'],
  ['danger', '위험한 장소'],
  ['etc', '기타'],
]
