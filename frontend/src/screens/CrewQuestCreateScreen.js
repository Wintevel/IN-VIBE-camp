import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { useApp } from '../state/AppState'
import { colors, fonts, radius, text } from '../theme'

// 크루원만 올릴 수 있습니다(RLS 로 서버에서도 확인). 보상 포인트 재원은 미정(docs/api.md ?).
export default function CrewQuestCreateScreen({ navigation }) {
  const app = useApp()
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [members, setMembers] = useState('4')
  const ready = title.trim() && place.trim() && Number(members) >= 2
  return (
    <Screen>
      <Text style={text.h1}>크루 의뢰 올리기</Text>
      <Text style={text.small}>{app.crew} 크루원에게 보여요.</Text>
      <Field label="제목" value={title} onChangeText={setTitle} placeholder="예) 토요일 오전 합동 줍깅" />
      <Field label="모임 장소" value={place} onChangeText={setPlace} placeholder="예) 인하대 정문" />
      <Field label="필요한 인원" value={members} onChangeText={setMembers} keyboardType="number-pad" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button type="ghost" onPress={() => navigation.goBack()}>
          취소
        </Button>
        <Button
          disabled={!ready}
          onPress={() => {
            app.showToast('크루 의뢰를 올렸어요 (시안: 목록에는 아직 반영되지 않아요)')
            navigation.goBack()
          }}
        >
          올리기
        </Button>
      </View>
    </Screen>
  )
}

function Field({ label, ...props }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={text.section}>{label}</Text>
      <TextInput placeholderTextColor={colors.disabled} style={styles.input} {...props} />
    </View>
  )
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
