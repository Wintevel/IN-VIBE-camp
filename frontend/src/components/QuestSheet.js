import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import { code, dist, isCrew, remain, reward } from '../lib/format'
import { navigationRef } from '../navigation/ref'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'
import BottomSheet from './BottomSheet'
import Button from './Button'
import Stamp from './Stamp'

// 의뢰 상세 시트. 어느 탭에서든 app.openSheet(id) 로 엽니다.
export default function QuestSheet() {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const r = app.reports.find((x) => x.id === app.sheet.id)
  if (!r) return null

  const done = r.status === 'completed'
  const joined = !!r.i_am_participating
  const started = r.status === 'in_progress'
  const p = app.photos[r.id] || {}
  const rw = reward(r)
  const img = photoUrl(r.photo_path)

  const kv = [
    ['장소', [r.place_label, r.address].filter(Boolean).join(' · ')],
    ['거리', dist(r.distance_m)],
    ['보상', `${rw.value} ${rw.unit}`],
    isCrew(r) ? ['인원', `${r.current_members}/${r.required_members}명`] : null,
    joined && started && r.deadline_at ? ['인증 마감', remain(r.deadline_at)] : null,
    ['제보한 이웃', r.reporter_nickname],
  ].filter((x) => x && x[1])

  let label = '의뢰 수락하기'
  let disabled = false
  if (done) [label, disabled] = ['완료된 의뢰예요', true]
  else if (joined && started) [label, disabled] = ['완료 인증하기', !(p.before && p.after)]
  else if (joined) [label, disabled] = [`인원을 기다리는 중 (${r.current_members}/${r.required_members})`, true]
  else if (started) [label, disabled] = ['다른 이웃이 진행 중이에요', true]

  const go = async () => {
    setBusy(true)
    if (joined && started) {
      if (await app.submitProof(r.id)) app.hideSheet()
    } else await app.accept(r.id)
    setBusy(false)
  }
  const cancel = async () => {
    setBusy(true)
    await app.cancel(r.id)
    setBusy(false)
  }
  const capture = (slot) => {
    app.hideSheet()
    navigationRef.navigate('Capture', { kind: 'quest', reportId: r.id, slot, title: slot === 'before' ? '치우기 전 사진' : '치운 뒤 사진' })
  }

  return (
    <BottomSheet
      visible={app.sheet.visible}
      onClose={app.hideSheet}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {joined && !done ? (
            <Button type="weak" disabled={busy} onPress={cancel}>
              수락 취소
            </Button>
          ) : (
            <Button type="weak" onPress={app.hideSheet}>
              닫기
            </Button>
          )}
          <Button disabled={disabled || busy} onPress={go} style={{ flex: 1.6 }}>
            {busy ? '처리 중…' : label}
          </Button>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Stamp>주민 제보</Stamp>
        {isCrew(r) ? <Stamp type="partner">크루 의뢰</Stamp> : null}
        <Stamp>{code(r.id)}</Stamp>
      </View>
      <Text style={text.sheetTitle}>{r.title}</Text>
      {r.description ? <Text style={[text.regular, { color: colors.sheetSub }]}>{r.description}</Text> : null}
      {img ? <Image source={{ uri: img }} style={styles.photo} resizeMode="cover" accessibilityLabel="제보 사진" /> : null}
      <View style={styles.kv}>
        {kv.map(([k, v], i) => (
          <View key={k} style={[styles.kvRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.sheetLine }]}>
            <Text style={[text.small, { color: colors.sheetSub, fontSize: 14 }]}>{k}</Text>
            <Text style={[text.small, font.bodyBold, { color: colors.sheetFg, fontSize: 14, flex: 1, textAlign: 'right' }]}>{v}</Text>
          </View>
        ))}
      </View>
      {!done ? (
        <View style={{ gap: 10 }}>
          <Text style={text.section}>완료 인증 방법</Text>
          {['현장에서 치우기 전 사진을 앱 카메라로 찍어요', '치운 뒤 같은 각도로 한 장 더 찍어요', '두 장을 올리면 보상이 지급돼요'].map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={styles.step}>
                <Text style={[text.tab, { color: colors.sheetSub }]}>{i + 1}</Text>
              </View>
              <Text style={[text.regular, { fontSize: 14, lineHeight: 21, flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {joined && started && !done ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PhotoSlot shot={p.before} label="전 사진" onPress={() => capture('before')} />
          <PhotoSlot shot={p.after} label="후 사진" onPress={() => capture('after')} />
        </View>
      ) : null}
    </BottomSheet>
  )
}

function PhotoSlot({ shot, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shot ? `${label} 다시 찍기` : `${label} 찍기`} style={[styles.slot, shot && styles.slotDone]}>
      {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[text.chip, { color: colors.sheetSub }]}>{label} 찍기</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.sheetWeak },
  kv: { backgroundColor: colors.sheetWeak, borderRadius: radius.cardSm, paddingHorizontal: 16 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center' },
  slot: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.sheetLine, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotDone: { borderStyle: 'solid', borderColor: colors.blue },
})
