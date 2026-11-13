import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import GuideIcon from '../components/GuideIcon'
import { Card } from '../components/ListRows'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { GUIDE } from '../lib/guide'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

// 도움말: 튜토리얼과 같은 내용을 한 화면에 정리해 보여 줍니다.
export default function HelpScreen({ navigation }) {
  const app = useApp()
  return (
    <Screen>
      <ScreenHeader title="도움말" sub="집게표를 쓰는 법과 규칙" action="닫기" onAction={() => navigation.goBack()} />
      {GUIDE.map((g) => (
        <Card key={g.key} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <GuideIcon name={g.icon} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={text.cardTitle}>{g.title}</Text>
              <Text style={[text.small, { marginTop: 2 }]}>{g.lead}</Text>
            </View>
          </View>
          {g.points.map((p) => (
            <View key={p} style={styles.point}>
              <View style={styles.bullet} />
              <Text style={[text.small, { flex: 1, color: colors.fg }]}>{p}</Text>
            </View>
          ))}
        </Card>
      ))}
      <Button type="ghost" style={{ flex: 0 }} onPress={app.replayTutorial}>
        처음 안내 다시 보기
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.tape, marginTop: 8 },
})
