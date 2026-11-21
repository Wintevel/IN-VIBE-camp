import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text } from 'react-native'
import { neu } from '../theme'

// 움직임 공통: 아래에서 떠오르는 등장, 눌림(양각 → 음각), 숫자 올라가기.
// 뉴모피즘 개편: 등장은 면이 바탕에서 살짝 떠오르듯(아래 → 제자리, 0.97 → 1) 짧게, 눌림은 솟은 면이 안으로 패이듯 그림자가 뒤집힙니다.
// 웹은 그림자 바뀜을 CSS 전환으로 부드럽게 잇습니다.
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
export function PressScale({ children, style, to = 0.97, surface, active, ...rest }) {
  const { s, hover, down, over, props } = usePress(to)
  return (
    <Pressable {...props} {...rest}>
      <Animated.View style={[style, surface ? [surfaceStyle(surface, { down, over, active }), SHADOW_EASE] : null, { opacity: surface ? 1 : hover, transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  )
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

// 눌림(줄었다 돌아옴)·눌린 상태(down)·마우스 올림(over, 웹)을 공통으로 처리하는 훅. Button·PressScale 이 같이 씁니다.
export function usePress(to = 0.97) {
  const s = useRef(new Animated.Value(1)).current
  const hover = useRef(new Animated.Value(1)).current
  const [down, setDown] = useState(false)
  const [over, setOver] = useState(false)
  const go = (toValue) => Animated.spring(s, { toValue, speed: 40, bounciness: toValue === 1 ? 8 : 0, useNativeDriver: ND }).start()
  const fade = (toValue) => Animated.timing(hover, { toValue, duration: 120, useNativeDriver: ND }).start()
  const props = {
    onPressIn: () => {
      setDown(true)
      if (!reduce) go(to)
    },
    onPressOut: () => {
      setDown(false)
      go(1)
    },
    ...(ND
      ? null
      : {
          onHoverIn: () => {
            setOver(true)
            fade(0.92)
          },
          onHoverOut: () => {
            setOver(false)
            fade(1)
          },
        }),
  }
  return { s, hover, down, over, props }
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

// 0→1 로 채워지는 막대. 트랙은 음각(패인 홈), 채움은 그 안에서 차오릅니다.
export function Bar({ ratio = 0, color, height = 8, track, style }) {
  const v = useRef(new Animated.Value(reduce ? ratio : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: ratio, duration: reduce ? 0 : 900, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start()
  }, [v, ratio])
  return (
    <Animated.View style={[{ height, borderRadius: 99, backgroundColor: track || '#E4E9F2', overflow: 'hidden', padding: height >= 8 ? 2 : 0 }, neu.insetSm, style]}>
      <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
    </Animated.View>
  )
}
