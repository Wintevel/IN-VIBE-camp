import { Animated, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, text } from '../theme'
import { usePress } from './Motion'

const APressable = Animated.createAnimatedComponent(Pressable)

// type: primary(파랑) | weak(연한 파랑) | ghost(어두운 면 위 보조)
// compact: 내용 너비만큼만 차지하는 작은 버튼
// 누르면 살짝 줄었다가 돌아오고, 웹에서는 마우스를 올리면 옅어집니다.
export default function Button({ type = 'primary', disabled, onPress, children, style, compact }) {
  const v = disabled ? variants.disabled : variants[type]
  const { s, hover, props } = usePress(0.97)
  return (
    <APressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(disabled ? null : props)}
      style={[styles.base, { backgroundColor: v.bg, opacity: hover, transform: [{ scale: s }] }, compact && styles.compact, style]}
    >
      <Text style={[text.button, { color: v.fg }]}>{children}</Text>
    </APressable>
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
