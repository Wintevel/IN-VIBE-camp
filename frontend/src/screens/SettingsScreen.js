import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import { List, SectionTitle } from '../components/ListRows'
import Screen from '../components/Screen'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

export default function SettingsScreen({ navigation }) {
  const app = useApp()
  const [nickname, setNickname] = useState(app.profile?.nickname || '')
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const changed = nickname.trim().length > 0 && nickname.trim() !== app.profile?.nickname
  const save = async () => {
    setBusy(true)
    await app.saveNickname(nickname.trim())
    setBusy(false)
  }
  return (
    <Screen>
      <Text style={text.h1}>설정</Text>
      <SectionTitle>닉네임</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={nickname} onChangeText={setNickname} placeholder="닉네임" placeholderTextColor={colors.disabled} style={styles.input} maxLength={12} accessibilityLabel="닉네임" />
        <Button style={{ flex: 0, paddingHorizontal: 20 }} disabled={!changed || busy} onPress={save}>
          저장
        </Button>
      </View>
      <List
        rows={[
          { label: '내 위치 다시 받기', value: app.located ? '받음' : '못 받음', onPress: () => app.refresh({ relocate: true }) },
          { label: '로그아웃', onPress: () => app.signOut() },
          ...(app.resetLocal
            ? [{ label: confirmReset ? '한 번 더 누르면 모두 지워져요' : '이 기기의 기록 모두 지우기', danger: true, key: 'reset', onPress: () => (confirmReset ? app.resetLocal() : setConfirmReset(true)) }]
            : []),
        ]}
      />
      <Text style={text.caption}>로그아웃해도 기록은 이 기기에 남아 있어, 다시 시작하면 그대로 이어져요. 기록을 지우면 다시 불러올 수 없어요.</Text>
      <Button type="ghost" style={{ flex: 0 }} onPress={() => navigation.goBack()}>
        돌아가기
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { flex: 1, backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
