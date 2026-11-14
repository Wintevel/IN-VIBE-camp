import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from '../components/BoardBackground'
import Button from '../components/Button'
import Logo from '../components/Logo'
import Stamp from '../components/Stamp'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 동의 항목. 문구는 임시이고, 출시 전에 약관·개인정보 처리방침 전문으로 바꿔야 합니다.
const CONSENT_KEY = 'jipgepyo:consent'
const TERMS = [
  { key: 'age', must: true, title: '만 14세 이상이에요', body: '만 14세 미만은 보호자 동의 절차가 준비될 때까지 가입할 수 없어요.' },
  { key: 'terms', must: true, title: '서비스 이용약관', body: '허위·장난 제보, 남의 사진 도용, 부적절한 사진은 삭제되고 이용이 제한될 수 있어요. 포인트는 현금으로 바꿀 수 없어요.' },
  { key: 'privacy', must: true, title: '개인정보 수집·이용', body: '닉네임, 제보·인증 사진, 활동 기록을 서비스 제공에 써요. 올린 사진은 다른 이웃에게 보여요.' },
  { key: 'location', must: true, title: '위치정보 이용', body: '근처 의뢰를 보여 주고, 사진을 의뢰 장소에서 찍었는지 확인하려고 촬영 순간의 위치를 써요.' },
  { key: 'push', must: false, title: '알림 받기', body: '내가 제보하거나 하트를 누른 곳이 해결되면 알려 드려요.' },
]

// 지금 서버는 익명 계정으로 시작합니다. 카카오·구글·이메일 로그인은 서버 연결 때 붙입니다.
export default function LoginScreen() {
  const { signIn } = useApp()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('intro') // intro | consent
  const [agreed, setAgreed] = useState(null) // 이전에 동의한 기록(로그아웃 뒤 다시 시작할 때)
  const [checked, setChecked] = useState({})
  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY)
      .then((v) => setAgreed(v ? JSON.parse(v) : false))
      .catch(() => setAgreed(false))
  }, [])

  const enter = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }
  const start = () => (agreed ? enter() : setStep('consent'))
  const allMust = TERMS.filter((t) => t.must).every((t) => checked[t.key])
  const all = TERMS.every((t) => checked[t.key])
  const accept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({ at: new Date().toISOString(), items: checked })).catch(() => {})
    enter()
  }

  if (step === 'consent') {
    return (
      <BoardBackground>
        <View style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 16 }]}>
          <View style={{ gap: 6 }}>
            <Text style={[text.h1, { fontSize: 28, lineHeight: 36 }]}>시작하기 전에</Text>
            <Text style={[text.small]}>집게표를 쓰려면 아래 내용에 동의가 필요해요.</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
            <Check on={all} onPress={() => setChecked(all ? {} : Object.fromEntries(TERMS.map((t) => [t.key, true])))} title="모두 동의해요" strong />
            {TERMS.map((t) => (
              <Check key={t.key} on={!!checked[t.key]} onPress={() => setChecked((c) => ({ ...c, [t.key]: !c[t.key] }))} title={`${t.must ? '[필수]' : '[선택]'} ${t.title}`} body={t.body} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button type="ghost" onPress={() => setStep('intro')}>
              이전
            </Button>
            <Button disabled={!allMust || busy} onPress={accept} style={{ flex: 1.6 }}>
              {busy ? '시작하는 중…' : '동의하고 시작'}
            </Button>
          </View>
        </View>
      </BoardBackground>
    )
  }

  return (
    <BoardBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 14 }}>
          <Logo size={76} />
          <View style={{ alignSelf: 'flex-start' }}>
            <Stamp type="partner">동네 의뢰판</Stamp>
          </View>
          <Text style={[text.h1, { fontSize: 40, lineHeight: 46 }]}>집게표</Text>
          <Text style={[text.regular, { color: colors.sub }]}>동네 쓰레기를 제보하고, 이웃의 의뢰를 해결해요.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Button style={{ flex: 0 }} disabled={busy || agreed === null} onPress={start}>
            {busy ? '시작하는 중…' : '시작하기'}
          </Button>
          <Text style={[text.caption, { textAlign: 'center' }]}>가입 없이 바로 시작해요. 닉네임은 설정에서 바꿀 수 있어요.</Text>
        </View>
      </View>
    </BoardBackground>
  )
}

function Check({ on, onPress, title, body, strong }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={title} style={[styles.row, strong && { borderColor: on ? colors.blue : colors.line, backgroundColor: colors.panel2 }]}>
      <View style={[styles.box, on && { backgroundColor: colors.blue, borderColor: colors.blue }]}>{on ? <Text style={[text.chip, { color: colors.onBlue }]}>✓</Text> : null}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={strong ? text.cardTitle : text.section}>{title}</Text>
        {body ? <Text style={text.small}>{body}</Text> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.disabled, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
})
