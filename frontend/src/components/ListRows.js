import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ListRow({ label, value, onPress, danger }) {
  const Row = onPress ? Pressable : View
  return (
    <Row onPress={onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={[{ fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: danger ? colors.red : colors.fg }]}>{label}</Text>
      {value ? <Text style={text.small}>{value}</Text> : null}
    </Row>
  )
}

export function List({ rows }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={r.label} style={i > 0 && styles.sep}>
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
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
})
