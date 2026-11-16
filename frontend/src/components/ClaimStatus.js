import { StyleSheet, Text, View } from 'react-native'
import { remain } from '../lib/format'
import { colors, radius, text } from '../theme'
import { Appear, Bar } from './Motion'
import { RewardIcon } from './Reward'

// 인증을 올린 뒤의 상태: 확인 대기(이웃 투표·업체 확인), 운영진 검토, 최근 반려.
// 포인트·경험치는 확인이 끝나야 들어오므로 "받을 예정"으로만 보여 줍니다.
const THRESHOLD = 50 // 승인 기준(%). 서버 설정값과 같은 숫자이고 판정은 서버가 합니다.

export default function ClaimStatus({ claims }) {
  if (!claims || claims.length === 0) return null
  const waiting = claims.filter((c) => c.status !== 'rejected' && c.status !== 'approved').length
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.mark} />
        <Text style={text.section}>확인 중인 인증</Text>
        {waiting > 0 ? <Text style={[text.num, { fontSize: 15, color: colors.tape }]}>{waiting}</Text> : null}
      </View>
      {claims.map((c, i) => (
        <Appear key={c.claim_id} index={i}>
          <Row c={c} />
        </Appear>
      ))}
    </View>
  )
}

function Row({ c }) {
  const rejected = c.status === 'rejected'
  // 개편(7-1): 표본에 뽑히지 않은 인증은 바로 지급되고, 이의 기간 동안만 이 목록에 남습니다.
  const paid = c.status === 'approved'
  const staff = c.status === 'staff_review'
  const partner = c.kind === 'partner'
  const pct = Math.round(Number(c.ok_percent) || 0)
  const [label, color] = paid ? ['지급됨', colors.green] : rejected ? ['반려', colors.red] : staff ? ['운영진 검토 중', colors.purple] : ['확인 대기', colors.tape]
  let sub
  if (paid) sub = `이웃이 이의를 남기면 운영진이 다시 확인해요${c.dispute_until ? ` · 이의 기간 ${remain(c.dispute_until)}` : ''}`
  else if (rejected) sub = c.reject_reason || '확인을 통과하지 못했어요. 의뢰는 다시 열렸어요'
  else if (staff) sub = '확인해 줄 이웃이 없어 운영진이 직접 보고 있어요'
  else if (partner) sub = '의뢰한 업체 담당자가 확인하면 보상이 지급돼요'
  else sub = `이웃 ${c.voters || 0}명 중 ${c.answered || 0}명이 답했어요${c.verify_deadline ? ` · ${remain(c.verify_deadline)}` : ''}`
  return (
    <View style={[styles.card, rejected && { borderColor: colors.line }]} accessibilityLabel={`${c.title} ${label}`}>
      <View style={styles.top}>
        <Text style={[text.cardTitle, { flex: 1 }]} numberOfLines={1}>
          {c.title}
        </Text>
        <Text style={[text.chip, { color }]}>{label}</Text>
      </View>
      {!paid && !rejected && !staff && !partner ? (
        <View style={styles.vote}>
          <Bar ratio={Math.min(1, pct / THRESHOLD)} color={colors.green} track={colors.panel2} style={{ flex: 1 }} />
          <Text style={[text.caption, { color: colors.fg }]}>
            치워졌어요 {pct}% / {THRESHOLD}%
          </Text>
        </View>
      ) : null}
      <Text style={text.small}>{sub}</Text>
      {!paid && !rejected && (c.points_pending > 0 || c.xp_pending > 0) ? (
        <View style={styles.pending}>
          <Text style={text.caption}>확인되면</Text>
          {c.points_pending > 0 ? (
            <View style={styles.pill}>
              <RewardIcon kind="point" size={14} />
              <Text style={[text.chip, { color: colors.tape }]}>{c.points_pending}</Text>
            </View>
          ) : null}
          {c.xp_pending > 0 ? (
            <View style={styles.pill}>
              <RewardIcon kind="xp" size={14} />
              <Text style={[text.chip, { color: colors.blue }]}>{c.xp_pending}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 6, height: 16, backgroundColor: colors.tape, transform: [{ skewX: '-16deg' }] },
  card: { gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.tape, borderRadius: radius.lg, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vote: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
