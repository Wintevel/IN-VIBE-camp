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

// 카드용: 아이콘 + 숫자 알약을 나란히
export function RewardPills({ report, style }) {
  return (
    <View style={[styles.pills, style]}>
      {rewardParts(report).map((p) => (
        <View key={p.kind} style={styles.pill} accessibilityLabel={`${p.name} ${fmt(p.value)}`}>
          <RewardIcon kind={p.kind} size={16} />
          <Text style={[text.num, { fontSize: 15, lineHeight: 18, color: TINT[p.kind] }]}>{fmt(p.value)}</Text>
        </View>
      ))}
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
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.panel2, paddingLeft: 6, paddingRight: 9, paddingVertical: 4, borderRadius: radius.pill },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6, borderRadius: radius.cardSm, backgroundColor: colors.sheetWeak, borderWidth: 1 },
})
