import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import { GiftIcon, PointIcon } from '../components/Icons'
import { Card, SectionTitle } from '../components/ListRows'
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

  const [wearing, setWearing] = useState(null)
  const wear = async (item) => {
    setWearing(item.id)
    await app.wearCosmetic(item)
    setWearing(null)
  }

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
        <ScreenHeader title="포인트 상점" sub="모은 포인트로 상품을 바꾸거나 프로필을 꾸며요" action="닫기" onAction={() => navigation.goBack()} />
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

        {app.cosmetics.length > 0 ? (
          <>
            <SectionTitle>프로필 꾸미기</SectionTitle>
            {app.cosmetics.map((it) => {
              const can = it.owned || (!it.locked && points >= it.cost)
              const label = it.equipped ? '착용 중' : it.owned ? '착용' : it.locked ? `Lv.${it.level}` : wearing === it.id ? '구매 중…' : '구매'
              return (
                <Card key={it.id} style={styles.item}>
                  <View style={[styles.thumb, it.kind === 'frame' ? { borderWidth: 3, borderColor: it.color } : null]}>
                    {it.kind === 'name' ? <Text style={[text.section, { color: it.color }]}>가</Text> : null}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={text.section}>{it.name}</Text>
                    {it.cost > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <PointIcon size={16} />
                        <Text style={[text.num, { fontSize: 16, color: colors.tape }]}>{it.cost.toLocaleString()}</Text>
                        {it.owned ? <Text style={text.caption}>보유</Text> : null}
                      </View>
                    ) : (
                      <Text style={text.caption}>{it.level > 1 ? `레벨 ${it.level}이 되면 열려요 · 포인트로 살 수 없어요` : '기본'}</Text>
                    )}
                  </View>
                  <Button type={it.equipped ? 'weak' : 'primary'} disabled={it.equipped || !can || wearing === it.id} compact onPress={() => wear(it)}>
                    {label}
                  </Button>
                </Card>
              )
            })}
          </>
        ) : null}

        <SectionTitle>내 쿠폰</SectionTitle>
        {coupons.length === 0 ? <Text style={text.small}>교환한 쿠폰이 여기에 모여요.</Text> : null}
        {coupons.map((c) => (
          <View key={c.code} style={styles.coupon}>
            <View style={{ flex: 1 }}>
              <Text style={[text.section, { color: colors.tapeInk }]}>{c.name}</Text>
              <Text style={[text.caption, { color: colors.tapeInk, opacity: 0.7 }]}>{new Date(c.at).toLocaleDateString('ko-KR')}</Text>
            </View>
            <Text style={[text.monoPoint, { color: colors.tapeInk }]}>{c.code}</Text>
          </View>
        ))}
        {app.localMode ? <Text style={text.caption}>상품·꾸미기 품목과 가격은 예시예요. 실제 쿠폰 발급은 아직 연결되어 있지 않아요.</Text> : null}
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
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.tape, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
})
