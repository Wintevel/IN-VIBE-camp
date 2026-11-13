import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { HeartIcon, TabIcon } from './Icons'

// 하루 제한 두 가지를 따로 보여줍니다: 의뢰 해결(3개)과 하트(10개). KST 0시에 다시 채워집니다.
export default function DailyLimits({ profile: p }) {
  if (!p || p.completes_limit == null) return null
  return (
    <View style={styles.row}>
      <Gauge icon={<TabIcon name="board" size={16} color={colors.blue} />} label="남은 해결" used={p.completes_today} limit={p.completes_limit} color={colors.blue} />
      <Gauge icon={<HeartIcon size={16} filled color={colors.red} />} label="남은 하트" used={p.hearts_today} limit={p.hearts_limit} color={colors.red} wide />
    </View>
  )
}

function Gauge({ icon, label, used = 0, limit, color, wide }) {
  const left = Math.max(0, limit - used)
  return (
    <View style={[styles.box, wide && { flex: 1.5 }]} accessibilityLabel={`${label} ${limit}개 중 ${left}개 남음`}>
      <View style={styles.head}>
        {icon}
        <Text style={[text.caption, { flex: 1 }]}>{label}</Text>
        <Text style={[text.num, { fontSize: 15, lineHeight: 18, color: left === 0 ? colors.disabled : colors.fg }]}>
          {left}
          <Text style={{ color: colors.disabled }}>/{limit}</Text>
        </Text>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: limit }, (_, i) => (
          <View key={i} style={[styles.pip, { backgroundColor: i < left ? color : colors.panel2 }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: radius.cardSm, paddingHorizontal: 12, paddingVertical: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { flex: 1, height: 5, borderRadius: 2, transform: [{ skewX: '-20deg' }] },
})
