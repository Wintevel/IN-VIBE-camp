import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import Screen from '../components/Screen'
import { REPORT_CATEGORIES } from '../data/mock'
import { useApp } from '../state/AppState'
import { colors, fonts, radius, text } from '../theme'

// 주민 제보 올리기. 사진은 앱 카메라 촬영만 허용합니다.
export default function ReportCreateScreen({ navigation }) {
  const app = useApp()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(REPORT_CATEGORIES[0])
  const shot = app.draftPhoto
  const ready = title.trim().length > 0 && !!shot

  const submit = () => {
    app.addReport({ title: title.trim(), category })
    app.setDraftPhoto(null)
    app.showToast('제보를 올렸어요. 이웃이 하트를 누르면 포인트가 붙어요')
    navigation.goBack()
  }
  const close = () => {
    app.setDraftPhoto(null)
    navigation.goBack()
  }

  return (
    <Screen>
      <Text style={text.h1}>제보하기</Text>
      <Text style={text.small}>쓰레기가 있는 곳을 사진으로 알려 주세요.</Text>

      <Pressable onPress={() => navigation.navigate('Capture', { kind: 'report', title: '제보 사진' })} accessibilityRole="button" style={[styles.photo, shot && styles.photoDone]}>
        {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[text.chip, { color: colors.sub }]}>사진 찍기 (앱 카메라만 가능)</Text>}
      </Pressable>
      {shot ? <Text style={text.caption}>촬영 위치 {shot.lat.toFixed(5)}, {shot.lng.toFixed(5)}가 함께 기록돼요</Text> : null}

      <Text style={text.section}>제목</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="예) 인하대 후문 빗물받이 꽁초" placeholderTextColor={colors.disabled} style={styles.input} maxLength={40} />

      <Text style={text.section}>종류</Text>
      <FilterChips options={REPORT_CATEGORIES.map((c) => [c, c])} value={category} onChange={setCategory} />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button type="ghost" onPress={close}>
          취소
        </Button>
        <Button disabled={!ready} onPress={submit}>
          제보 올리기
        </Button>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoDone: { borderStyle: 'solid', borderColor: colors.blue },
  input: { backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
