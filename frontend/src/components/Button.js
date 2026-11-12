import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, text } from '../theme'

// type: primary(파랑) | weak(연한 파랑) | ghost(어두운 면 위 보조)
// compact: 내용 너비만큼만 차지하는 작은 버튼
export default function Button({ type = 'primary', disabled, onPress, children, style, compact }) {
  const v = disabled ? variants.disabled : variants[type]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, { backgroundColor: v.bg, opacity: pressed ? 0.85 : 1 }, compact && styles.compact, style]}
    >
      <Text style={[text.button, { color: v.fg }]}>{children}</Text>
    </Pressable>
  )
}

const variants = {
  primary: { bg: colors.blue, fg: colors.onBlue },
  weak: { bg: colors.blueWeak, fg: colors.blue },
  ghost: { bg: colors.panel2, fg: colors.fg },
  disabled: { bg: colors.sheetLine, fg: colors.disabled },
}

const styles = StyleSheet.create({
  compact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingVertical: 12, paddingHorizontal: 16 },
  base: { flex: 1, paddingVertical: 16, borderRadius: radius.cardSm, alignItems: 'center', justifyContent: 'center' },
})
