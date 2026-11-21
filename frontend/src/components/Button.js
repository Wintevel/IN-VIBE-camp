import { Animated, Pressable, StyleSheet, Text } from 'react-native'
import { colors, neu, radius, text } from '../theme'
import { SHADOW_EASE, surfaceStyle, usePress } from './Motion'

// type: primary(파랑) | weak(같은 면 위 파란 글자) | ghost(같은 면 위 보조) | tape(집게표 노랑)
// compact: 내용 너비만큼만 차지하는 작은 버튼
// 뉴모피즘: 평소 솟은 면(양각)이고, 누르면 안으로 패이며(음각) 살짝 줄어듭니다. 웹에서 마우스를 올리면 조금 더 솟습니다.
export default function Button({ type = 'primary', disabled, onPress, children, style, compact }) {
  const v = disabled ? variants.disabled : variants[type] || variants.primary
  const { s, down, over, props } = usePress(0.98)
  const [outer, inner] = split(style)
  // 색이 있는 버튼은 눌렸을 때 안쪽 그림자를 그 색에 맞춰 진하게 씁니다(회색 그림자가 색 위에서 탁해 보여서).
  const shadow = disabled ? neu.insetSm : v.press && down ? { boxShadow: v.press } : surfaceStyle('raised', { down, over })
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} {...(disabled ? null : props)} style={[!compact && !hasFlex(outer) && styles.outer, compact && styles.compactOuter, outer]}>
      <Animated.View style={[styles.base, { backgroundColor: v.bg }, shadow, SHADOW_EASE, compact && styles.compact, inner, { transform: [{ scale: s }] }]}>
        <Text style={[text.button, { color: v.fg }]}>{children}</Text>
      </Animated.View>
    </Pressable>
  )
}

// 바깥(배치: flex·margin·alignSelf)과 안쪽(면: 색·여백·모서리) 스타일을 나눕니다.
const LAYOUT = /^(flex|flexGrow|flexShrink|flexBasis|alignSelf|margin.*|width|minWidth|maxWidth)$/
function split(style) {
  const all = StyleSheet.flatten(style) || {}
  const o = {}
  const i = {}
  for (const k of Object.keys(all)) (LAYOUT.test(k) ? o : i)[k] = all[k]
  // flex: 0 은 "내용 크기 그대로"로 풀어 씁니다(웹에서 flex 단축 속성이 섞이면 버튼이 찌그러져서).
  if (o.flex === 0) {
    delete o.flex
    Object.assign(o, { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' })
  }
  return [o, i]
}
const hasFlex = (o) => ['flex', 'flexGrow', 'flexShrink', 'flexBasis'].some((k) => k in o)

const variants = {
  primary: { bg: colors.blue, fg: colors.onBlue, press: 'inset 4px 4px 10px #2A44B0, inset -4px -4px 10px #4C6EF0' },
  tape: { bg: colors.tape, fg: colors.tapeInk, press: 'inset 4px 4px 10px #D9AE12, inset -4px -4px 10px #FFE680' },
  weak: { bg: colors.panel, fg: colors.blueText },
  ghost: { bg: colors.panel, fg: colors.fg },
  disabled: { bg: colors.panel, fg: colors.disabled },
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  compactOuter: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  compact: { paddingVertical: 12, paddingHorizontal: 18 },
  base: { paddingVertical: 16, borderRadius: radius.cardSm, alignItems: 'center', justifyContent: 'center' },
})
