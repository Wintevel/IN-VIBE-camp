import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text } from 'react-native'

// 움직임 공통: 짧게 미끄러져 들어오는 등장, 눌림, 숫자 올라가기.
// 등장은 튕김(오버슈트) 없이 짧은 거리만 움직입니다. 화면 전환과 겹쳐도 정신없지 않게 하려는 것입니다.
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

const OFFSET = { right: [12, 0], left: [-12, 0], bottom: [0, 10], top: [0, -10] }

export function Appear({ index = 0, from = 'right', delay = 0, children, style }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current
  useEffect(() => {
    if (reduce) return
    Animated.timing(v, { toValue: 1, duration: 260, delay: delay + Math.min(index, 6) * 35, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start()
  }, [v, index, delay])
  const [dx, dy] = OFFSET[from] || OFFSET.right
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.7], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// 누르면 살짝 줄었다가 튕겨 돌아오는 Pressable. 웹에서는 마우스를 올리면 살짝 옅어집니다.
export function PressScale({ children, style, to = 0.96, ...rest }) {
  const { s, hover, props } = usePress(to)
  return (
    <Pressable {...props} {...rest}>
      <Animated.View style={[style, { opacity: hover, transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  )
}

// 눌림(줄었다 돌아옴)과 마우스 올림(웹)을 공통으로 처리하는 훅. Button·PressScale 이 같이 씁니다.
export function usePress(to = 0.96) {
  const s = useRef(new Animated.Value(1)).current
  const hover = useRef(new Animated.Value(1)).current
  const go = (toValue) => Animated.spring(s, { toValue, speed: 40, bounciness: toValue === 1 ? 10 : 0, useNativeDriver: ND }).start()
  const fade = (toValue) => Animated.timing(hover, { toValue, duration: 120, useNativeDriver: ND }).start()
  const props = {
    onPressIn: () => !reduce && go(to),
    onPressOut: () => go(1),
    ...(ND ? null : { onHoverIn: () => fade(0.88), onHoverOut: () => fade(1) }),
  }
  return { s, hover, props }
}

// on 이 켜질 때(하트 누름 등) 한 번 통통 튀는 아이콘 틀. 처음 그릴 때는 움직이지 않습니다.
export function Pop({ on, children, style }) {
  const s = useRef(new Animated.Value(1)).current
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!on || reduce) return
    s.setValue(0.6)
    Animated.spring(s, { toValue: 1, speed: 18, bounciness: 18, useNativeDriver: ND }).start()
  }, [on, s])
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
}

// 아래에서 살짝 올라오며 나타나고, visible 이 꺼지면 내려가며 사라지는 요소(안내·팝업용)
export function FadeUp({ visible = true, children, style, distance = 12, duration = 220 }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: visible ? 1 : 0, duration: reduce ? 0 : visible ? duration : 160, easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: ND }).start()
  }, [visible, v, duration])
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>
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
