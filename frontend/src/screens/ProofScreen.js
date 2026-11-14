import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import Button from '../components/Button'
import { Card } from '../components/ListRows'
import { Appear } from '../components/Motion'
import PhotoSlot from '../components/PhotoSlot'
import { RewardPills } from '../components/Reward'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Stamp from '../components/Stamp'
import Toast from '../components/Toast'
import { code, remain } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 의뢰 해결 인증 화면. 수락하면 바로 이 화면으로 넘어오고, 의뢰판의 "내가 수락한 의뢰"에서도 열립니다.
export default function ProofScreen({ navigation, route }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const r = app.reports.find((x) => x.id === route.params.reportId)
  const gone = !r || !r.i_am_participating || r.status !== 'in_progress'
  useEffect(() => {
    if (gone && !busy) navigation.goBack()
  }, [gone, busy, navigation])
  if (gone) return <View style={{ flex: 1, backgroundColor: colors.ink }} />

  const p = app.photos[r.id] || {}
  const single = r.proof_mode === 'single'
  const label1 = r.proof_label || '사진'
  const ready = single ? !!p.before : !!(p.before && p.after)
  const img = photoUrl(r.photo_path)
  const capture = (slot) => navigation.navigate('Capture', { kind: 'quest', reportId: r.id, slot, title: single ? label1 : slot === 'before' ? '치우기 전 사진' : '치운 뒤 사진' })
  const submit = async () => {
    setBusy(true)
    const ok = await app.submitProof(r.id)
    setBusy(false)
    if (ok) navigation.goBack()
  }
  const cancel = async () => {
    setBusy(true)
    await app.cancel(r.id)
    setBusy(false)
  }
  const steps = single
    ? [`현장에서 ${label1}을 찍어요`, '의뢰 위치 100m 안에서만 인증돼요']
    : ['치우기 전 모습을 먼저 찍어요', '치운 뒤 같은 자리에서 한 장 더 찍어요', '전 사진을 찍고 1분은 지나야 후 사진을 받아요']

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={32}>
        <ScreenHeader title="해결 인증" sub={r.deadline_at ? remain(r.deadline_at) : null} action="나중에" onAction={() => navigation.goBack()} />
        <Appear from="right">
          <Card style={styles.quest}>
            {img ? <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" accessibilityLabel="처음 제보 사진" /> : null}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row' }}>
                <Stamp>{code(r.id)}</Stamp>
              </View>
              <Text style={text.cardTitle} numberOfLines={2}>
                {r.title}
              </Text>
              <RewardPills report={r} />
            </View>
          </Card>
        </Appear>

        <Appear from="right" index={1} style={{ flexDirection: 'row', gap: 10 }}>
          <PhotoSlot n={single ? null : 1} shot={p.before} label={single ? label1 : '치우기 전'} onPress={() => capture('before')} />
          {single ? null : <PhotoSlot n={2} shot={p.after} label="치운 뒤" onPress={() => capture('after')} />}
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
        <Text style={[text.caption, { color: colors.red }]}>깨진 유리, 주사기처럼 다칠 수 있는 것은 손대지 말고 구청이나 안전신문고에 신고해 주세요.</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button type="ghost" disabled={busy} onPress={cancel}>
            수락 취소
          </Button>
          <Button disabled={!ready || busy} onPress={submit} style={{ flex: 1.6 }}>
            {busy ? '확인 중…' : ready ? '완료 인증하기' : single ? '사진을 찍어 주세요' : `사진 ${(p.before ? 1 : 0) + (p.after ? 1 : 0)}/2`}
          </Button>
        </View>
      </Screen>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  quest: { flexDirection: 'row', gap: 12, padding: 12, borderColor: colors.blue },
  thumb: { width: 76, alignSelf: 'stretch', minHeight: 76, borderRadius: radius.md, backgroundColor: colors.panel2 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
})
