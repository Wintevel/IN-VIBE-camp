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
