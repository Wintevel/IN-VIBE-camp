import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty } from '../components/States'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 보관함: 상점에서 바꾼 쿠폰과 제휴 의뢰로 받은 보상을 한곳에서 봅니다(최근 순).
export default function VaultScreen({ navigation }) {
  const app = useApp()
  const p = app.profile || {}
  const items = [
    ...(p.coupons || []).map((c) => ({ kind: '쿠폰', name: c.name, from: '포인트 상점', code: c.code, at: c.at })),
    ...(p.rewards || []).map((w) => ({ kind: '제휴 보상', name: w.label, from: w.from, code: null, at: w.at })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return (
    <Screen>
      <ScreenHeader title="보관함" sub="바꾼 쿠폰과 받은 제휴 보상이 모여요" action="닫기" onAction={() => navigation.goBack()} />
      {items.length === 0 ? <Empty title="아직 받은 것이 없어요" sub="포인트로 상품을 바꾸거나 제휴 의뢰를 해결해 보세요" /> : null}
      {items.map((it, i) => {
        const coupon = it.kind === '쿠폰'
        return (
          <View key={`${it.kind}-${it.code || i}-${it.at}`} style={[styles.ticket, !coupon && styles.reward]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[text.caption, { color: coupon ? colors.tapeInk : colors.blue, opacity: coupon ? 0.7 : 1 }]}>
                {it.kind} · {it.from}
              </Text>
              <Text style={[text.section, coupon && { color: colors.tapeInk }]}>{it.name}</Text>
              <Text style={[text.caption, coupon && { color: colors.tapeInk, opacity: 0.7 }]}>{new Date(it.at).toLocaleDateString('ko-KR')}</Text>
            </View>
            {it.code ? <Text style={[text.monoPoint, { color: colors.tapeInk }]}>{it.code}</Text> : <Text style={text.caption}>수령 안내 예정</Text>}
          </View>
        )
      })}
      <Button type="weak" style={{ flex: 0 }} onPress={() => navigation.navigate('Shop')}>
        포인트 상점 가기
      </Button>
      {app.localMode ? <Text style={text.caption}>쿠폰 번호와 제휴 보상은 예시예요. 실제 발급은 아직 연결되어 있지 않아요.</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.tape, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  reward: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.blue },
})
