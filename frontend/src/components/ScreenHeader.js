import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'

export default function ScreenHeader({ title, sub, action, onAction }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={text.h1}>{title}</Text>
        {sub ? <Text style={[text.small, { marginTop: 6 }]}>{sub}</Text> : null}
      </View>
      {action ? (
        <PressScale onPress={onAction} accessibilityRole="button" surface="raisedSm" style={styles.chip}>
          <Text style={[text.chip, { color: colors.fg }]}>{action}</Text>
        </PressScale>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 6 },
  chip: { backgroundColor: colors.panel, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
})
