import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import { Card, List, SectionTitle } from '../components/ListRows'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Stamp from '../components/Stamp'
import { CREWS, MY_CREW, SEASON } from '../data/mock'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

export default function CrewScreen({ navigation }) {
  const { crew } = useApp()
  const top = CREWS[0].score
  return (
    <Screen>
      <ScreenHeader title="크루 랭킹" sub={SEASON.period} />
      <Card style={styles.season}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={text.title}>{SEASON.title}</Text>
          <Text style={text.caption}>{SEASON.note}</Text>
        </View>
        <Stamp type="partner">{SEASON.label}</Stamp>
      </Card>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {CREWS.map((c, i) => {
          const mine = c.name === crew
          return (
            <View key={c.name} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }, mine && { backgroundColor: colors.blueWeak }]}>
              <Text style={[text.point, { width: 36, textAlign: 'center', color: i === 0 ? colors.tape : colors.sub }]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[text.section, { fontSize: 15 }]}>{c.name}</Text>
                <Text style={[text.caption, { marginTop: 2 }]}>{c.meta}</Text>
                <View style={styles.bar}>
                  <View style={{ width: `${Math.round((c.score / top) * 100)}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
                </View>
              </View>
              <Text style={text.monoPoint}>{c.score.toLocaleString()}</Text>
            </View>
          )
        })}
      </Card>

      {crew ? (
        <>
          <SectionTitle>우리 크루 · {crew}</SectionTitle>
          <List rows={MY_CREW.stats.map(([label, value]) => ({ label, value }))} />
          <Button style={{ flex: 0 }} onPress={() => navigation.navigate('CrewQuestCreate')}>
            크루 의뢰 올리기
          </Button>
        </>
      ) : (
        <Card style={{ gap: 12 }}>
          <Text style={text.section}>아직 크루가 없어요</Text>
          <Text style={text.small}>크루에 가입하면 함께 치운 점수가 모여 랭킹에 올라가요.</Text>
          <Button style={{ flex: 0 }} onPress={() => navigation.navigate('CrewJoin')}>
            크루 찾기
          </Button>
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  season: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  bar: { height: 6, backgroundColor: colors.panel2, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
})
