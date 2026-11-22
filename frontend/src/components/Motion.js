import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text } from 'react-native'
import { colors, neu } from '../theme'

// 움직임 공통: 살짝 떠오르는 등장, 눌림(솟은 면 → 패인 면), 숫자 올라가기.
// 등장은 짧은 거리만 움직이며 0.97 → 1 로 커집니다. 눌림은 솟은 면의 그림자가 안쪽으로 뒤집히고, 웹은 그 바뀜을 CSS 전환으로 잇습니다.
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

const OFFSET = { right: [10, 4], left: [-10, 4], bottom: [0, 12], top: [0, -10] }

export function Appear({ index = 0, from = 'right', delay = 0, children, style }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current
  useEffect(() => {
    if (reduce) return
    Animated.timing(v, { toValue: 1, duration: 380, delay: delay + Math.min(index, 6) * 45, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND }).start()
  }, [v, index, delay])
  const [dx, dy] = OFFSET[from] || OFFSET.right
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.7], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// 눌림 효과가 있는 Pressable.
// surface 를 주면 뉴모피즘 면이 됩니다: 평소 양각(raised/raisedSm), 마우스 올리면 조금 더 솟고, 누르는 동안·active(선택됨)면 음각으로 패입니다.
export function PressScale({ children, style, to = 0.95, surface, active, ...rest }) {
  const { down, over, props, motion, sheen } = usePress(to)
  const r = StyleSheet.flatten(style)?.borderRadius
  return (
    <Pressable {...props} {...rest}>
      <Animated.View style={[style, surface ? [surfaceStyle(surface, { down, over, active }), SHADOW_EASE] : null, motion]}>
        {children}
        <Sheen v={sheen} radius={r} />
      </Animated.View>
    </Pressable>
  )
}

// 마우스를 올리거나 손가락이 닿으면 면 위에 얇게 밝은 막이 깔립니다(누르는 순간 조금 더 밝게).
export function Sheen({ v, radius }) {
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: '#FFFFFF', opacity: v }]} />
}

// 면 상태 → 그림자. raised(큰 면)는 눌리면 inset, raisedSm(작은 면)은 insetSm.
export function surfaceStyle(kind = 'raised', { down, over, active } = {}) {
  const small = kind === 'raisedSm'
  if (down || active) return small ? neu.insetSm : neu.inset
  if (over && !small) return neu.raisedHi
  return small ? neu.raisedSm : neu.raised
}
// 웹: 그림자가 바뀔 때 끊기지 않게 이어 줍니다(네이티브는 무시).
export const SHADOW_EASE = Platform.OS === 'web' ? { transitionProperty: 'box-shadow, background-color', transitionDuration: '180ms', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' } : null

// 눌림·마우스 올림을 공통으로 처리하는 훅. Button·PressScale 이 같이 씁니다.
// 마우스를 올리면(웹) 살짝 떠오르며 커지고, 누르면 쑥 들어갔다가 놓을 때 통 튀어 돌아옵니다. 손가락이 닿는 순간에는 밝은 막이 번쩍입니다.
export function usePress(to = 0.96) {
  const s = useRef(new Animated.Value(1)).current
  const lift = useRef(new Animated.Value(0)).current
  const sheen = useRef(new Animated.Value(0)).current
  const [down, setDown] = useState(false)
  const [over, setOver] = useState(false)
  const overRef = useRef(false)
  // 큰 카드는 조금만, 작은 칩은 조금 더 떠오릅니다.
  const up = Math.min(1.04, 1 + (1 - to) * 0.5)
  const spring = (v, toValue, o) => Animated.spring(v, { toValue, useNativeDriver: ND, ...o }).start()
  const fade = (toValue, duration) => Animated.timing(sheen, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start()
  const props = {
    onPressIn: () => {
      setDown(true)
      if (reduce) return
      spring(s, to, { speed: 60, bounciness: 0 })
      spring(lift, 0, { speed: 60, bounciness: 0 })
      fade(0.12, 70)
    },
    onPressOut: () => {
      setDown(false)
      const on = overRef.current
      spring(s, on ? up : 1, { speed: 14, bounciness: 14 })
      spring(lift, on ? 1 : 0, { speed: 14, bounciness: 10 })
      fade(on ? 0.05 : 0, 260)
    },
    ...(ND
      ? null
      : {
          onHoverIn: () => {
            overRef.current = true
            setOver(true)
            if (reduce) return
            spring(s, up, { speed: 22, bounciness: 8 })
            spring(lift, 1, { speed: 22, bounciness: 8 })
            fade(0.05, 140)
          },
          onHoverOut: () => {
            overRef.current = false
            setOver(false)
            spring(s, 1, { speed: 22, bounciness: 4 })
            spring(lift, 0, { speed: 22, bounciness: 4 })
            fade(0, 180)
          },
        }),
  }
  const motion = { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: s }] }
  return { s, lift, sheen, down, over, props, motion }
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

// 0→1 로 채워지는 막대. 트랙은 살짝 패인 홈이고, 채움은 그 안에서 차오릅니다.
export function Bar({ ratio = 0, color, height = 6, track, style }) {
  const v = useRef(new Animated.Value(reduce ? ratio : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: ratio, duration: reduce ? 0 : 900, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start()
  }, [v, ratio])
  return (
    <Animated.View style={[{ height, borderRadius: 99, backgroundColor: track || colors.panel2, overflow: 'hidden' }, neu.insetSm, style]}>
      <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
    </Animated.View>
  )
}
