import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import { Appear } from '../components/Motion'
import PhotoSlot from '../components/PhotoSlot'
import { RewardIcon } from '../components/Reward'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Toast from '../components/Toast'
import { PLACES } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, neu, radius, text } from '../theme'

// "바로 치웠어요": 의뢰를 기다리지 않고, 보자마자 치운 것을 전·후 사진으로 기록합니다(2026-11-16 개편).
// 포인트는 없고 경험치만 받습니다. 가짜 제보를 올려 직접 푸는 악용을 막기 위해서입니다.
export default function QuickCleanScreen({ navigation }) {
  const app = useApp()
  const [placeType, setPlaceType] = useState('street')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const p = app.quickPhotos
  const ready = !!(p.before && p.after) && !busy
  const capture = (slot) => navigation.navigate('Capture', { kind: 'quick', slot, title: slot === 'before' ? '치우기 전 사진' : '치운 뒤 사진' })
  const close = () => {
    app.clearQuick()
    navigation.goBack()
  }
  const submit = async () => {
    setBusy(true)
    const d = await app.quickClean({ placeType, title: title.trim() })
    setBusy(false)
    if (d) navigation.goBack()
  }
  const steps = ['치우기 전 모습을 먼저 찍어요', '치우고 나서 같은 자리에서 한 장 더 찍어요', '전 사진을 찍고 1분은 지나야 후 사진을 받아요']

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={32}>
        <ScreenHeader title="바로 치웠어요" sub="의뢰가 없어도 괜찮아요. 보자마자 치운 곳을 기록해요" action="닫기" onAction={close} />
        <Appear from="right" style={styles.reward}>
          <RewardIcon kind="xp" size={18} />
          <Text style={[text.small, { flex: 1, color: colors.fg }]}>경험치를 받고, 동네 지도에 내가 치운 곳으로 남아요. 포인트는 의뢰를 해결할 때만 받아요.</Text>
        </Appear>
        <Appear from="right" index={1} style={{ flexDirection: 'row', gap: 20 }}>
          <PhotoSlot n={1} shot={p.before} label="치우기 전" onPress={() => capture('before')} />
          <PhotoSlot n={2} shot={p.after} label="치운 뒤" onPress={() => capture('after')} />
        </Appear>
        <View style={{ gap: 8 }}>
          {steps.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={styles.step}>
                <Text style={[text.tab, { color: colors.sub }]}>{i + 1}</Text>
              </View>
              <Text style={[text.small, { flex: 1, color: colors.fg }]}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={text.section}>장소 종류</Text>
        <FilterChips options={PLACES} value={placeType} onChange={setPlaceType} />
        <Text style={text.section}>한 줄 기록 (선택)</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="예) 정류장 의자 밑 꽁초" placeholderTextColor={colors.disabled} style={styles.input} maxLength={40} accessibilityLabel="한 줄 기록" />
        <Text style={[text.caption, { color: colors.red }]}>깨진 유리, 주사기처럼 다칠 수 있는 것은 손대지 말고 제보로 알려 주세요.</Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Button type="ghost" disabled={busy} onPress={close}>
            취소
          </Button>
          <Button disabled={!ready} onPress={submit} style={{ flex: 1.6 }}>
            {busy ? '기록하는 중…' : ready ? '치운 곳 기록하기' : `사진 ${(p.before ? 1 : 0) + (p.after ? 1 : 0)}/2`}
          </Button>
        </View>
      </Screen>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  reward: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 14, ...neu.inset },
  step: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', ...neu.raisedSm },
  input: { backgroundColor: colors.panel, borderRadius: radius.lg, ...neu.inset, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 18, paddingVertical: 15 },
})
