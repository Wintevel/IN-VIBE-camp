import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { CrewXpIcon, GiftIcon, PointIcon, XpIcon } from './Icons'

// 보상은 종류마다 아이콘을 따로 붙여 보여줍니다. "+" 로 한 줄에 잇지 않습니다.
// 포인트는 하트가 붙은 의뢰에만 있고, 크루 활동 경험치는 크루 의뢰에만 있습니다.
export function rewardParts(r) {
  return [
    r.reward_label ? { kind: 'gift', value: r.reward_value || r.reward_label, label: r.reward_label, name: '제휴 보상' } : null,
    r.reward_points > 0 ? { kind: 'point', value: r.reward_points, name: '포인트' } : null,
    r.reward_xp > 0 ? { kind: 'xp', value: r.reward_xp, name: '경험치' } : null,
    r.reward_crew_xp > 0 ? { kind: 'crew', value: r.reward_crew_xp, name: '크루 경험치' } : null,
  ].filter(Boolean)
}

const ICON = { gift: GiftIcon, point: PointIcon, xp: XpIcon, crew: CrewXpIcon }
const TINT = { gift: colors.tape, point: colors.tape, xp: colors.blue, crew: colors.purple }
const fmt = (v) => (typeof v === 'number' ? v.toLocaleString() : v)

export function RewardIcon({ kind, size }) {
  const I = ICON[kind]
  return <I size={size} />
}

// 카드용: 보상 종류를 알약 하나에 한 줄로 모읍니다(세 종류여도 줄바꿈하지 않음).
// 종류마다 아이콘이 달라 "+" 없이도 따로 읽힙니다. 아주 좁은 폰에서도 하트 칸을 덮지 않게 알약 밖은 잘라 냅니다.
export function RewardPills({ report, style }) {
  const parts = rewardParts(report)
  if (parts.length === 0) return <View style={style} />
  return (
    <View style={[styles.pillsRow, style]}>
      <View style={styles.pill} accessibilityLabel={parts.map((p) => `${p.name} ${fmt(p.value)}`).join(', ')}>
        {parts.map((p) => (
          <View key={p.kind} style={styles.part}>
            <RewardIcon kind={p.kind} size={14} />
            <Text style={[text.num, { fontSize: 13.5, lineHeight: 18, color: TINT[p.kind] }]} numberOfLines={1}>
              {fmt(p.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// 시트·완료 화면용: 종류마다 칸을 나눠 이름과 함께
export function RewardTiles({ parts, style }) {
  return (
    <View style={[styles.tiles, style]}>
      {parts.map((p) => (
        <View key={p.kind} style={[styles.tile, { borderColor: TINT[p.kind] + '55' }]}>
          <RewardIcon kind={p.kind} size={22} />
          <Text style={[text.point, { fontSize: p.kind === 'gift' ? 17 : 22, color: TINT[p.kind] }]} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(p.value)}
          </Text>
          <Text style={[text.caption, { fontSize: 11 }]}>{p.name}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  pillsRow: { flexDirection: 'row', minWidth: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, overflow: 'hidden', backgroundColor: colors.panel2, paddingLeft: 6, paddingRight: 8, paddingVertical: 5, borderRadius: radius.pill },
  part: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6, borderRadius: radius.cardSm, backgroundColor: colors.sheetWeak, borderWidth: 1 },
})
