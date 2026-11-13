import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Location from 'expo-location'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import Screen from '../components/Screen'
import { ISSUES } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

// place_type 값은 서버와 같아야 합니다.
const PLACES = [
  ['drain', '빗물받이'],
  ['bus_stop', '버스정류장'],
  ['park', '공원'],
  ['street', '골목·거리'],
  ['etc', '기타'],
]

// 좌표 → 주소. 웹 등 지원하지 않는 환경에서는 좌표를 그대로 씁니다.
async function lookup(shot) {
  const fallback = { address: `${shot.lat.toFixed(5)}, ${shot.lng.toFixed(5)}`, dong: '' }
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude: shot.lat, longitude: shot.lng })
    if (!g) return fallback
    const address = [g.region, g.city, g.district, g.street, g.streetNumber].filter(Boolean).join(' ')
    return { address: address || fallback.address, dong: g.district || g.subregion || '' }
  } catch {
    return fallback
  }
}

// 주민 제보 올리기. 사진은 앱 카메라 촬영만 허용하고 위치는 촬영 순간의 값을 씁니다.
export default function ReportCreateScreen({ navigation, route }) {
  const crew = !!route.params?.crew // 크루 탭에서 들어오면 크루 의뢰(최소 2명)
  const app = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [placeType, setPlaceType] = useState('drain')
  const [issueType, setIssueType] = useState('litter')
  const [members, setMembers] = useState(crew ? 2 : 1)
  const [busy, setBusy] = useState(false)
  const shot = app.draftPhoto
  const ready = title.trim().length > 0 && !!shot && !busy

  const submit = async () => {
    setBusy(true)
    const where = await lookup(shot)
    const ok = await app.createReport({ title: title.trim(), description: description.trim(), placeType, issueType, requiredMembers: members, shot, ...where })
    setBusy(false)
    if (!ok) return
    app.setDraftPhoto(null)
    app.showToast(crew ? '크루 의뢰를 올렸어요. 3분 뒤에 공개돼요' : '제보를 올렸어요. 3분 뒤에 의뢰판에 올라가요')
    navigation.goBack()
  }
  const close = () => {
    app.setDraftPhoto(null)
    navigation.goBack()
  }

  return (
    <Screen>
      <Text style={text.h1}>{crew ? '크루 의뢰 올리기' : '제보하기'}</Text>
      <Text style={text.small}>{crew ? '여럿이 치워야 하는 곳을 사진으로 알려 주세요. 최소 2명부터예요.' : '쓰레기가 있는 곳을 사진으로 알려 주세요.'}</Text>

      <Pressable onPress={() => navigation.navigate('Capture', { kind: 'report', title: '제보 사진' })} accessibilityRole="button" accessibilityLabel={shot ? '사진 다시 찍기' : '사진 찍기'} style={[styles.photo, shot && styles.photoDone]}>
        {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[text.chip, { color: colors.sub }]}>사진 찍기 (앱 카메라만 가능)</Text>}
      </Pressable>
      {shot ? <Text style={text.caption}>촬영한 위치가 제보 위치로 기록돼요</Text> : null}

      <Text style={text.section}>제목</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="예) 후문 빗물받이에 꽁초가 가득해요" placeholderTextColor={colors.disabled} style={styles.input} maxLength={40} />

      <Text style={text.section}>어떤 문제인가요</Text>
      <FilterChips options={ISSUES} value={issueType} onChange={setIssueType} />

      <Text style={text.section}>장소 종류</Text>
      <FilterChips options={PLACES} value={placeType} onChange={setPlaceType} />

      <Text style={text.section}>설명 (선택)</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="상황을 간단히 적어 주세요" placeholderTextColor={colors.disabled} style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }]} multiline maxLength={200} />

      <Text style={text.section}>필요한 인원</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => setMembers((n) => Math.max(crew ? 2 : 1, n - 1))} accessibilityRole="button" accessibilityLabel="인원 줄이기" style={styles.stepBtn}>
          <Text style={text.num}>−</Text>
        </Pressable>
        <Text style={[text.num, { minWidth: 56, textAlign: 'center' }]}>{members}명</Text>
        <Pressable onPress={() => setMembers((n) => Math.min(10, n + 1))} accessibilityRole="button" accessibilityLabel="인원 늘리기" style={styles.stepBtn}>
          <Text style={text.num}>＋</Text>
        </Pressable>
        <Text style={[text.caption, { flex: 1 }]}>{members > 1 ? '크루 의뢰로 올라가요. 인원이 모이면 시작돼요' : '혼자 치울 수 있는 양이에요'}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button type="ghost" onPress={close}>
          취소
        </Button>
        <Button disabled={!ready} onPress={submit}>
          {busy ? '올리는 중…' : crew ? '크루 의뢰 올리기' : '제보 올리기'}
        </Button>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoDone: { borderStyle: 'solid', borderColor: colors.blue },
  input: { backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
})
