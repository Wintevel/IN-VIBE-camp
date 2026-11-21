import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, neu, radius, text } from '../theme'

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ListRow({ label, value, onPress, danger, icon }) {
  const Row = onPress ? Pressable : View
  return (
    <Row onPress={onPress} style={onPress ? ({ pressed, hovered }) => [styles.row, pressed ? [neu.inset, { backgroundColor: colors.panel2 }] : hovered ? { backgroundColor: 'rgba(255,255,255,0.35)' } : null] : styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon}
        <Text style={[{ ...font.bodyMedium, fontSize: 14, lineHeight: 20, color: danger ? colors.red : colors.fg }]}>{label}</Text>
      </View>
      {value ? <Text style={text.small}>{value}</Text> : null}
    </Row>
  )
}

export function List({ rows }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={r.key ?? r.label} style={i > 0 && styles.sep}>
          <ListRow {...r} />
        </View>
      ))}
    </Card>
  )
}

export function SectionTitle({ children }) {
  return <Text style={[text.section, { marginTop: 4 }]}>{children}</Text>
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 18, ...neu.raised },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 15 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
})
