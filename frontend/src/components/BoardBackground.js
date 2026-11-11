import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg'
import { colors } from '../theme'

// 게시판 질감: 28px 격자 + 위에서 아래로 짙어지는 그라디언트
export default function BoardBackground({ children, style }) {
  const { width, height } = useWindowDimensions()
  const lines = []
  for (let x = 0; x < width; x += 28) lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={colors.line} strokeWidth={1} />)
  for (let y = 0; y < height; y += 28) lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={colors.line} strokeWidth={1} />)
  return (
    <View style={[styles.root, style]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        <Defs>
          <RadialGradient id="fade" cx="50%" cy="0%" rx="90%" ry="75%">
            <Stop offset="0" stopColor={colors.ink} stopOpacity={0.2} />
            <Stop offset="0.7" stopColor={colors.ink} stopOpacity={0.92} />
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
