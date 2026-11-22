import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from '../components/BoardBackground'
import Button from '../components/Button'
import GuideIcon from '../components/GuideIcon'
import { GuideVisual, Points } from '../components/GuideParts'
import Logo from '../components/Logo'
import { Appear } from '../components/Motion'
import { GUIDE } from '../lib/guide'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

// 처음 시작할 때 한 번 보여 주는 안내. 같은 내용을 내 정보 > 도움말에서 다시 볼 수 있습니다.
export default function TutorialScreen() {
  const app = useApp()
  const insets = useSafeAreaInsets()
  const [i, setI] = useState(-1) // -1: 환영 화면
  const last = i === GUIDE.length - 1
  const g = GUIDE[i]
  return (
    <BoardBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <View style={styles.dots} accessibilityLabel={`${i + 2} / ${GUIDE.length + 1}`}>
            {[-1, ...GUIDE.keys()].map((n) => (
              <View key={n} style={[styles.dot, n === i && styles.dotOn]} />
            ))}
          </View>
          <Text onPress={app.finishTutorial} accessibilityRole="button" style={[text.chip, { color: colors.sub, padding: 6 }]}>
            건너뛰기
          </Text>
        </View>

        <ScrollView style={{ flex: 1, marginVertical: 16 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Appear key={i} from="right" style={styles.body}>
            {g ? (
              <>
                <GuideIcon name={g.icon} size={64} />
                <View style={{ gap: 6 }}>
                  <Text style={[text.h1, { fontSize: 28, lineHeight: 36 }]}>{g.title}</Text>
                  <Text style={[text.regular, { color: colors.sub }]}>{g.lead}</Text>
                </View>
                <View style={styles.panel}>
                  <GuideVisual g={g} />
                </View>
                <Points points={g.points} big />
              </>
            ) : (
              <>
                <Logo size={88} />
                <Text style={[text.h1, { fontSize: 34, lineHeight: 42 }]}>집게표</Text>
                <Text style={[text.regular, { color: colors.sub }]}>이웃이 알린 쓰레기를 근처 사람이 치워요.</Text>
                <View style={styles.panel}>
                  <GuideVisual g={{ flow: [['camera', '이웃이 제보'], ['board', '내가 수락'], ['check', '치우고 인증'], ['point', '보상']] }} />
                </View>
              </>
            )}
          </Appear>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {i >= 0 ? (
            <Button type="ghost" onPress={() => setI(i - 1)}>
              이전
            </Button>
          ) : null}
          <Button onPress={() => (last ? app.finishTutorial() : setI(i + 1))}>{last ? '시작하기' : '다음'}</Button>
        </View>
      </View>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 22, backgroundColor: colors.tape },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  body: { gap: 18 },
  panel: { gap: 12, backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16 },
})
