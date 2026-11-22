import { useEffect, useId, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg'
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
// 200×200 칸에 그립니다. 가운데 반지름 50 원이 프로필 사진 자리이고, 장식은 사진 크기의 절반까지 밖으로 나갑니다.
const FEATHERS = [
  'M52 78 C40 58 26 46 12 44 C18 58 28 70 46 86 Z',
  'M50 92 C36 80 22 76 8 78 C18 90 30 98 48 102 Z',
  'M50 108 C38 104 26 106 14 114 C26 120 38 120 52 118 Z',
]
const SPARKS = [
  [30, 36, 5],
  [170, 40, 4],
  [24, 128, 3.5],
  [178, 122, 4.5],
]
// 월계수 잎 자리(위에서 시계 방향 각도)
const LAUREL = [205, 225, 245, 265, 285, 305, 325]

function Crest({ frame: f, size, letter, letterColor, uri }) {
  const [light, mid, dark, gemColor] = f.colors?.length >= 4 ? f.colors : ['#FFF6C8', '#FFD43B', '#B07A0A', '#F04452']
  const rank = f.rank || 1
  const id = `c${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const turn = useLoop(4200, true)
  const blink = useLoop(2200, true)
  // 장식이 다른 테두리만큼만 밖으로 나가도록 사진 원을 74% 로 줄이고 장식을 그 둘레에 그립니다.
  const inner = size * 0.74
  const big = inner * 2
  const off = (size - big) / 2
  const layer = { position: 'absolute', left: off, top: off, width: big, height: big }
  const wings = rank === 3 ? [] : rank === 2 ? FEATHERS.slice(0, 2) : FEATHERS
  const glow = blink.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.95, 0.55] })
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* 뒤: 은은하게 숨 쉬는 후광과 날개 */}
      <View style={layer} pointerEvents="none">
        <Animated.View style={[styles.fill, { opacity: glow }]}>
          <Svg width={big} height={big} viewBox="0 0 200 200">
            <Defs>
              <RadialGradient id={`${id}-h`} cx="100" cy="100" r="92" gradientUnits="userSpaceOnUse">
                <Stop offset="0.5" stopColor={mid} stopOpacity="0.55" />
                <Stop offset="1" stopColor={mid} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="100" r="92" fill={`url(#${id}-h)`} />
          </Svg>
        </Animated.View>
        <Svg width={big} height={big} viewBox="0 0 200 200" style={styles.fill}>
          <Defs>
            <LinearGradient id={`${id}-w`} x1="1" y1="0" x2="0" y2="0">
              <Stop offset="0" stopColor={light} stopOpacity="1" />
              <Stop offset="1" stopColor={mid} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {[false, true].map((flip) => (
            <G key={String(flip)} transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
              {wings.map((d, i) => (
                <Path key={i} d={d} fill={`url(#${id}-w)`} stroke={dark} strokeWidth={1.4} strokeLinejoin="round" />
              ))}
              {rank === 3
                ? LAUREL.map((deg, i) => {
                    const a = (deg * Math.PI) / 180
                    const x = 100 + Math.sin(a) * 61
                    const y = 100 - Math.cos(a) * 61
                    return <Ellipse key={i} cx={x} cy={y} rx={8} ry={3.4} fill={i % 2 ? mid : light} stroke={dark} strokeWidth={1} transform={`rotate(${deg + 90 - 35} ${x} ${y})`} />
                  })
                : null}
            </G>
          ))}
        </Svg>
      </View>
      {/* 프로필 사진 */}
      <View style={{ position: 'absolute', left: (size - inner) / 2, top: (size - inner) / 2, width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: colors.panel2 }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: inner, height: inner }} resizeMode="cover" />
        ) : (
          <View style={styles.center}>
            <Text style={[text.h1, { fontSize: inner * 0.42, lineHeight: inner * 0.52, color: letterColor || mid }]}>{letter}</Text>
          </View>
        )}
      </View>
      {/* 앞: 금속 고리, 도는 빛, 왕관, 순위 메달 */}
      <View style={layer} pointerEvents="none">
        <Svg width={big} height={big} viewBox="0 0 200 200" style={styles.fill}>
          <Defs>
            <LinearGradient id={`${id}-m`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={light} stopOpacity="1" />
              <Stop offset="0.45" stopColor={mid} stopOpacity="1" />
              <Stop offset="0.7" stopColor={dark} stopOpacity="1" />
              <Stop offset="1" stopColor={light} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={light} stopOpacity="1" />
              <Stop offset="1" stopColor={dark} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle cx="100" cy="100" r="53" stroke={dark} strokeWidth={9} fill="none" />
          <Circle cx="100" cy="100" r="53" stroke={`url(#${id}-m)`} strokeWidth={6.5} fill="none" />
          <Circle cx="100" cy="100" r="48.6" stroke={light} strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
          {[135, 225].map((deg) => {
            const a = (deg * Math.PI) / 180
            const x = 100 + Math.sin(a) * 53
            const y = 100 - Math.cos(a) * 53
            return <Path key={deg} d={gem(x, y, 7)} fill={gemColor} stroke={dark} strokeWidth={1.4} />
          })}
          {rank === 1 ? (
            <G>
              <Path d="M74 46 L70 20 L86 31 L100 11 L114 31 L130 20 L126 46 Z" fill={`url(#${id}-v)`} stroke={dark} strokeWidth={1.6} strokeLinejoin="round" />
              <Rect x="73" y="40" width="54" height="9" rx="3" fill={mid} stroke={dark} strokeWidth={1.4} />
              <Circle cx="70" cy="20" r="3" fill={light} stroke={dark} strokeWidth={1} />
              <Circle cx="100" cy="11" r="3.4" fill={light} stroke={dark} strokeWidth={1} />
              <Circle cx="130" cy="20" r="3" fill={light} stroke={dark} strokeWidth={1} />
              <Path d={gem(100, 32, 7)} fill={gemColor} stroke={dark} strokeWidth={1.2} />
            </G>
          ) : rank === 2 ? (
            <G>
              <Path d="M80 48 L86 33 L100 41 L114 33 L120 48 Z" fill={`url(#${id}-v)`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
              <Path d={gem(100, 27, 10)} fill={gemColor} stroke={dark} strokeWidth={1.4} />
            </G>
          ) : (
            <Path d={gem(100, 44, 8)} fill={gemColor} stroke={dark} strokeWidth={1.4} />
          )}
          <Path d="M54 150 L146 150 L137 160.5 L146 171 L54 171 L63 160.5 Z" fill={`url(#${id}-v)`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
          <Circle cx="100" cy="159" r="16" fill={`url(#${id}-m)`} stroke={dark} strokeWidth={1.8} />
          <Circle cx="100" cy="159" r="12" fill={dark} fillOpacity={0.75} stroke={light} strokeWidth={1} />
          <SvgText x="100" y="165.5" fontSize="18" fontFamily={font.display.fontFamily} fill={light} textAnchor="middle">
            {String(rank)}
          </SvgText>
        </Svg>
        {/* 고리를 따라 도는 빛줄기 */}
        <Animated.View style={[styles.fill, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <Svg width={big} height={big} viewBox="0 0 200 200">
            <Circle cx="100" cy="100" r="53" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={3.2} strokeDasharray="34 299" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        {SPARKS.map(([x, y, r], i) => {
          const phase = i / SPARKS.length
          return (
            <Animated.View key={i} style={[styles.fill, { opacity: blink.interpolate({ inputRange: [0, phase * 0.7 + 0.05, phase * 0.7 + 0.25, 1], outputRange: [0.15, 1, 0.15, 0.15] }) }]}>
              <Svg width={big} height={big} viewBox="0 0 200 200">
                <Path d={star(x, y, r)} fill="#FFFFFF" />
              </Svg>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
})
