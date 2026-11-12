import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text } from 'react-native'

// 움직임 공통: 빠르게 미끄러져 들어와 살짝 튕기는 등장, 눌림, 숫자 올라가기.
// 기기의 "동작 줄이기"가 켜져 있으면 전부 바로 최종 상태로 보여줍니다.
export const ND = Platform.OS !== 'web'

let reduce = false
try {
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((v) => (reduce = !!v))
    .catch(() => {})
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => (reduce = !!v))
} catch {}
export const reduced = () => reduce

const OFFSET = { right: [40, 0], left: [-40, 0], bottom: [0, 26], top: [0, -26] }

export function Appear({ index = 0, from = 'right', delay = 0, children, style }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current
  useEffect(() => {
    if (reduce) return
    Animated.timing(v, { toValue: 1, duration: 420, delay: delay + Math.min(index, 8) * 60, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }).start()
  }, [v, index, delay])
  const [dx, dy] = OFFSET[from] || OFFSET.right
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// 누르면 살짝 줄었다가 튕겨 돌아오는 Pressable
export function PressScale({ children, style, to = 0.96, ...rest }) {
  const s = useRef(new Animated.Value(1)).current
  const go = (toValue) => Animated.spring(s, { toValue, speed: 40, bounciness: toValue === 1 ? 12 : 0, useNativeDriver: ND }).start()
  return (
    <Pressable onPressIn={() => !reduce && go(to)} onPressOut={() => go(1)} {...rest}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  )
}

// 0에서 값까지 올라가는 숫자
export function CountUp({ value = 0, duration = 700, delay = 0, prefix = '', suffix = '', style }) {
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) return setN(value)
    let raf
    let start
    const tick = (t) => {
      if (start == null) start = t + delay
      const k = Math.max(0, Math.min(1, (t - start) / duration))
      setN(Math.round(value * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay])
  return <Text style={style}>{`${prefix}${n.toLocaleString()}${suffix}`}</Text>
}

// 0→1 로 채워지는 막대
export function Bar({ ratio = 0, color, height = 6, track, style }) {
  const v = useRef(new Animated.Value(reduce ? ratio : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: ratio, duration: reduce ? 0 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [v, ratio])
  return (
    <Animated.View style={[{ height, borderRadius: 99, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
    </Animated.View>
  )
}
