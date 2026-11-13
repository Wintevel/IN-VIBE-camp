import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'
import Button from './Button'
import { Appear, CountUp, ND, reduced } from './Motion'
import { RewardIcon } from './Reward'

// 의뢰 완료 연출: 기울어진 띠가 양쪽에서 가로지르고 "의뢰 완료"가 찍힌 뒤 보상이 종류별로 올라갑니다.
export default function ClearOverlay() {
  const app = useApp()
  const c = app.celebrate
  const { width } = useWindowDimensions()
  const band = useRef(new Animated.Value(0)).current
  const slam = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!c) return
    band.setValue(reduced() ? 1 : 0)
    slam.setValue(reduced() ? 1 : 0)
    if (reduced()) return
    Animated.sequence([
      Animated.timing(band, { toValue: 1, duration: 320, easing: Easing.out(Easing.exp), useNativeDriver: ND }),
      Animated.spring(slam, { toValue: 1, speed: 22, bounciness: 14, useNativeDriver: ND }),
    ]).start()
  }, [c, band, slam])

  if (!c) return null
  const rows = [
    c.reward_label ? { kind: 'gift', label: c.reward_label, name: '제휴 보상' } : null,
    c.points_gained > 0 ? { kind: 'point', value: c.points_gained, name: '포인트' } : null,
    c.xp_gained > 0 ? { kind: 'xp', value: c.xp_gained, name: '경험치' } : null,
    c.crew_xp_gained > 0 ? { kind: 'crew', value: c.crew_xp_gained, name: '크루 경험치' } : null,
  ].filter(Boolean)
  const slide = (from) => band.interpolate({ inputRange: [0, 1], outputRange: [from * width * 1.4, 0] })

  return (
    <View style={styles.wrap} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <Pressable style={StyleSheet.absoluteFill} onPress={app.dismissCelebrate} accessibilityLabel="닫기" />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.bands} pointerEvents="none">
          <Animated.View style={[styles.band, { backgroundColor: colors.blue, top: 14, transform: [{ translateX: slide(1) }] }]} />
          <Animated.View style={[styles.band, { backgroundColor: colors.tape, transform: [{ translateX: slide(-1) }] }]}>
            <Animated.Text style={[text.h1, styles.clear, { opacity: slam, transform: [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }] }]}>의뢰 완료</Animated.Text>
          </Animated.View>
        </View>

        <Appear from="bottom" delay={380}>
          <Text style={[text.cardTitle, { textAlign: 'center' }]}>{c.title}</Text>
        </Appear>
        {c.leveled_up ? (
          <Appear from="bottom" delay={460} style={styles.level}>
            <Text style={[text.num, { color: colors.ink }]}>LEVEL UP · Lv.{c.level}</Text>
          </Appear>
        ) : null}

        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          {rows.map((r, i) => (
            <Appear key={r.kind} from={i % 2 ? 'left' : 'right'} delay={520 + i * 110} style={styles.row}>
              <RewardIcon kind={r.kind} size={26} />
              <Text style={[text.section, { flex: 1 }]}>{r.name}</Text>
              {r.label ? <Text style={[text.num, { color: colors.tape }]}>{r.label}</Text> : <CountUp value={r.value} prefix="+" delay={520 + i * 110} style={[text.point, { color: r.kind === 'point' ? colors.tape : r.kind === 'crew' ? colors.purple : colors.blue }]} />}
            </Appear>
          ))}
        </View>

        <Appear from="bottom" delay={520 + rows.length * 110} style={{ alignSelf: 'stretch', flexDirection: 'row' }}>
          <Button onPress={app.dismissCelebrate}>확인</Button>
        </Appear>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,11,13,0.92)', zIndex: 50, overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18, paddingHorizontal: 24 },
  bands: { alignSelf: 'stretch', height: 110, marginHorizontal: -60, justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  band: { position: 'absolute', left: 0, right: 0, height: 76, alignItems: 'center', justifyContent: 'center' },
  clear: { fontSize: 46, lineHeight: 54, color: colors.tapeInk, letterSpacing: 2 },
  level: { backgroundColor: colors.green, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, transform: [{ rotate: '-3deg' }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
})
