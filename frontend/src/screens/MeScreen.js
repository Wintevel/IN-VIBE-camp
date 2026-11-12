import { StyleSheet, Text, View } from 'react-native'
import DailyLimits from '../components/DailyLimits'
import { PointIcon, XpIcon } from '../components/Icons'
import { Appear, Bar, CountUp, PressScale } from '../components/Motion'
import { Card, List, SectionTitle } from '../components/ListRows'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import { Empty, Loading, refresher } from '../components/States'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

export default function MeScreen({ navigation }) {
  const app = useApp()
  const p = app.profile
  if (!p) {
    return <Screen refreshControl={refresher(app)}>{app.loading ? <Loading /> : <Empty title="내 정보를 불러오지 못했어요" action="다시 시도" onAction={() => app.refresh()} />}</Screen>
  }
  const progress = p.xp_for_next_level ? Math.min(1, (p.xp_in_level || 0) / p.xp_for_next_level) : 0
  const mine = app.reports.filter((r) => r.i_am_participating && r.status !== 'completed')
  return (
    <Screen refreshControl={refresher(app)}>
      <View style={styles.me}>
        <View style={styles.avatar}>
          <Text style={[text.h1, { fontSize: 26, color: colors.tape }]}>{(p.nickname || '줍').slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[text.cardTitle, { fontSize: 20 }]}>{p.nickname}</Text>
          <Text style={[text.small, { marginTop: 4 }]}>{[app.myCrew ? app.myCrew.name : '크루 없음', p.streak_weeks > 0 ? `${p.streak_weeks}주 연속 활동 중` : null].filter(Boolean).join(' · ')}</Text>
        </View>
        <Text onPress={() => navigation.navigate('Settings')} style={[text.chip, styles.settings]} accessibilityRole="button">
          설정
        </Text>
      </View>

      <Card style={{ gap: 8 }}>
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <XpIcon size={18} />
            <Text style={text.small}>레벨</Text>
          </View>
          <Text style={text.num}>Lv.{p.level}</Text>
        </View>
        <Bar ratio={progress} color={colors.blue} track={colors.panel2} />
        <View style={styles.row}>
          <Text style={text.small}>다음 레벨까지 {Math.max(0, (p.xp_for_next_level || 0) - (p.xp_in_level || 0))}XP</Text>
          <Text style={text.small}>누적 {(p.xp || 0).toLocaleString()}XP</Text>
        </View>
      </Card>

      <Appear from="left">
        <PressScale onPress={() => navigation.navigate('Shop')} accessibilityRole="button" accessibilityLabel="포인트 교환 상점 열기" style={styles.wallet}>
          <View style={styles.slash} />
          <PointIcon size={30} />
          <View style={{ flex: 1 }}>
            <Text style={text.caption}>내 포인트</Text>
            <CountUp value={p.points || 0} style={[text.point, { fontSize: 26, lineHeight: 30, color: colors.tape }]} />
          </View>
          <View style={styles.shopBtn}>
            <Text style={[text.chip, { color: colors.tapeInk }]}>교환 상점</Text>
          </View>
        </PressScale>
      </Appear>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [p.completed_count || 0, '완료한 의뢰'],
          [p.streak_weeks || 0, '연속 주'],
          [(p.coupons || []).length, '내 쿠폰'],
        ].map(([num, label]) => (
          <Card key={label} style={{ flex: 1, padding: 12, borderRadius: 14 }}>
            <Text style={text.point}>{num}</Text>
            <Text style={[text.caption, { marginTop: 4 }]}>{label}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle>오늘 남은 횟수</SectionTitle>
      <DailyLimits profile={p} />

      {p.rewards?.length > 0 ? (
        <>
          <SectionTitle>받은 제휴 보상</SectionTitle>
          <List rows={p.rewards.map((w, i) => ({ label: w.label, value: w.from, key: i }))} />
        </>
      ) : null}

      <SectionTitle>진행 중인 내 의뢰</SectionTitle>
      <View style={{ gap: 14 }}>
        {mine.map((r) => (
          <ReportCard key={r.id} report={r} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
        ))}
        {mine.length === 0 ? <List rows={[{ label: '수락한 의뢰가 없어요', value: '의뢰판에서 골라 보세요', onPress: () => navigation.navigate('Board') }]} /> : null}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.tape, alignItems: 'center', justifyContent: 'center' },
  settings: { color: colors.fg, backgroundColor: colors.panel2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, overflow: 'hidden', ...font.bodyBold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.tape, overflow: 'hidden' },
  slash: { position: 'absolute', right: 96, top: -30, bottom: -30, width: 40, backgroundColor: 'rgba(255,212,59,0.12)', transform: [{ skewX: '-18deg' }] },
  shopBtn: { backgroundColor: colors.tape, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
})
