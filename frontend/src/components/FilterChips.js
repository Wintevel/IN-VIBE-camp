import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'
import useDragScroll from './useDragScroll'

// wrap: 입력 화면처럼 모든 선택지를 한눈에 봐야 할 때 가로 스크롤 대신 줄바꿈으로 늘어놓습니다.
export default function FilterChips({ options, value, onChange, wrap }) {
  const drag = useDragScroll()
  const chips = options.map(([key, label]) => {
    const on = key === value
    return (
      <PressScale key={key} onPress={() => onChange(key)} to={0.95} surface={on ? undefined : 'raisedSm'} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.on]}>
        <Text style={[text.chip, { color: on ? colors.ink : colors.sub }]}>{label}</Text>
      </PressScale>
    )
  })
  if (wrap) return <View style={styles.wrap}>{chips}</View>
  return (
    <ScrollView ref={drag} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {chips}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  // 안 고른 칩만 살짝 솟아 있고, 고른 칩은 그림자 없는 흰 면입니다. 그림자가 잘리지 않게 위아래 여유를 둡니다.
  row: { gap: 10, paddingHorizontal: 20, paddingVertical: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  on: { backgroundColor: colors.fg, borderColor: colors.fg },
})
