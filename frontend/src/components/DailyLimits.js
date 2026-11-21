import { StyleSheet, Text, View } from 'react-native'
import { colors, neu, radius, text } from '../theme'
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
      {/* 음각 트랙 안에 남은 칸만 색으로 채워집니다 */}
      <View style={styles.pips}>
        {Array.from({ length: limit }, (_, i) => (
          <View key={i} style={[styles.pip, { backgroundColor: i < left ? color : 'transparent' }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 20 },
  box: { flex: 1, gap: 10, backgroundColor: colors.panel, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, ...neu.raised },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pips: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 99, ...neu.insetSm },
  pip: { flex: 1, height: 6, borderRadius: 3 },
})
