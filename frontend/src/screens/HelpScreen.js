import { Text, View } from 'react-native'
import Button from '../components/Button'
import GuideIcon from '../components/GuideIcon'
import { GuideVisual, Points } from '../components/GuideParts'
import { Card } from '../components/ListRows'
import { Appear } from '../components/Motion'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { GUIDE } from '../lib/guide'
import { useApp } from '../state/AppState'
import { text } from '../theme'

// 도움말: 튜토리얼과 같은 내용을 한 화면에 정리해 보여 줍니다. 항목마다 그림(순서·숫자 칸) 먼저, 짧은 문장은 뒤에.
export default function HelpScreen({ navigation }) {
  const app = useApp()
  return (
    <Screen>
      <ScreenHeader title="도움말" sub="집게표를 쓰는 법과 규칙" action="닫기" onAction={() => navigation.goBack()} />
      {GUIDE.map((g, i) => (
        <Appear key={g.key} index={i}>
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <GuideIcon name={g.icon} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={text.cardTitle}>{g.title}</Text>
                <Text style={[text.small, { marginTop: 2 }]}>{g.lead}</Text>
              </View>
            </View>
            <GuideVisual g={g} />
            <Points points={g.points} />
          </Card>
        </Appear>
      ))}
      <Button type="ghost" style={{ flex: 0 }} onPress={app.replayTutorial}>
        처음 안내 다시 보기
      </Button>
    </Screen>
  )
}
