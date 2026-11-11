import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from '../components/BoardBackground'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

// 로그인 수단(카카오·이메일)은 시안 가정값입니다. 확정 후 Supabase Auth 로 연결합니다.
export default function LoginScreen() {
  const { signIn } = useApp()
  const insets = useSafeAreaInsets()
  return (
    <BoardBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <Stamp type="partner">JUBQUEST</Stamp>
          </View>
          <Text style={[text.h1, { fontSize: 40, lineHeight: 46 }]}>줍퀘스트</Text>
          <Text style={[text.regular, { color: colors.sub }]}>동네를 치우고 포인트를 받아요.{'\n'}치운 구역이 지도에 칠해져요.</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Button style={{ flex: 0, backgroundColor: '#FEE500' }} onPress={signIn}>
            <Text style={[text.button, { color: '#191919' }]}>카카오로 시작하기</Text>
          </Button>
          <Button type="ghost" style={{ flex: 0 }} onPress={signIn}>
            이메일로 시작하기
          </Button>
        </View>
      </View>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({ wrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' } })
