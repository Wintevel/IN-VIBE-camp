import { StyleSheet, View } from 'react-native'
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useFrameSize } from '../lib/frame'
import { colors } from '../theme'

// 게시판 질감: 28px 격자를 아주 옅게 깔고, 위쪽에서만 살짝 보이다 아래로 갈수록 바탕색으로 사라집니다(뉴모피즘 면의 그림자를 가리지 않게).
export default function BoardBackground({ children, style }) {
  const { width, height } = useFrameSize()
  const lines = []
  for (let x = 0; x < width; x += 28) lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={colors.line} strokeWidth={1} strokeOpacity={0.55} />)
  for (let y = 0; y < height; y += 28) lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={colors.line} strokeWidth={1} strokeOpacity={0.55} />)
  return (
    <View style={[styles.root, style]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        <Defs>
          <RadialGradient id="fade" cx="50%" cy="0%" rx="90%" ry="75%">
            <Stop offset="0" stopColor={colors.ink} stopOpacity={0.15} />
            <Stop offset="0.6" stopColor={colors.ink} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        {lines}
        <Rect x={0} y={0} width={width} height={height} fill="url(#fade)" />
      </Svg>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ink } })
