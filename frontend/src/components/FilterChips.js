import { ScrollView, StyleSheet, Text } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'

export default function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <PressScale key={key} onPress={() => onChange(key)} to={0.92} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.on]}>
            <Text style={[text.chip, { color: on ? colors.ink : colors.sub }]}>{label}</Text>
          </PressScale>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  on: { backgroundColor: colors.fg, borderColor: colors.fg },
})
