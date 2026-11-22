import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import DailyLimits, { ResetIn } from '../components/DailyLimits'
import FilterChips from '../components/FilterChips'
import { CameraIcon, LineIcon } from '../components/Icons'
import { Appear, ND, PressScale, reduced } from '../components/Motion'
import ClaimStatus from '../components/ClaimStatus'
import MyQuests from '../components/MyQuests'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty, Loading, refresher } from '../components/States'
import { isCrew, isPartner } from '../lib/format'
import { useFrameSize } from '../lib/frame'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

const FILTERS = [
  ['all', '전체'],
  ['partner', '제휴 의뢰'],
  ['near', '500m 이내'],
  ['crew', '크루 의뢰'],
  ['done', '완료'],
]

const match = {
  all: (r) => r.status !== 'completed',
  partner: (r) => r.status !== 'completed' && isPartner(r),
  near: (r) => r.status !== 'completed' && r.distance_m <= 500,
  crew: (r) => r.status !== 'completed' && isCrew(r),
  done: (r) => r.status === 'completed',
}

export default function BoardScreen({ navigation }) {
  const app = useApp()
  const { width } = useFrameSize()
  const [filter, setFilter] = useState('all')
  const list = app.reports.filter(match[filter])
  const going = app.reports.filter((r) => r.status === 'in_progress').length
  const accepted = app.reports.filter((r) => r.i_am_participating && r.status !== 'completed')
  const done = app.reports.filter((r) => r.status === 'completed').length
  // 이미 결론이 난 인증의 알림은 답할 필요가 없으므로 세지 않습니다.
  const waiting = app.notices.filter((n) => !n.answer && (n.can_dispute || !n.claim_status || n.claim_status === 'submitted')).length

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshControl={refresher(app)} bottomPad={96}>
        <ScreenHeader
          title="의뢰판"
          sub={app.located ? '내 위치 · 반경 1.5km' : '위치 없음 · 인하대 주변 1.5km'}
          right={
            <View style={styles.headBtns}>
              <PressScale onPress={() => app.refresh({ relocate: true })} accessibilityRole="button" accessibilityLabel="새로고침" surface="raisedSm" style={styles.refresh}>
                <LineIcon name="refresh" size={18} color={colors.fg} />
              </PressScale>
              <PressScale onPress={() => navigation.navigate('ReportCreate')} accessibilityRole="button" accessibilityLabel="주민 제보 올리기" surface="raisedSm" style={styles.report} to={0.95}>
                <CameraIcon size={17} color={colors.onBlue} />
                <Text style={[text.chip, { fontSize: 14, color: colors.onBlue }]}>제보하기</Text>
              </PressScale>
            </View>
          }
        />
        <View style={{ gap: 8 }}>
          <DailyLimits profile={app.profile} />
          <View style={{ alignItems: 'flex-end' }}>
            <ResetIn />
          </View>
        </View>
        {waiting > 0 ? (
          <PressScale onPress={() => navigation.navigate('Notices')} accessibilityRole="button" style={styles.notice}>
            <Text style={[text.section, { flex: 1 }]}>치워졌는지 확인해 주세요</Text>
            <Text style={[text.num, { fontSize: 15, color: colors.tapeText }]}>{waiting}건</Text>
          </PressScale>
        ) : null}
        <MyQuests reports={accepted} photos={app.photos} onOpen={(id) => (app.reports.find((x) => x.id === id)?.status === 'in_progress' ? navigation.navigate('Proof', { reportId: id }) : app.openSheet(id))} />
        <ClaimStatus claims={app.claims} />
        {app.reports.length > 0 ? (
          <View style={styles.head}>
            <View style={styles.mark} />
            <Text style={text.section}>전체 의뢰</Text>
            <Text style={[text.num, { fontSize: 15, color: colors.tapeText }]}>{app.reports.length - done}</Text>
            <Text style={[text.caption, styles.tally]}>{`진행 중 ${going} · 완료 ${done}`}</Text>
          </View>
        ) : null}
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        <View key={filter} style={{ gap: 12 }}>
          {list.map((r, i) => (
            <Appear key={r.id} index={i}>
              <ReportCard report={r} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
            </Appear>
          ))}
          {list.length === 0 && app.loading ? <Loading /> : null}
          {list.length === 0 && !app.loading && app.loadError ? <Empty title="의뢰를 불러오지 못했어요" sub={app.loadError} action="다시 시도" onAction={() => app.refresh()} /> : null}
          {list.length === 0 && !app.loading && !app.loadError ? (
            <Empty title={filter === 'all' ? '주변에 의뢰가 아직 없어요' : '이 조건의 의뢰가 없어요'} sub={filter === 'all' ? '쓰레기가 보이면 첫 제보를 올려 보세요' : null} />
          ) : null}
        </View>
      </Screen>

      {/* 아래 "바로 치웠어요": 제보하기(오른쪽 위)와 떨어뜨려 서로 다른 버튼으로 보이게 합니다. 뒤 카드가 비치지 않게 아래를 어둡게 덮습니다. */}
      <View style={styles.dockWrap} pointerEvents="box-none">
        <Svg width={width} height={96} style={styles.fade} pointerEvents="none">
          <Defs>
            <LinearGradient id="dockFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.ink} stopOpacity="0" />
              <Stop offset="0.6" stopColor={colors.ink} stopOpacity="0.92" />
              <Stop offset="1" stopColor={colors.ink} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height="96" fill="url(#dockFade)" />
        </Svg>
        <PressScale onPress={() => navigation.navigate('QuickClean')} accessibilityRole="button" accessibilityLabel="바로 치운 곳 기록하기" style={styles.quick} to={0.96}>
          <Bouncy style={styles.quickIcon}>
            <LineIcon name="check" size={18} color={colors.ink} />
          </Bouncy>
          <Text style={[text.button, { fontSize: 15, lineHeight: 19, color: colors.fg }]} numberOfLines={1}>
            바로 치웠어요
          </Text>
          <Text style={[text.caption, { fontSize: 12 }]} numberOfLines={1}>
            의뢰 없이 기록
          </Text>
        </PressScale>
      </View>
    </View>
  )
}

// 초록 체크 칸이 잊을 만하면 통통 튀며 "바로 치웠어요"를 눈에 띄게 합니다(두 번 튀고 쉼).
function Bouncy({ style, children }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduced()) return
    const hop = (h, d) =>
      Animated.sequence([
        Animated.timing(v, { toValue: h, duration: d, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
        Animated.timing(v, { toValue: 0, duration: d, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      ])
    const a = Animated.loop(Animated.sequence([hop(1, 170), hop(0.45, 130), Animated.delay(1700)]))
    a.start()
    return () => a.stop()
  }, [v])
  const transform = [
    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '4deg'] }) },
    { scaleX: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1.08, 1, 0.96] }) },
    { scaleY: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.92, 1, 1.05] }) },
  ]
  return <Animated.View style={[style, { transform }]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 6, height: 16, backgroundColor: colors.tape, transform: [{ skewX: '-16deg' }] },
  tally: { marginLeft: 'auto' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.tape, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  headBtns: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  refresh: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.blue },
  dockWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 24, paddingBottom: 14 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 18, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.35)' } : { elevation: 8 }) },
  quickIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
})
