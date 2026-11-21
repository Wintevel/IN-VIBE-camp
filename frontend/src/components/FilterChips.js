import { ScrollView, StyleSheet, Text } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'

export default function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <PressScale key={key} onPress={() => onChange(key)} to={0.95} surface="raisedSm" active={on} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.chip}>
            <Text style={[text.chip, { color: on ? colors.blueText : colors.sub }]}>{label}</Text>
          </PressScale>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  // 그림자가 잘리지 않게 위아래에 여유를 둡니다.
  row: { gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.panel },
})
