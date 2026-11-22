import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import { List, SectionTitle } from '../components/ListRows'
import { PressScale } from '../components/Motion'
import Screen from '../components/Screen'
import { useApp } from '../state/AppState'
import { saveThemeMode } from '../lib/themeMode'
import { colors, font, radius, text, theme } from '../theme'

const MODES = [
  ['dark', '다크'],
  ['light', '라이트'],
  ['system', '기기 설정'],
]

export default function SettingsScreen({ navigation }) {
  const app = useApp()
  const [nickname, setNickname] = useState(app.profile?.nickname || '')
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [mode, setMode] = useState(theme.mode)
  const pickMode = async (m) => {
    if (m === mode) return
    setMode(m)
    const reloaded = await saveThemeMode(m)
    if (!reloaded) app.showToast('앱을 다시 열면 바뀌어요')
  }
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
      <SectionTitle>화면 모드</SectionTitle>
      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map(([k, label]) => (
          <View key={k} style={{ flex: 1 }}>
            <PressScale onPress={() => pickMode(k)} accessibilityRole="radio" accessibilityState={{ selected: mode === k }} style={[styles.mode, mode === k && styles.modeOn]}>
              <Text style={[text.chip, { color: mode === k ? colors.onBlue : colors.sub }]}>{label}</Text>
            </PressScale>
          </View>
        ))}
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
      <Button type="ghost" style={{ flex: 0 }} onPress={() => navigation.goBack()}>
        돌아가기
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.pill, backgroundColor: colors.panel2 },
  mode: { alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  modeOn: { backgroundColor: colors.blue },
  input: { flex: 1, backgroundColor: colors.panel, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
