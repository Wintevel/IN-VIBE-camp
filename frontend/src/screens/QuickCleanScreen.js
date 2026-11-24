import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import { PinIcon } from '../components/Icons'
import { Appear } from '../components/Motion'
import PhotoSlot from '../components/PhotoSlot'
import { RewardIcon } from '../components/Reward'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Toast from '../components/Toast'
import { PLACE_PICK, pickNote, pickValue } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'
import { PROOF_GAP_TOPIC } from '../lib/demo'

// "바로 치웠어요": 의뢰를 기다리지 않고, 보자마자 치운 것을 전·후 사진으로 기록합니다(2026-11-16 개편).
// 포인트는 없고 경험치만 받습니다. 가짜 제보를 올려 직접 푸는 악용을 막기 위해서입니다.
export default function QuickCleanScreen({ navigation }) {
  const app = useApp()
  const [placeType, setPlaceType] = useState('street')
  const [title, setTitle] = useState('')
  const [placeNote, setPlaceNote] = useState('')
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
    // 서버 장소 값에 없는 곳(학교 앞, 기타에 적은 말)은 한 줄 기록이 비었을 때 "학교 앞 바로 치움"처럼 제목으로 씁니다.
    const note = pickNote(PLACE_PICK, placeType, placeNote)
    const d = await app.quickClean({ placeType: pickValue(PLACE_PICK, placeType), title: title.trim() || (note ? `${note} 바로 치움` : '') })
    setBusy(false)
    if (d) navigation.goBack()
  }
  const steps = ['치우기 전 모습을 먼저 찍어요', '치우고 나서 같은 자리에서 한 장 더 찍어요', `전 사진을 찍고 ${PROOF_GAP_TOPIC} 지나야 후 사진을 받아요`]

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={32}>
        <ScreenHeader title="바로 치웠어요" action="닫기" onAction={close} />
        <Appear from="right" style={styles.gains}>
          <View style={[styles.gain, { borderColor: colors.blue + '55' }]} accessibilityLabel="경험치를 받아요">
            <RewardIcon kind="xp" size={24} />
            <Text style={[text.caption, { color: colors.blue }]}>경험치</Text>
          </View>
          <View style={[styles.gain, { borderColor: colors.green + '55' }]} accessibilityLabel="동네 지도에 남아요">
            <PinIcon size={24} color={colors.green} />
            <Text style={[text.caption, { color: colors.green }]}>지도에 기록</Text>
          </View>
          <View style={[styles.gain, styles.none]} accessibilityLabel="포인트는 없어요">
            <View style={{ opacity: 0.35 }}>
              <RewardIcon kind="point" size={24} />
            </View>
            <View style={styles.slash} />
            <Text style={[text.caption, { color: colors.disabled }]}>포인트 없음</Text>
          </View>
        </Appear>
        <Appear from="right" index={1} style={{ flexDirection: 'row', gap: 10 }}>
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
        <FilterChips wrap options={PLACE_PICK} value={placeType} onChange={setPlaceType} />
        {placeType === 'etc' ? (
          <TextInput value={placeNote} onChangeText={setPlaceNote} placeholder="어떤 곳인지 적어 주세요. 예) 학교 앞, 주차장" placeholderTextColor={colors.disabled} style={styles.input} maxLength={20} autoFocus accessibilityLabel="장소 직접 적기" />
        ) : null}
        <Text style={text.section}>한 줄 기록 (선택)</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="예) 정류장 의자 밑 꽁초" placeholderTextColor={colors.disabled} style={styles.input} maxLength={40} accessibilityLabel="한 줄 기록" />
        <Text style={[text.caption, { color: colors.red }]}>깨진 유리, 주사기처럼 다칠 수 있는 것은 손대지 말고 제보로 알려 주세요.</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
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
  // 받는 것(경험치·지도 기록)과 못 받는 것(포인트)을 글 대신 칸으로 보여 줍니다.
  gains: { flexDirection: 'row', gap: 8 },
  gain: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.cardSm, backgroundColor: colors.panel, borderWidth: 1 },
  none: { borderColor: colors.line, borderStyle: 'dashed' },
  slash: { position: 'absolute', top: 22, width: 30, height: 2, borderRadius: 1, backgroundColor: colors.disabled, transform: [{ rotate: '-35deg' }] },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
