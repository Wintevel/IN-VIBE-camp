import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useFrameSize } from '../lib/frame'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'
import { ND, reduced } from './Motion'

// 만화의 속도선처럼 기울어진 줄이 화면을 가로지르며 다음 화면으로 넘깁니다(의뢰 수락 → 인증 화면).
// 줄이 화면을 덮은 순간에 화면을 바꿔서, 걷히면 새 화면이 보입니다.
const LINES = Array.from({ length: 16 }, (_, i) => ({
  top: (i * 6.4 + ((i * 37) % 5)) % 100, // 세로 위치(%)
  h: 6 + ((i * 13) % 4) * 9, // 굵기
  w: 0.5 + ((i * 7) % 5) * 0.16, // 길이(화면 너비 배수)
  lag: ((i * 5) % 7) / 7, // 출발 지연
  color: i % 5 === 0 ? colors.tapeText : i % 3 === 0 ? colors.blue : colors.fg,
}))
const DURATION = 1150 // 2026-11-22: 620ms 는 너무 짧다는 의견으로 늘림. "출동!"이 가운데 머무는 시간이 길어집니다.

export default function SpeedDash() {
  const { dash, endDash } = useApp()
  const { width } = useFrameSize()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!dash) return
    if (reduced()) {
      dash.then?.()
      endDash()
      return
    }
    v.setValue(0)
    const mid = setTimeout(() => dash.then?.(), DURATION * 0.45)
    Animated.timing(v, { toValue: 1, duration: DURATION, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }).start(() => endDash())
    return () => clearTimeout(mid)
  }, [dash, v, endDash])
  if (!dash) return null
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink, opacity: v.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.96, 0.96, 0] }) }]} />
      <View style={styles.tilt}>
        {LINES.map((l, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: `${l.top}%`,
              height: l.h,
              width: width * l.w,
              borderRadius: l.h,
              backgroundColor: l.color,
              opacity: l.color === colors.fg ? 0.85 : 1,
              transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [width * (1.3 + l.lag), -width * (1.6 + l.lag)] }) }],
            }}
          />
        ))}
      </View>
      <Animated.Text style={[text.h1, styles.word, { opacity: v.interpolate({ inputRange: [0, 0.16, 0.74, 0.9], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 0.18, 0.74, 1], outputRange: [140, 0, -16, -180] }) }, { scale: v.interpolate({ inputRange: [0, 0.18, 0.26, 0.74], outputRange: [1.25, 0.94, 1.04, 1] , extrapolate: 'clamp' }) }, { skewX: '-12deg' }] }]}>출동!</Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, zIndex: 60, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tilt: { ...StyleSheet.absoluteFillObject, transform: [{ rotate: '-8deg' }, { scale: 1.3 }] },
  word: { fontSize: 64, lineHeight: 76, color: colors.tapeText, letterSpacing: 2 },
})
