import { Text, View } from 'react-native'
import Button from '../components/Button'
import { Card } from '../components/ListRows'
import Screen from '../components/Screen'
import { useApp } from '../state/AppState'
import { text } from '../theme'

// 크루 가입 방식(초대·승인)과 1인 1크루 여부는 미정(docs/api.md ?). 지금은 바로 가입으로 둡니다.
export default function CrewJoinScreen({ navigation }) {
  const app = useApp()
  return (
    <Screen>
      <Text style={text.h1}>크루 찾기</Text>
      <Text style={text.small}>우리 동네에서 함께 줍는 크루예요.</Text>
      {app.crewsToJoin.map((c) => (
        <Card key={c.name} style={{ gap: 10 }}>
          <View>
            <Text style={text.cardTitle}>{c.name}</Text>
            <Text style={[text.small, { marginTop: 2 }]}>{c.meta}</Text>
          </View>
          <Button
            type="weak"
            style={{ flex: 0 }}
            onPress={() => {
              app.joinCrew(c.name)
              navigation.goBack()
            }}
          >
            가입하기
          </Button>
        </Card>
      ))}
    </Screen>
  )
}
