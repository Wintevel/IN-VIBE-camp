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

// 해결 확인: 인증이 올라오면 사진을 보고 정말 치워졌는지 답합니다. 답은 곧 투표이고, "치워졌어요"가 절반 이상 모여야 해결한 이웃이 보상을 받습니다.
// 받는 사람: 의뢰를 올린 사람, 하트를 누른 사람, 무작위로 뽑힌 이웃, 크루 의뢰는 크루장.
const ROLE = { author: '내가 올린 제보', heart: '내가 하트를 누른 곳', random: '이웃 확인 요청', owner: '우리 크루 의뢰', crew: '우리 크루 의뢰' }
const CLOSED = { approved: '확인이 끝나 보상이 지급됐어요', rejected: '아직이라는 의견이 많아 의뢰가 다시 열렸어요', staff_review: '운영진이 확인하고 있어요' }
export default function NoticesScreen({ navigation }) {
  const app = useApp()
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="해결 확인" sub="사진을 보고 정말 치워졌는지 알려 주세요. 절반 이상이 확인해야 보상이 지급돼요" action="닫기" onAction={() => navigation.goBack()} />
        {app.notices.length === 0 ? <Empty title="확인할 알림이 없어요" sub="제보하거나 하트를 누른 의뢰에 인증이 올라오면 여기로 알려 드려요" /> : null}
        {app.notices.map((n) => (
          <Card key={n.id} style={{ gap: 12 }}>
            <View>
              {ROLE[n.role] ? <Text style={[text.caption, { color: colors.tape, marginBottom: 2 }]}>{ROLE[n.role]}</Text> : null}
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
              <View style={{ gap: 4 }}>
                <Text style={[text.chip, { color: n.answer === 'ok' ? colors.green : colors.red }]}>{n.answer === 'ok' ? '치워졌다고 확인했어요' : '아직이라고 알렸어요'}</Text>
                {CLOSED[n.claim_status] ? <Text style={text.small}>{CLOSED[n.claim_status]}</Text> : null}
              </View>
            ) : n.can_dispute ? (
              // 개편(7-1): 바로 지급된 인증도 이의 기간에는 답할 수 있습니다. "아직이에요"가 모이면 운영진이 다시 봅니다.
              <View style={{ gap: 8 }}>
                <Text style={text.small}>보상은 이미 지급됐어요. 사진이 이상하면 알려 주세요</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button type="ghost" onPress={() => app.answerNotice(n.id, 'not')}>
                    아직이에요
                  </Button>
                  <Button onPress={() => app.answerNotice(n.id, 'ok')}>치워졌어요</Button>
                </View>
              </View>
            ) : CLOSED[n.claim_status] ? (
              <Text style={text.small}>{CLOSED[n.claim_status]}</Text>
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
