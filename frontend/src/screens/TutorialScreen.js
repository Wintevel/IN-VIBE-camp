import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from '../components/BoardBackground'
import Button from '../components/Button'
import GuideIcon from '../components/GuideIcon'
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

        <Appear key={i} from="right" style={styles.body}>
          {g ? (
            <>
              <GuideIcon name={g.icon} size={72} />
              <Text style={[text.h1, { fontSize: 30, lineHeight: 38 }]}>{g.title}</Text>
              <Text style={[text.regular, { color: colors.sub }]}>{g.lead}</Text>
              <View style={styles.points}>
                {g.points.map((p) => (
                  <View key={p} style={styles.point}>
                    <View style={styles.bullet} />
                    <Text style={[text.regular, { flex: 1 }]}>{p}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Logo size={88} />
              <Text style={[text.h1, { fontSize: 34, lineHeight: 42 }]}>집게표에 온 걸 환영해요</Text>
              <Text style={[text.regular, { color: colors.sub }]}>동네의 치울 곳을 이웃이 알리고, 근처에 있는 사람이 해결하는 앱이에요. 쓰는 법을 1분만 볼게요.</Text>
            </>
          )}
        </Appear>

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
  body: { gap: 16 },
  points: { gap: 12, marginTop: 8, backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tape, marginTop: 9 },
})
