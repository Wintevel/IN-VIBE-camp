import { useEffect, useId, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { colors, font, text } from '../theme'
import { ND, reduced } from './Motion'

// 프로필 테두리. 꾸미기 품목의 style 에 따라 도는 그라데이션 고리, 이중 고리, 장식, 반짝이는 별을 겹칩니다.
// frame: { style: 'plain' | 'neon' | 'spin' | 'stars' | 'royal' | 'legend' | 'crest', colors: [...], rank? }
// crest 는 시즌 순위 보상(1·2·3위 크루) 전용입니다: 금속 고리 + 날개·왕관(또는 월계수) + 순위 메달 리본. colors = [밝은 면, 본색, 그림자, 보석]
const PARTS = {
  plain: {},
  neon: { spin: true, double: true },
  spin: { spin: true },
  stars: { spin: true, stars: true },
  royal: { spin: true, stars: true, gems: true },
  legend: { spin: true, stars: true, gems: true, double: true },
}
// 별 위치(각도, 중심에서의 거리 비율, 크기 비율)
const STARS = [
  [-50, 1.02, 0.11],
  [35, 1.06, 0.08],
  [150, 1.0, 0.1],
  [215, 1.07, 0.07],
]
const star = (cx, cy, r) => `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z`
const gem = (cx, cy, r) => `M${cx} ${cy - r} L${cx + r * 0.62} ${cy} L${cx} ${cy + r} L${cx - r * 0.62} ${cy}Z`

function useLoop(duration, on) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!on || reduced()) return
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: ND }))
    a.start()
    return () => a.stop()
  }, [v, duration, on])
  return v
}

export default function AvatarFrame({ frame, size = 64, letter, letterColor, uri }) {
  const f = frame || { style: 'plain', colors: [colors.tape] }
  // 모양마다 훅이 달라서 컴포넌트를 나눕니다(같은 자리에서 테두리를 바꿔 끼워도 안전하게).
  return f.style === 'crest' ? <Crest frame={f} size={size} letter={letter} letterColor={letterColor} uri={uri} /> : <Ring frame={f} size={size} letter={letter} letterColor={letterColor} uri={uri} />
}

function Ring({ frame: f, size, letter, letterColor, uri }) {
  const part = PARTS[f.style] || PARTS.plain
  const cs = f.colors?.length ? f.colors : [colors.tape]
  const pad = size * 0.16 // 별·장식이 고리 밖으로 나갈 자리
  const box = size + pad * 2
  const c = box / 2
  const w = Math.max(3, size * 0.07)
  const r = size / 2 - w / 2
  const turn = useLoop(part.double ? 3600 : 5200, !!part.spin)
  const blink = useLoop(1800, !!part.stars)
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { backgroundColor: colors.panel2, borderRadius: size / 2 }]} />
      {uri ? (
        <Image source={{ uri }} style={[styles.fill, { width: size, height: size, borderRadius: size / 2 }]} resizeMode="cover" />
      ) : (
        <View style={styles.center}>
          <Text style={[text.h1, { fontSize: size * 0.4, lineHeight: size * 0.5, color: letterColor || cs[0] }]}>{letter}</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: -pad, top: -pad, width: box, height: box }} pointerEvents="none">
        {part.double ? (
          <Animated.View style={[styles.fill, { opacity: 0.55, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] }]}>
            <Svg width={box} height={box}>
              <Defs>
                <LinearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={cs[cs.length - 1]} stopOpacity="1" />
                  <Stop offset="0.5" stopColor={cs[0]} stopOpacity="0" />
                  <Stop offset="1" stopColor={cs[0]} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Circle cx={c} cy={c} r={r + w * 1.5} stroke={`url(#${id}-o)`} strokeWidth={w * 0.5} fill="none" />
            </Svg>
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.fill, part.spin && { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <Svg width={box} height={box}>
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                {cs.map((col, i) => (
                  <Stop key={i} offset={cs.length === 1 ? 0 : i / (cs.length - 1)} stopColor={col} stopOpacity="1" />
                ))}
              </LinearGradient>
            </Defs>
            <Circle cx={c} cy={c} r={r} stroke={`url(#${id})`} strokeWidth={w} fill="none" />
          </Svg>
        </Animated.View>
        {part.gems ? (
          <Svg width={box} height={box} style={styles.fill}>
            {[0, 90, 180, 270].map((deg) => {
              const a = (deg * Math.PI) / 180
              return <Path key={deg} d={gem(c + Math.sin(a) * (r + w * 0.2), c - Math.cos(a) * (r + w * 0.2), w * 1.25)} fill={cs[0]} stroke={colors.ink} strokeWidth={1} />
            })}
          </Svg>
        ) : null}
        {part.stars
          ? STARS.map(([deg, far, big], i) => {
              const a = (deg * Math.PI) / 180
              const phase = i / STARS.length
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.fill,
                    { opacity: blink.interpolate({ inputRange: [0, phase * 0.6 + 0.1, phase * 0.6 + 0.3, 1], outputRange: [0.35, 1, 0.35, 0.35] }) },
                  ]}
                >
                  <Svg width={box} height={box}>
                    <Path d={star(c + Math.sin(a) * (size / 2) * far, c - Math.cos(a) * (size / 2) * far, size * big)} fill="#FFFFFF" />
                  </Svg>
                </Animated.View>
              )
            })
          : null}
      </View>
    </View>
  )
}

// ── 시즌 순위 테두리(crest) ─────────────────────────────
// 파스텔 두 겹 고리 + 위의 작은 순위 장식(1위 왕관, 2위 티아라, 3위 잎) + 아래 순위 숫자 배지. 움직이는 장식은 넣지 않습니다.
// 200×200 칸에 그리고, 가운데 사진 원은 size 의 76% 입니다. colors = [밝은 면, 본색, 선, 포인트]
function Crest({ frame: f, size, letter, letterColor, uri }) {
  const [light, mid, dark, accent] = f.colors?.length >= 4 ? f.colors : ['#FFF6DA', '#F5DC97', '#B89350', '#F4C7C3']
  const rank = f.rank || 1
  const inner = size * 0.76
  const big = inner * 2
  const off = (size - big) / 2
  const layer = { position: 'absolute', left: off, top: off, width: big, height: big }
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: (size - inner) / 2, top: (size - inner) / 2, width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: colors.panel2 }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: inner, height: inner }} resizeMode="cover" />
        ) : (
          <View style={styles.center}>
            <Text style={[text.h1, { fontSize: inner * 0.42, lineHeight: inner * 0.52, color: letterColor || dark }]}>{letter}</Text>
          </View>
        )}
      </View>
      <View style={layer} pointerEvents="none">
        <Svg width={big} height={big} viewBox="0 0 200 200" style={styles.fill}>
          <Circle cx="100" cy="100" r="54" stroke={mid} strokeWidth={6} fill="none" />
          <Circle cx="100" cy="100" r="57.5" stroke={dark} strokeOpacity={0.35} strokeWidth={0.8} fill="none" />
          <Circle cx="100" cy="100" r="50.2" stroke={light} strokeWidth={1.2} fill="none" />
          {rank === 1 ? (
            <Path d="M84 46 L82 30 L92 38 L100 26 L108 38 L118 30 L116 46 Z" fill={light} stroke={dark} strokeWidth={1.2} strokeLinejoin="round" />
          ) : rank === 2 ? (
            <G>
              <Path d="M82 47 C88 38 94 34 100 32 C106 34 112 38 118 47 C110 44 90 44 82 47 Z" fill={light} stroke={dark} strokeWidth={1.2} strokeLinejoin="round" />
              <Circle cx="100" cy="37" r="3" fill={accent} stroke={dark} strokeWidth={0.8} />
            </G>
          ) : (
            <G>
              <Path d="M99 46 C92 44 86 38 86 31 C93 33 98 39 99 46 Z" fill={light} stroke={dark} strokeWidth={1.1} strokeLinejoin="round" />
              <Path d="M101 46 C108 44 114 38 114 31 C107 33 102 39 101 46 Z" fill={light} stroke={dark} strokeWidth={1.1} strokeLinejoin="round" />
            </G>
          )}
          {rank === 1 ? <Circle cx="100" cy="40" r="2.6" fill={accent} stroke={dark} strokeWidth={0.8} /> : null}
          <Circle cx="100" cy="156" r="11" fill={light} stroke={dark} strokeWidth={1.2} />
          <SvgText x="100" y="161.5" fontSize="15" fontFamily={font.display.fontFamily} fill={dark} textAnchor="middle">
            {String(rank)}
          </SvgText>
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
})
