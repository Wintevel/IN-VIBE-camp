import { ScrollView, StyleSheet, Text } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'

export default function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <PressScale key={key} onPress={() => onChange(key)} to={0.95} surface="raisedSm" active={on} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.on]}>
            <Text style={[text.chip, { color: on ? colors.ink : colors.sub }]}>{label}</Text>
          </PressScale>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  // 칩은 살짝 솟아 있고, 고른 칩은 흰 면으로 안으로 눌려 있습니다. 그림자가 잘리지 않게 위아래 여유를 둡니다.
  row: { gap: 10, paddingHorizontal: 20, paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  on: { backgroundColor: colors.fg, borderColor: colors.fg },
})
