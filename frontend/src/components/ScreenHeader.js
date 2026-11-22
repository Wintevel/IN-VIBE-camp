import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { PressScale } from './Motion'

// right 를 주면 action 칩 대신 그 요소를 오른쪽에 둡니다(의뢰판의 새로고침·제보하기).
export default function ScreenHeader({ title, sub, action, onAction, right }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={text.h1}>{title}</Text>
        {sub ? <Text style={[text.small, { marginTop: 6 }]}>{sub}</Text> : null}
      </View>
      {right || null}
      {action && !right ? (
        <PressScale onPress={onAction} accessibilityRole="button" surface="raisedSm" style={styles.chip}>
          <Text style={[text.chip, { color: colors.fg }]}>{action}</Text>
        </PressScale>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 6 },
  chip: { backgroundColor: colors.panel2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
})
