import { StyleSheet, Text, View } from 'react-native'
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
          <Text style={[text.small, { marginTop: 4 }]}>{p.streak_weeks > 0 ? `${p.streak_weeks}주 연속 활동 중` : '이번 주 첫 활동을 시작해 보세요'}</Text>
        </View>
        <Text onPress={() => navigation.navigate('Settings')} style={[text.chip, styles.settings]} accessibilityRole="button">
          설정
        </Text>
      </View>

      <Card style={{ gap: 8 }}>
        <View style={styles.row}>
          <Text style={text.small}>레벨</Text>
          <Text style={text.num}>Lv.{p.level}</Text>
        </View>
        <View style={styles.bar}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
        </View>
        <View style={styles.row}>
          <Text style={text.small}>다음 레벨까지 {Math.max(0, (p.xp_for_next_level || 0) - (p.xp_in_level || 0))}XP</Text>
          <Text style={text.small}>누적 {(p.xp || 0).toLocaleString()}XP</Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [(p.points || 0).toLocaleString(), '포인트'],
          [p.completed_count || 0, '완료한 의뢰'],
          [p.streak_weeks || 0, '연속 주'],
        ].map(([num, label]) => (
          <Card key={label} style={{ flex: 1, padding: 12, borderRadius: 14 }}>
            <Text style={text.point}>{num}</Text>
            <Text style={[text.caption, { marginTop: 4 }]}>{label}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle>진행 중인 내 의뢰</SectionTitle>
      <View style={{ gap: 14 }}>
        {mine.map((r) => (
          <ReportCard key={r.id} report={r} mine={r.reporter_id === app.userId} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
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
  bar: { height: 6, backgroundColor: colors.panel2, borderRadius: 99, overflow: 'hidden' },
})
