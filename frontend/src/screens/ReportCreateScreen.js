import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Location from 'expo-location'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import Screen from '../components/Screen'
import Toast from '../components/Toast'
import { ISSUE_PICK, PLACE_PICK, pickNote, pickValue } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

// 좌표 → 주소. 웹 등 주소를 못 구하는 환경에서는 비워 둡니다(좌표 숫자는 사람이 읽을 수 없어 보여 주지 않음).
async function lookup(shot) {
  const fallback = { address: '', dong: '' }
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
  const [spot, setSpot] = useState('')
  const [placeType, setPlaceType] = useState('street')
  const [issueType, setIssueType] = useState('litter')
  const [issueNote, setIssueNote] = useState('')
  const [placeNote, setPlaceNote] = useState('')
  const [members, setMembers] = useState(crew ? 2 : 1)
  const [busy, setBusy] = useState(false)
  // 길에서 바로 올릴 수 있게 사진과 제목만 받고, 나머지는 펼쳐야 보입니다(2026-11-16 개편). 크루 의뢰는 인원이 필요해 펼쳐 둡니다.
  const [more, setMore] = useState(crew)
  const shot = app.draftPhoto
  const ready = title.trim().length > 0 && !!shot && !busy

  const submit = async () => {
    setBusy(true)
    const where = await lookup(shot)
    // 서버 값으로 다 나타나지 않는 선택지(담배꽁초, 학교 앞, 기타에 적은 말)는 설명과 위치 설명 앞에 붙입니다.
    const iNote = pickNote(ISSUE_PICK, issueType, issueNote)
    const pNote = pickNote(PLACE_PICK, placeType, placeNote)
    const ok = await app.createReport({
      title: title.trim(),
      description: [iNote && `문제: ${iNote}`, description.trim()].filter(Boolean).join('\n'),
      placeType: pickValue(PLACE_PICK, placeType),
      issueType: pickValue(ISSUE_PICK, issueType),
      requiredMembers: members,
      shot,
      spot: [pNote, spot.trim()].filter(Boolean).join(' · ').slice(0, 30), // 서버 상한 30자(장소 이름을 앞에 붙이면 넘칠 수 있음)
      ...where,
    })
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
    <View style={{ flex: 1 }}>
    <Screen>
      <Text style={text.h1}>{crew ? '크루 의뢰 올리기' : '제보하기'}</Text>
      <Text style={text.small}>{crew ? '2명 이상 함께 치울 곳' : '찍은 자리가 제보 위치가 돼요'}</Text>

      <Pressable onPress={() => navigation.navigate('Capture', { kind: 'report', title: '제보 사진' })} accessibilityRole="button" accessibilityLabel={shot ? '사진 다시 찍기' : '사진 찍기'} style={[styles.photo, shot && styles.photoDone]}>
        {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[text.chip, { color: colors.sub }]}>사진 찍기 (앱 카메라만 가능)</Text>}
      </Pressable>
      {shot ? <Text style={text.caption}>촬영한 위치가 제보 위치로 기록돼요</Text> : null}

      <Text style={text.section}>제목</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="예) 후문 골목에 꽁초가 가득해요" placeholderTextColor={colors.disabled} style={styles.input} maxLength={40} />

      {!more ? (
        <Text onPress={() => setMore(true)} accessibilityRole="button" style={[text.small, styles.more]}>
          ＋ 문제 유형·장소·인원 더 적기 (선택)
        </Text>
      ) : null}
      {more ? (
      <>
      <Text style={text.section}>어떤 문제인가요</Text>
      <FilterChips wrap options={ISSUE_PICK} value={issueType} onChange={setIssueType} />
      {issueType === 'etc' ? (
        <TextInput value={issueNote} onChangeText={setIssueNote} placeholder="어떤 문제인지 적어 주세요. 예) 담배꽁초, 대형 폐기물" placeholderTextColor={colors.disabled} style={styles.input} maxLength={20} autoFocus accessibilityLabel="문제 직접 적기" />
      ) : null}

      <Text style={text.section}>장소 종류</Text>
      <FilterChips wrap options={PLACE_PICK} value={placeType} onChange={setPlaceType} />
      {placeType === 'etc' ? (
        <TextInput value={placeNote} onChangeText={setPlaceNote} placeholder="어떤 곳인지 적어 주세요. 예) 학교 앞, 주차장, 하천 산책로" placeholderTextColor={colors.disabled} style={styles.input} maxLength={20} autoFocus accessibilityLabel="장소 직접 적기" />
      ) : null}

      <Text style={text.section}>어디쯤인가요 (선택)</Text>
      <TextInput value={spot} onChangeText={setSpot} placeholder="예) ○○편의점 앞 전봇대 밑" placeholderTextColor={colors.disabled} style={styles.input} maxLength={30} accessibilityLabel="위치 설명" />

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
      </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button type="ghost" onPress={close}>
          취소
        </Button>
        <Button disabled={!ready} onPress={submit}>
          {busy ? '올리는 중…' : crew ? '크루 의뢰 올리기' : '제보 올리기'}
        </Button>
      </View>
    </Screen>
      {/* 이 화면은 모달이라 앱 공용 알림이 뒤에 가려집니다. 실패 이유가 보이도록 여기에도 둡니다(2026-11-22 "제보가 안 올라가요"). */}
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoDone: { borderStyle: 'solid', borderColor: colors.blue },
  input: { backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
  more: { color: colors.blue, paddingVertical: 6, alignSelf: 'flex-start' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
})
