import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from '../components/BoardBackground'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

// 지금 서버는 익명 계정으로 시작합니다(프로필은 서버가 자동 생성). 카카오·이메일 연결은 로그인 방식 확정 후 붙입니다.
export default function LoginScreen() {
  const { signIn } = useApp()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }
  return (
    <BoardBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <Stamp type="partner">JUBQUEST</Stamp>
          </View>
          <Text style={[text.h1, { fontSize: 40, lineHeight: 46 }]}>줍퀘스트</Text>
          <Text style={[text.regular, { color: colors.sub }]}>동네 쓰레기를 제보하고, 이웃의 의뢰를 해결해요.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Button style={{ flex: 0 }} disabled={busy} onPress={start}>
            {busy ? '시작하는 중…' : '시작하기'}
          </Button>
          <Text style={[text.caption, { textAlign: 'center' }]}>가입 없이 바로 시작해요. 닉네임은 설정에서 바꿀 수 있어요.</Text>
        </View>
      </View>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({ wrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' } })
