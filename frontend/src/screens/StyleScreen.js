import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import AvatarFrame from '../components/AvatarFrame'
import Button from '../components/Button'
import { PointIcon } from '../components/Icons'
import { Card, SectionTitle } from '../components/ListRows'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Toast from '../components/Toast'
import { statsOf, titleOptions, titleText } from '../lib/achievements'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 프로필 꾸미기: 사진, 칭호, 테두리, 닉네임 색을 한곳에서 고릅니다.
export default function StyleScreen({ navigation }) {
  const app = useApp()
  const p = app.profile || {}
  const [busy, setBusy] = useState(null)
  const points = p.points || 0
  const titles = titleOptions(statsOf(p, app.myCrew))
  const current = titleText(p, app.myCrew)

  // 폰 갤러리(웹은 파일 선택)에서 한 장을 골라 정사각형으로 자릅니다.
  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 })
      if (res.canceled || !res.assets?.[0]?.uri) return
      setBusy('photo')
      await app.saveAvatar(res.assets[0].uri)
    } catch {
      app.showToast('사진을 불러오지 못했어요. 사진 접근 권한을 확인해 주세요')
    } finally {
      setBusy(null)
    }
  }
  const wear = async (item) => {
    setBusy(item.id)
    await app.wearCosmetic(item)
    setBusy(null)
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="프로필 꾸미기" action="닫기" onAction={() => navigation.goBack()} />

        <Card style={styles.preview}>
          <AvatarFrame frame={p.frame} size={84} letter={(p.nickname || '줍').slice(0, 1)} uri={p.avatar_url} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[text.cardTitle, { fontSize: 20 }, p.name_color && { color: p.name_color }]}>{p.nickname}</Text>
            <Text style={[text.chip, { color: colors.tape }]}>{current}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <PointIcon size={14} />
              <Text style={text.caption}>{points.toLocaleString()} 포인트</Text>
            </View>
          </View>
        </Card>

        <SectionTitle>프로필 사진</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button type="weak" disabled={busy === 'photo'} onPress={pickPhoto}>
            {busy === 'photo' ? '바꾸는 중…' : '갤러리에서 고르기'}
          </Button>
          {p.avatar_url ? (
            <Button type="ghost" onPress={() => app.saveAvatar(null)}>
              기본으로
            </Button>
          ) : null}
        </View>
        <Text style={text.caption}>사진은 다른 이웃에게도 보여요. 얼굴이 나온 사진은 신중하게 골라 주세요.</Text>

        <SectionTitle>칭호</SectionTitle>
        <View style={styles.titles}>
          {titles.map((t) => {
            const on = t.label === current
            return (
              <Pressable
                key={t.key}
                disabled={!t.open || on}
                onPress={() => app.saveTitle(t.key, t.label)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !t.open }}
                accessibilityLabel={t.open ? t.label : `잠긴 칭호, ${t.how}`}
                style={[styles.title, on && styles.titleOn, !t.open && { opacity: 0.55 }]}
              >
                <Text style={[text.chip, { color: on ? colors.tapeInk : t.open ? colors.fg : colors.sub }]}>{t.open ? t.label : '???'}</Text>
                {t.open ? null : <Text style={text.caption}>{t.how}</Text>}
              </Pressable>
            )
          })}
        </View>
        <Text style={text.caption}>레벨을 올리거나 도전과제를 달성하면 칭호가 열려요.</Text>

        {[
          ['frame', '테두리'],
          ['name', '닉네임 색'],
        ].map(([kind, label]) => (
          <View key={kind} style={{ gap: 14 }}>
            <SectionTitle>{label}</SectionTitle>
            {app.cosmetics
              .filter((it) => it.kind === kind)
              .map((it) => {
                const can = it.owned || (!it.locked && points >= it.cost)
                const btn = it.equipped ? '착용 중' : it.owned ? '착용' : it.locked ? `Lv.${it.level}` : busy === it.id ? '구매 중…' : '구매'
                return (
                  <Card key={it.id} style={[styles.item, it.equipped && { borderColor: colors.tape }]}>
                    {kind === 'frame' ? (
                      <View style={styles.thumbBox}>
                        <AvatarFrame frame={it} size={40} letter={(p.nickname || '줍').slice(0, 1)} uri={p.avatar_url} />
                      </View>
                    ) : (
                      <View style={[styles.thumbBox, styles.thumb]}>
                        <Text style={[text.section, { color: it.colors[0] }]}>가</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={text.section}>{it.name}</Text>
                      {it.cost > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <PointIcon size={16} />
                          <Text style={[text.num, { fontSize: 16, color: colors.tape }]}>{it.cost.toLocaleString()}</Text>
                          {it.owned ? <Text style={text.caption}>보유</Text> : points < it.cost ? <Text style={text.caption}>{(it.cost - points).toLocaleString()} 부족</Text> : null}
                        </View>
                      ) : (
                        <Text style={text.caption}>{it.level > 1 ? (it.owned ? `레벨 ${it.level} 달성 보상` : `레벨 ${it.level}이 되면 열려요`) : '기본'}</Text>
                      )}
                    </View>
                    <Button type={it.equipped ? 'weak' : 'primary'} disabled={it.equipped || !can || busy === it.id} compact onPress={() => wear(it)}>
                      {btn}
                    </Button>
                  </Card>
                )
              })}
          </View>
        ))}
        {app.localMode ? <Text style={text.caption}>품목과 가격은 예시예요.</Text> : null}
      </Screen>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingLeft: 26, paddingVertical: 22 },
  titles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line, gap: 2 },
  titleOn: { backgroundColor: colors.tape, borderColor: colors.tape },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumbBox: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  thumb: { borderRadius: radius.md, backgroundColor: colors.panel2 },
})
