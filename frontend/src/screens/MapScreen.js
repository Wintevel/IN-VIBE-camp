import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg'
import { Card } from '../components/ListRows'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { MAP_STATS } from '../data/mock'
import { colors, text } from '../theme'

// 지도 자리표시: 시안의 육각 구역 그림입니다.
// 실제 지도는 네이버지도 SDK(@mj-studio/react-native-naver-map)로 교체합니다. Expo Go 에서는 안 돌아가고
// EAS 개발 빌드가 필요하므로 docs/api.md 기술 구성과 frontend/README.md 를 먼저 보세요.
const W = 350
const H = 368

function hexCells() {
  const cells = []
  const r = 17
  const h = Math.sqrt(3) * r
  let seed = 7
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  for (let row = 0; row * h * 0.5 < H + h; row++) {
    for (let c = 0; c * r * 3 < W + r * 3; c++) {
      const cx = c * r * 3 + (row % 2 ? r * 1.5 : 0)
      const cy = row * h * 0.5
      const v = rnd()
      let fill = colors.panel2
      let op = 0.55
      if (v < 0.3) [fill, op] = [colors.blue, 0.85]
      else if (v < 0.45) [fill, op] = [colors.purple, 0.75]
      else if (v < 0.52) [fill, op] = [colors.tape, 0.9]
      else if (v < 0.57) [fill, op] = [colors.red, 0.85]
      const pts = Array.from({ length: 6 }, (_, k) => `${cx + (r - 1.5) * Math.cos((Math.PI / 3) * k)},${cy + (r - 1.5) * Math.sin((Math.PI / 3) * k)}`).join(' ')
      cells.push(<Polygon key={`${row}-${c}`} points={pts} fill={fill} opacity={op} />)
    }
  }
  return cells
}
const CELLS = hexCells()

const LEGEND = [
  ['우리 크루', colors.blue],
  ['다른 크루', colors.purple],
  ['의뢰 있음', colors.tape],
  ['제보 많음', colors.red],
]

export default function MapScreen() {
  return (
    <Screen>
      <ScreenHeader title="동네 지도" sub="치운 구역이 우리 크루 색으로 칠해져요" />
      <View style={styles.map}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <Rect width={W} height={H} fill="#15181D" />
          {[[0, 130, W, 100], [90, 0, 150, H], [0, 280, W, 300], [260, 0, 280, H]].map(([a, b, c, d], i) => (
            <Line key={i} x1={a} y1={b} x2={c} y2={d} stroke={colors.line} strokeWidth={7} strokeLinecap="round" />
          ))}
          {CELLS}
          <Circle cx={W * 0.46} cy={H * 0.52} r={6} fill="#fff" />
          <Circle cx={W * 0.46} cy={H * 0.52} r={3.5} fill={colors.blue} />
        </Svg>
      </View>
      <View style={styles.legend}>
        {LEGEND.map(([label, color]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
            <Text style={text.caption}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {MAP_STATS.map(([num, label]) => (
          <Card key={label} style={{ flex: 1, padding: 12, borderRadius: 14 }}>
            <Text style={text.point}>{num}</Text>
            <Text style={[text.caption, { marginTop: 4 }]}>{label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  map: { aspectRatio: 1 / 1.05, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#15181D' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
})
