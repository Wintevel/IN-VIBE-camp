import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, neu } from '../theme'
import { reduced } from './Motion'

const ACircle = Animated.createAnimatedComponent(Circle)

// 원형 다이얼(뉴모피즘 촉감): 살짝 솟은 원판 위에 진행 링이 차오르고, 가운데는 안으로 패인 홈에 내용을 둡니다(레벨용).
export default function Dial({ size = 104, ratio = 0, color = colors.blue, stroke = 9, children, accessibilityLabel }) {
  const v = useRef(new Animated.Value(reduced() ? ratio : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, ratio)), duration: reduced() ? 0 : 1100, delay: 120, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start()
  }, [v, ratio])
  const r = (size - 16 - stroke) / 2
  const c = 2 * Math.PI * r
  const inner = size - 16 - stroke * 2 - 10
  return (
    <View style={[styles.plate, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.panel2} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.well, { width: inner, height: inner, borderRadius: inner / 2 }]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', ...neu.raised },
  well: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', ...neu.inset },
})
