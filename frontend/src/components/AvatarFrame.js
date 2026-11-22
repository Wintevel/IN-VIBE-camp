import { useEffect, useId, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg'
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
// 200×200 칸에 그립니다. 가운데 반지름 50 원이 프로필 사진 자리입니다(실제로는 size 의 74% 로 줄여 장식이 덜 튀어나오게).
// 구성: 뒤(숨 쉬는 후광, 천천히 도는 룬 고리, 겹 날개) → 사진 → 앞(겹 금속 고리와 장식 못, 위 장식과 보석, 아래 순위 문장, 도는 빛, 반짝임)
const P = (n) => Math.round(n * 10) / 10
// 깃털 하나: 뿌리(bx,by)에서 각도 deg(위=0, 시계 방향) 로 len 만큼, 폭 w
function feather(bx, by, deg, len, w) {
  const a = (deg * Math.PI) / 180
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const tx = bx + dx * len
  const ty = by + dy * len
  const mx = bx + dx * len * 0.55
  const my = by + dy * len * 0.55
  const px = -dy
  const py = dx
  return `M${P(bx)} ${P(by)} Q${P(mx + px * w)} ${P(my + py * w)} ${P(tx)} ${P(ty)} Q${P(mx - px * w * 0.45)} ${P(my - py * w * 0.45)} ${P(bx)} ${P(by)}Z`
}
// 왼쪽 날개 실루엣: 고리 왼쪽 위 뿌리에서 위·바깥으로 뻗고, 아래 가장자리는 깃 끝처럼 물결집니다. 오른쪽은 좌우 반전.
// 같은 모양을 크기를 줄여 2~3겹 겹쳐 깊이를 냅니다. 순위가 높을수록 날개가 크고 겹이 많습니다.
const WING_PATH = 'M62 84 C50 66 34 48 10 30 C14 44 17 52 22 60 C14 62 9 67 6 74 C15 76 22 79 27 84 C20 88 15 94 13 101 C22 101 30 102 37 106 C32 111 30 116 30 122 C40 120 50 117 60 114 Z'
const WING = { 1: { scale: 1, layers: [1, 0.74, 0.5] }, 2: { scale: 0.86, layers: [1, 0.68] }, 3: { scale: 0.7, layers: [1, 0.62] } }
const STUDS = [30, 60, 120, 150, 210, 240, 300, 330]
const SPARKS = [
  [34, 40, 5],
  [166, 44, 4],
  [28, 132, 3.5],
  [172, 128, 4.5],
]
const at = (deg, r) => [100 + Math.sin((deg * Math.PI) / 180) * r, 100 - Math.cos((deg * Math.PI) / 180) * r]
// 깎은 보석(겉 마름모 + 면 나눔 선)
function Gem({ x, y, r, color, dark, light }) {
  return (
    <G>
      <Path d={`M${x} ${y - r} L${x + r * 0.7} ${y} L${x} ${y + r} L${x - r * 0.7} ${y}Z`} fill={color} stroke={dark} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={`M${x - r * 0.7} ${y} L${x + r * 0.7} ${y} M${x} ${y - r} L${x - r * 0.25} ${y} L${x} ${y + r} M${x} ${y - r} L${x + r * 0.25} ${y}`} stroke={light} strokeOpacity={0.55} strokeWidth={0.8} fill="none" />
      <Path d={`M${x - r * 0.2} ${y - r * 0.55} L${x - r * 0.42} ${y - r * 0.1}`} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeOpacity={0.9} />
    </G>
  )
}

function Crest({ frame: f, size, letter, letterColor, uri }) {
  const [light, mid, dark, gemColor] = f.colors?.length >= 4 ? f.colors : ['#FFF6C8', '#FFD43B', '#B07A0A', '#F04452']
  const rank = f.rank || 1
  const id = `c${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const turn = useLoop(4200, true)
  const slow = useLoop(16000, true)
  const blink = useLoop(2200, true)
  // 장식이 다른 테두리만큼만 밖으로 나가도록 사진 원을 74% 로 줄이고 장식을 그 둘레에 그립니다.
  const inner = size * 0.74
  const big = inner * 2
  const off = (size - big) / 2
  const layer = { position: 'absolute', left: off, top: off, width: big, height: big }
  const glow = blink.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.9, 0.5] })
  const wing = WING[rank] || WING[3]
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={layer} pointerEvents="none">
        <Animated.View style={[styles.fill, { opacity: glow }]}>
          <Svg width={big} height={big} viewBox="0 0 200 200">
            <Defs>
              <RadialGradient id={`${id}-h`} cx="100" cy="100" r="90" gradientUnits="userSpaceOnUse">
                <Stop offset="0.52" stopColor={mid} stopOpacity="0.5" />
                <Stop offset="1" stopColor={mid} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="100" r="90" fill={`url(#${id}-h)`} />
          </Svg>
        </Animated.View>
        {/* 천천히 도는 룬 고리 */}
        <Animated.View style={[styles.fill, { opacity: 0.55, transform: [{ rotate: slow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]}>
          <Svg width={big} height={big} viewBox="0 0 200 200">
            <Circle cx="100" cy="100" r="66" stroke={light} strokeOpacity={0.6} strokeWidth={0.8} strokeDasharray="2 5 9 5" fill="none" />
            <Circle cx="100" cy="100" r="71" stroke={mid} strokeOpacity={0.35} strokeWidth={0.6} fill="none" />
          </Svg>
        </Animated.View>
        <Svg width={big} height={big} viewBox="0 0 200 200" style={styles.fill}>
          <Defs>
            <LinearGradient id={`${id}-w`} x1="1" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={mid} stopOpacity="1" />
              <Stop offset="0.55" stopColor={light} stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id={`${id}-w2`} x1="1" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={dark} stopOpacity="1" />
              <Stop offset="0.6" stopColor={mid} stopOpacity="1" />
              <Stop offset="1" stopColor={light} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {[false, true].map((flip) => (
            <G key={String(flip)} transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
              <G transform={`translate(62 100) scale(${wing.scale}) translate(-62 -100)`}>
                {wing.layers.map((k, i) => (
                  <G key={k} transform={`translate(62 100) scale(${k}) translate(-62 -100)`}>
                    <Path d={WING_PATH} fill={i === 0 ? `url(#${id}-w)` : i === 1 ? `url(#${id}-w2)` : mid} stroke={dark} strokeWidth={1.1 / k} strokeLinejoin="round" />
                  </G>
                ))}
              </G>
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
      <View style={layer} pointerEvents="none">
        <Svg width={big} height={big} viewBox="0 0 200 200" style={styles.fill}>
          <Defs>
            <LinearGradient id={`${id}-m`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="0.25" stopColor={light} stopOpacity="1" />
              <Stop offset="0.55" stopColor={mid} stopOpacity="1" />
              <Stop offset="0.8" stopColor={dark} stopOpacity="1" />
              <Stop offset="1" stopColor={mid} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={light} stopOpacity="1" />
              <Stop offset="0.6" stopColor={mid} stopOpacity="1" />
              <Stop offset="1" stopColor={dark} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {/* 겹 금속 고리 */}
          <Circle cx="100" cy="100" r="55.5" stroke={dark} strokeWidth={2} fill="none" />
          <Circle cx="100" cy="100" r="52.5" stroke={`url(#${id}-m)`} strokeWidth={5} fill="none" />
          <Circle cx="100" cy="100" r="49.6" stroke={dark} strokeWidth={1} fill="none" />
          <Circle cx="100" cy="100" r="48.6" stroke={light} strokeOpacity={0.8} strokeWidth={0.8} fill="none" />
          {STUDS.map((deg) => {
            const [x, y] = at(deg, 52.5)
            return <Circle key={deg} cx={x} cy={y} r={1.8} fill={light} stroke={dark} strokeWidth={0.7} />
          })}
          {/* 위 장식 */}
          {rank === 1 ? (
            <G>
              <Path d="M70 47 C72 36 78 30 84 34 L88 22 L95 32 L100 12 L105 32 L112 22 L116 34 C122 30 128 36 130 47 C118 42 82 42 70 47Z" fill={`url(#${id}-v)`} stroke={dark} strokeWidth={1.3} strokeLinejoin="round" />
              <Path d="M76 44 C88 40 112 40 124 44" stroke={light} strokeWidth={1} fill="none" strokeOpacity={0.9} />
              <Circle cx="88" cy="22" r="2.4" fill="#FFFFFF" stroke={dark} strokeWidth={0.8} />
              <Circle cx="100" cy="12" r="2.8" fill="#FFFFFF" stroke={dark} strokeWidth={0.8} />
              <Circle cx="112" cy="22" r="2.4" fill="#FFFFFF" stroke={dark} strokeWidth={0.8} />
              <Gem x={100} y={36} r={8} color={gemColor} dark={dark} light={light} />
            </G>
          ) : rank === 2 ? (
            <G>
              <Path d="M76 48 C82 38 90 33 100 26 C110 33 118 38 124 48 C114 44 86 44 76 48Z" fill={`url(#${id}-v)`} stroke={dark} strokeWidth={1.3} strokeLinejoin="round" />
              <Path d="M84 44 C92 39 108 39 116 44" stroke={light} strokeWidth={0.9} fill="none" />
              <Gem x={100} y={34} r={8.5} color={gemColor} dark={dark} light={light} />
            </G>
          ) : (
            <G>
              {[-1, 1].map((s) => (
                <G key={s} transform={s < 0 ? undefined : 'translate(200 0) scale(-1 1)'}>
                  {[0, 1, 2].map((i) => (
                    <Path key={i} d={feather(96 - i * 7, 46 + i * 1.5, 300 - i * 14, 13, 3.6)} fill={`url(#${id}-v)`} stroke={dark} strokeWidth={0.8} />
                  ))}
                </G>
              ))}
              <Gem x={100} y={42} r={7.5} color={gemColor} dark={dark} light={light} />
            </G>
          )}
          {/* 아래 순위 문장: 양쪽 두루마리 + 육각 판 */}
          <Path d="M66 154 C74 160 80 160 84 156 M134 154 C126 160 120 160 116 156" stroke={`url(#${id}-v)`} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M66 154 C74 160 80 160 84 156 M134 154 C126 160 120 160 116 156" stroke={dark} strokeWidth={0.7} strokeLinecap="round" fill="none" />
          <Path d="M88 147 L112 147 L120 158 L112 169 L88 169 L80 158Z" fill={`url(#${id}-m)`} stroke={dark} strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M90.5 150.5 L109.5 150.5 L115.6 158 L109.5 165.5 L90.5 165.5 L84.4 158Z" fill={dark} fillOpacity={0.8} stroke={light} strokeWidth={0.8} strokeLinejoin="round" />
          <SvgText x="100" y="164" fontSize="16" fontFamily={font.display.fontFamily} fill={light} textAnchor="middle">
            {String(rank)}
          </SvgText>
        </Svg>
        {/* 고리를 따라 도는 빛줄기 */}
        <Animated.View style={[styles.fill, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <Svg width={big} height={big} viewBox="0 0 200 200">
            <Circle cx="100" cy="100" r="52.5" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2.4} strokeDasharray="26 304" strokeLinecap="round" fill="none" />
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
