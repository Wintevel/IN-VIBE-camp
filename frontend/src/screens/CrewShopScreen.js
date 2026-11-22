import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import AvatarFrame from '../components/AvatarFrame'
import Button from '../components/Button'
import { CrewPointIcon, CrewXpIcon, LockIcon } from '../components/Icons'
import { Card } from '../components/ListRows'
import { Appear, CountUp, ND, PressScale, reduced } from '../components/Motion'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty } from '../components/States'
import Toast from '../components/Toast'
import { titleText } from '../lib/achievements'
import { CREW_TIERS } from '../lib/cosmetics'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 크루 상점: 크루 포인트(크루 경험치를 얻은 만큼 쌓이는 개인 재화)로 꾸미기를 삽니다.
// 크루 레벨이 오를수록 살 수 있는 단계가 열립니다. 지금은 전부 치장용입니다.
// 칸을 누르면 위 미리보기가 바뀌고, 아래 버튼으로 사거나 착용합니다.
export default function CrewShopScreen({ navigation }) {
  const app = useApp()
  const p = app.profile || {}
  const shop = app.crewShop
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const letter = (p.nickname || '줍').slice(0, 1)
  const items = shop?.items || []
  const points = shop?.crew_points || 0
  const level = shop?.crew_level || 0
  const sel = items.find((c) => c.id === picked) || items.find((c) => c.equipped) || items.find((c) => !c.locked) || items[0]

  const pop = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (reduced() || picked == null) return
    pop.setValue(0.86)
    Animated.spring(pop, { toValue: 1, speed: 18, bounciness: 14, useNativeDriver: ND }).start()
  }, [picked, pop])

  if (!shop || !shop.in_crew) {
    return (
      <View style={{ flex: 1 }}>
        <Screen>
          <ScreenHeader title="크루 상점" action="닫기" onAction={() => navigation.goBack()} />
          <Empty title={shop && !shop.ready ? '크루 상점을 준비하고 있어요' : '크루에 들어가면 열려요'} sub="크루원으로 의뢰를 해결하면 크루 포인트가 쌓여요" />
        </Screen>
      </View>
    )
  }

  const frame = sel?.kind === 'frame' ? sel : p.frame
  const nameColor = sel?.kind === 'name' ? sel.colors[0] : p.name_color
  const title = titleText(p, app.myCrew)
  const short = sel && !sel.owned && sel.crew_cost > points
  const how = !sel ? '' : sel.owned ? (sel.equipped ? '착용 중' : '보유 중 · 눌러서 착용') : sel.locked ? `크루 Lv.${sel.crew_level} 달성 시 해제` : `${sel.crew_cost.toLocaleString()} 크루 포인트`
  const label = !sel ? '' : sel.equipped ? '착용 중' : sel.owned ? '착용하기' : short ? `${(sel.crew_cost - points).toLocaleString()} 크루 포인트 부족` : `${sel.crew_cost.toLocaleString()} 크루 포인트로 구매`
  const buy = async () => {
    setBusy(true)
    await app.buyCrewItem(sel)
    setBusy(false)
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={110}>
        <ScreenHeader title="크루 상점" sub={app.myCrew ? `${app.myCrew.name} 크루원 전용` : undefined} action="닫기" onAction={() => navigation.goBack()} />
        <Appear from="left">
          <View style={styles.wallet}>
            <View style={styles.slash} />
            <View style={[styles.slash, { right: 132, width: 10 }]} />
            <CrewPointIcon size={34} />
            <View style={{ flex: 1 }}>
              <Text style={text.caption}>내 크루 포인트</Text>
              <CountUp value={points} style={[text.point, { fontSize: 26, lineHeight: 30, color: colors.mint }]} />
            </View>
            <View style={styles.lv}>
              <CrewXpIcon size={16} />
              <Text style={[text.num, { fontSize: 15, color: colors.purple }]}>크루 Lv.{level}</Text>
            </View>
          </View>
        </Appear>
        <Text style={text.caption}>크루 경험치를 얻은 만큼 크루 포인트가 쌓여요. 크루 레벨이 오를수록 살 수 있는 상품이 늘어나요.</Text>

        {sel ? (
          <Card style={styles.preview}>
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: pop }] }}>
              <AvatarFrame frame={frame} size={84} letter={letter} uri={p.avatar_url} />
              <Text style={[text.cardTitle, { fontSize: 20, marginTop: 14 }, nameColor && { color: nameColor }]}>{p.nickname}</Text>
              {title ? <Text style={[text.chip, { color: colors.tape, marginTop: 4 }]}>{title}</Text> : null}
            </Animated.View>
            <View style={styles.info}>
              <Text style={text.section}>{sel.name}</Text>
              <Text style={text.caption}>{`${sel.kind === 'frame' ? '테두리' : '닉네임 색'} · ${how}`}</Text>
            </View>
          </Card>
        ) : null}

        {CREW_TIERS.map((tier, ti) => {
          const open = level >= tier
          const row = items.filter((c) => c.crew_level === tier)
          return (
            <Appear key={tier} index={ti} style={{ gap: 10 }}>
              <View style={styles.tierHead}>
                <View style={[styles.tierBadge, open ? styles.tierOpen : null]}>
                  <Text style={[text.stamp, { color: open ? colors.ink : colors.sub }]}>크루 Lv.{tier}</Text>
                </View>
                <View style={[styles.tierLine, open && { backgroundColor: 'rgba(169,124,255,0.4)' }]} />
                {open ? (
                  <Text style={[text.caption, { color: colors.purple }]}>열림</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <LockIcon size={11} color={colors.sub} />
                    <Text style={text.caption}>{`Lv.${tier} 달성 시 해제`}</Text>
                  </View>
                )}
              </View>
              <View style={styles.grid}>
                {row.map((c) => {
                  const active = sel && c.id === sel.id
                  return (
                    <View key={c.id} style={styles.slot}>
                      <PressScale onPress={() => setPicked(c.id)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${c.name}, ${c.owned ? '보유' : c.locked ? '잠김' : `${c.crew_cost} 크루 포인트`}`} style={[styles.cell, active && styles.cellOn, c.locked && { opacity: 0.55 }]}>
                        <View style={styles.art}>{c.kind === 'frame' ? <AvatarFrame frame={c} size={52} letter="" /> : <Text style={[text.title, { fontSize: 30, lineHeight: 36, color: c.colors[0] }]}>가</Text>}</View>
                        <Text numberOfLines={2} style={[text.chip, { textAlign: 'center', color: c.locked ? colors.sub : colors.fg }]}>
                          {c.name}
                        </Text>
                        {c.owned ? (
                          <Text style={[styles.badge, c.equipped && styles.badgeOn]}>{c.equipped ? '착용 중' : '보유'}</Text>
                        ) : (
                          <View style={styles.price}>
                            {c.locked ? <LockIcon size={10} color={colors.sub} /> : <CrewPointIcon size={13} />}
                            <Text style={[text.num, { fontSize: 13, lineHeight: 16, color: c.locked ? colors.sub : colors.mint }]}>{c.crew_cost.toLocaleString()}</Text>
                          </View>
                        )}
                      </PressScale>
                    </View>
                  )
                })}
              </View>
            </Appear>
          )
        })}
        {!shop.ready ? <Text style={text.caption}>서버에 크루 상점이 열리면 살 수 있어요. 지금은 둘러보기만 돼요.</Text> : null}
      </Screen>
      <View style={styles.bar}>
        <Button type="ghost" onPress={() => navigation.goBack()}>
          닫기
        </Button>
        {sel && sel.locked && !sel.owned ? (
          <View style={styles.lockInfo} accessibilityLabel={`잠김. 크루 레벨 ${sel.crew_level} 달성 시 해제`}>
            <View style={styles.lockBig}>
              <LockIcon size={14} />
            </View>
            <Text style={[text.chip, { flex: 1, color: colors.fg }]}>{`크루 Lv.${sel.crew_level} 달성 시 해제`}</Text>
          </View>
        ) : (
          <Button disabled={!sel || !shop.ready || sel.equipped || short || busy} onPress={buy} style={{ flex: 2 }}>
            {busy ? '처리 중…' : label}
          </Button>
        )}
      </View>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.mint, overflow: 'hidden' },
  slash: { position: 'absolute', right: 70, top: -30, bottom: -30, width: 44, backgroundColor: 'rgba(92,225,200,0.12)', transform: [{ skewX: '-18deg' }] },
  lv: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(169,124,255,0.14)' },
  preview: { alignItems: 'center', paddingTop: 34, paddingBottom: 14 },
  info: { alignSelf: 'stretch', marginTop: 16, gap: 2, padding: 12, borderRadius: radius.md, backgroundColor: colors.panel2 },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.panel2, transform: [{ skewX: '-10deg' }] },
  tierOpen: { backgroundColor: colors.purple },
  tierLine: { flex: 1, height: 1, backgroundColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '48.5%' },
  cell: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: radius.cardSm, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.line },
  cellOn: { borderColor: colors.mint, backgroundColor: 'rgba(92,225,200,0.08)' },
  art: { height: 74, alignItems: 'center', justifyContent: 'center' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { fontSize: 11, lineHeight: 16, color: colors.fg, backgroundColor: colors.panel2, paddingHorizontal: 8, borderRadius: radius.pill, overflow: 'hidden', fontWeight: '700' },
  badgeOn: { color: colors.tapeInk, backgroundColor: colors.mint },
  lockInfo: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.cardSm, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line },
  lockBig: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.disabled, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 24, backgroundColor: colors.ink, borderTopWidth: 1, borderTopColor: colors.line },
})
