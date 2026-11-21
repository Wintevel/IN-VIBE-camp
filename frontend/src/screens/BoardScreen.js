import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import DailyLimits from '../components/DailyLimits'
import FilterChips from '../components/FilterChips'
import { Appear, PressScale } from '../components/Motion'
import ClaimStatus from '../components/ClaimStatus'
import MyQuests from '../components/MyQuests'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty, Loading, refresher } from '../components/States'
import { isCrew, isPartner } from '../lib/format'
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
        <ScreenHeader title="의뢰판" sub={app.located ? '내 위치 · 반경 1.5km' : '위치를 못 받아 인하대 주변을 보여줘요 · 반경 1.5km'} action="새로고침" onAction={() => app.refresh({ relocate: true })} />
        <DailyLimits profile={app.profile} />
        {waiting > 0 ? (
          <PressScale onPress={() => navigation.navigate('Notices')} accessibilityRole="button" style={styles.notice}>
            <Text style={[text.section, { flex: 1 }]}>치워졌는지 확인해 주세요</Text>
            <Text style={[text.num, { fontSize: 15, color: colors.tape }]}>{waiting}건</Text>
          </PressScale>
        ) : null}
        <MyQuests reports={accepted} photos={app.photos} onOpen={(id) => (app.reports.find((x) => x.id === id)?.status === 'in_progress' ? navigation.navigate('Proof', { reportId: id }) : app.openSheet(id))} />
        <ClaimStatus claims={app.claims} />
        {app.reports.length > 0 ? (
          <View style={styles.head}>
            <View style={styles.mark} />
            <Text style={text.section}>전체 의뢰</Text>
            <Text style={[text.num, { fontSize: 15, color: colors.tape }]}>{app.reports.length - done}</Text>
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

      <View style={styles.fabWrap} pointerEvents="box-none">
        <PressScale onPress={() => navigation.navigate('QuickClean')} accessibilityRole="button" accessibilityLabel="바로 치운 곳 기록하기" surface="raised" style={[styles.fab, styles.fabQuick]} to={0.94}>
          <Text style={[text.button, { color: colors.ink }]}>바로 치웠어요</Text>
        </PressScale>
        <PressScale onPress={() => navigation.navigate('ReportCreate')} accessibilityRole="button" accessibilityLabel="주민 제보 올리기" surface="raised" style={styles.fab} to={0.94}>
          <Text style={[text.button, { color: colors.onBlue }]}>＋ 제보하기</Text>
        </PressScale>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 6, height: 16, backgroundColor: colors.tape, transform: [{ skewX: '-16deg' }] },
  tally: { marginLeft: 'auto' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.tape, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  fabWrap: { position: 'absolute', right: 20, bottom: 16, flexDirection: 'row', gap: 8 },
  fabQuick: { backgroundColor: colors.green },
  fab: { backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.pill },
})
