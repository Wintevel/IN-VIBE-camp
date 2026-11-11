import { Text, View } from 'react-native'
import { Card, SectionTitle } from '../components/ListRows'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty, refresher } from '../components/States'
import { isCrew } from '../lib/format'
import { useApp } from '../state/AppState'
import { text } from '../theme'

// 서버에 크루(생성·가입)와 랭킹이 아직 없어서, 지금은 여럿이 함께하는 크루 의뢰만 보여줍니다.
export default function CrewScreen({ navigation }) {
  const app = useApp()
  const list = app.reports.filter((r) => isCrew(r) && r.status !== 'completed')
  const mine = list.filter((r) => r.i_am_participating)
  const others = list.filter((r) => !r.i_am_participating)
  const card = (r) => <ReportCard key={r.id} report={r} mine={r.reporter_id === app.userId} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
  return (
    <Screen refreshControl={refresher(app)}>
      <ScreenHeader title="크루" sub="여럿이 모여야 시작되는 의뢰예요" action="크루 의뢰 올리기" onAction={() => navigation.navigate('ReportCreate')} />
      {mine.length > 0 ? (
        <>
          <SectionTitle>내가 참여한 크루 의뢰</SectionTitle>
          <View style={{ gap: 14 }}>{mine.map(card)}</View>
        </>
      ) : null}
      <SectionTitle>인원을 모으는 중</SectionTitle>
      <View style={{ gap: 14 }}>
        {others.map(card)}
        {others.length === 0 ? <Empty title="모집 중인 크루 의뢰가 없어요" sub="제보할 때 필요한 인원을 2명 이상으로 올리면 크루 의뢰가 돼요" /> : null}
      </View>
      <Card style={{ gap: 6 }}>
        <Text style={text.section}>크루 만들기와 랭킹은 준비 중이에요</Text>
        <Text style={text.small}>서버에 크루 기능이 들어오면 이 화면에 가입한 크루와 시즌 순위가 나와요.</Text>
      </Card>
    </Screen>
  )
}
