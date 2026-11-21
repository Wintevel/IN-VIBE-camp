import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import { GiftIcon, PointIcon } from '../components/Icons'
import { Card, ListRow, SectionTitle } from '../components/ListRows'
import { Appear, CountUp } from '../components/Motion'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty } from '../components/States'
import Toast from '../components/Toast'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 포인트 교환 상점. 포인트는 현금이 아니라 앱 안에서 쌓아 상품으로 바꾸는 적립금입니다.
export default function ShopScreen({ navigation }) {
  const app = useApp()
  const [busy, setBusy] = useState(null)
  const [picked, setPicked] = useState(null)
  const points = app.profile?.points || 0
  const coupons = app.profile?.coupons || []


  const redeem = async (item) => {
    if (picked !== item.id) return setPicked(item.id)
    setBusy(item.id)
    await app.redeem(item)
    setBusy(null)
    setPicked(null)
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="포인트 상점" sub="모은 포인트로 상품을 바꿔요" action="닫기" onAction={() => navigation.goBack()} />
        <Appear from="left">
          <View style={styles.wallet}>
            <View style={styles.slash} />
            <PointIcon size={34} />
            <View style={{ flex: 1 }}>
              <Text style={text.caption}>내 포인트</Text>
              <CountUp value={points} style={[text.h1, { color: colors.tape }]} />
            </View>
          </View>
        </Appear>

        <SectionTitle>교환할 수 있는 상품</SectionTitle>
        {app.shop.map((it, i) => {
          const can = points >= it.cost
          const on = picked === it.id
          return (
            <Appear key={it.id} index={i}>
              <Card style={[styles.item, on && { borderColor: colors.tape }]}>
                <View style={styles.thumb}>
                  <GiftIcon size={24} color={can ? colors.tape : colors.disabled} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={text.section}>{it.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <PointIcon size={16} />
                    <Text style={[text.num, { fontSize: 16, color: colors.tape }]}>{it.cost.toLocaleString()}</Text>
                    {!can ? <Text style={text.caption}>{(it.cost - points).toLocaleString()} 부족</Text> : null}
                  </View>
                </View>
                <Button type={on ? 'primary' : 'weak'} disabled={!can || busy === it.id} compact onPress={() => redeem(it)}>
                  {busy === it.id ? '교환 중…' : on ? '확인' : '교환'}
                </Button>
              </Card>
            </Appear>
          )
        })}
        {app.shop.length === 0 ? <Empty title="준비된 상품이 없어요" /> : null}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {app.canStyle ? <ListRow label="프로필 꾸미기" value="테두리·닉네임 색·칭호" onPress={() => navigation.navigate('Style')} /> : null}
          <View style={app.canStyle && { borderTopWidth: 1, borderTopColor: colors.line }}>
            <ListRow label="보관함" value={`쿠폰·제휴 보상 ${coupons.length + (app.profile?.rewards || []).length}개`} onPress={() => navigation.navigate('Vault')} />
          </View>
        </Card>
        {app.localMode ? <Text style={text.caption}>상품과 가격은 예시예요. 실제 쿠폰 발급은 아직 연결되어 있지 않아요.</Text> : null}
      </Screen>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.tape, overflow: 'hidden' },
  slash: { position: 'absolute', right: 30, top: -30, bottom: -30, width: 60, backgroundColor: 'rgba(255,212,59,0.12)', transform: [{ skewX: '-18deg' }] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
})
