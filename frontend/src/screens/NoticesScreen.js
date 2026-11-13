import { Image, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import Button from '../components/Button'
import { Card } from '../components/ListRows'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty } from '../components/States'
import Toast from '../components/Toast'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 해결 확인 알림: 내가 제보했거나 하트를 누른 의뢰가 해결되면 사진을 보고 정말 치워졌는지 답합니다.
export default function NoticesScreen({ navigation }) {
  const app = useApp()
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="해결 확인" sub="내가 제보하거나 하트를 누른 곳이 치워졌는지 봐 주세요" action="닫기" onAction={() => navigation.goBack()} />
        {app.notices.length === 0 ? <Empty title="확인할 알림이 없어요" sub="제보하거나 하트를 누른 의뢰가 해결되면 여기로 알려 드려요" /> : null}
        {app.notices.map((n) => (
          <Card key={n.id} style={{ gap: 12 }}>
            <View>
              <Text style={text.cardTitle}>{n.title}</Text>
              <Text style={[text.small, { marginTop: 2 }]}>{n.solver} 님이 해결했다고 올렸어요</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(n.single ? [['사진', n.before_path]] : [['치우기 전', n.before_path], ['치운 뒤', n.after_path]]).map(([label, path]) => (
                <View key={label} style={styles.photo}>
                  {photoUrl(path) ? <Image source={{ uri: photoUrl(path) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`${label} 사진`} /> : null}
                  <View style={styles.tag}>
                    <Text style={[text.chip, { color: colors.fg }]}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>
            {n.answer ? (
              <Text style={[text.chip, { color: n.answer === 'ok' ? colors.green : colors.red }]}>{n.answer === 'ok' ? '치워졌다고 확인했어요' : '아직이라고 알렸어요'}</Text>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button type="ghost" onPress={() => app.answerNotice(n.id, 'not')}>
                  아직이에요
                </Button>
                <Button onPress={() => app.answerNotice(n.id, 'ok')}>치워졌어요</Button>
              </View>
            )}
          </Card>
        ))}
      </Screen>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  photo: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.panel2, overflow: 'hidden' },
  tag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(17,19,23,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
})
