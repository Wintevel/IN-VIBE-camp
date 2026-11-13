import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import { code, dist, isCrew, isPartner, remain, issueLabel } from '../lib/format'
import { navigationRef } from '../navigation/ref'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { CameraIcon } from './Icons'
import { RewardTiles, rewardParts } from './Reward'
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
  const single = r.proof_mode === 'single' // 사진 한 장으로 인증하는 의뢰
  const label1 = r.proof_label || '사진'
  const ready = single ? !!p.before : !!(p.before && p.after)
  const steps = single
    ? [`현장에서 ${label1}을 앱 카메라로 찍어요`, '사진을 올리면 위치와 함께 접수돼요', '확인되면 보상이 지급돼요']
    : ['현장에서 치우기 전 사진을 앱 카메라로 찍어요', '치운 뒤 같은 각도로 한 장 더 찍어요', '두 장을 올리면 보상이 지급돼요']
  const img = photoUrl(r.photo_path)
  const proving = joined && started && !done // 인증할 차례면 인증란을 제목 바로 아래에 둡니다

  const kv = [
    ['유형', issueLabel(r.issue_type)],
    ['장소', [r.place_label, r.address].filter(Boolean).join(' · ')],
    ['거리', dist(r.distance_m)],
    r.reward_label ? ['제휴 보상', r.reward_label] : null,
    isCrew(r) ? ['인원', `${r.current_members}/${r.required_members}명`] : null,
    [isPartner(r) ? '의뢰한 곳' : '제보한 이웃', r.reporter_nickname],
  ].filter((x) => x && x[1])

  let label = '의뢰 수락하기'
  let disabled = false
  if (done) [label, disabled] = ['완료된 의뢰예요', true]
  else if (joined && started) [label, disabled] = ['완료 인증하기', !ready]
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
    navigationRef.navigate('Capture', { kind: 'quest', reportId: r.id, slot, title: single ? label1 : slot === 'before' ? '치우기 전 사진' : '치운 뒤 사진' })
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
        {isPartner(r) ? <Stamp type="partner">제휴 의뢰</Stamp> : <Stamp>주민 제보</Stamp>}
        {isCrew(r) ? <Stamp type="partner">크루 의뢰</Stamp> : null}
        <Stamp>{code(r.id)}</Stamp>
      </View>
      <Text style={text.sheetTitle}>{r.title}</Text>
      {proving ? (
        <View style={styles.proof}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[text.section, { flex: 1 }]}>완료 인증</Text>
            {r.deadline_at ? <Text style={[text.chip, { color: colors.tape }]}>{remain(r.deadline_at)}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PhotoSlot n={single ? null : 1} shot={p.before} label={single ? label1 : '치우기 전'} onPress={() => capture('before')} />
            {single ? null : <PhotoSlot n={2} shot={p.after} label="치운 뒤" onPress={() => capture('after')} />}
          </View>
          <Text style={[text.caption, { color: colors.sheetSub }]}>{single ? '현장에서 앱 카메라로 찍어 주세요. 의뢰 위치 100m 안에서만 인증돼요.' : '현장에서 앱 카메라로 전·후를 같은 각도로 찍어 주세요. 의뢰 위치 100m 안에서만 인증돼요.'}</Text>
        </View>
      ) : null}
      <RewardTiles parts={rewardParts(r)} />
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
      {!done && !proving ? (
        <View style={{ gap: 10 }}>
          <Text style={text.section}>완료 인증 방법</Text>
          {steps.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={styles.step}>
                <Text style={[text.tab, { color: colors.sheetSub }]}>{i + 1}</Text>
              </View>
              <Text style={[text.regular, { fontSize: 14, lineHeight: 21, flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </BottomSheet>
  )
}

function PhotoSlot({ n, shot, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shot ? `${label} 다시 찍기` : `${label} 찍기`} style={[styles.slot, shot && styles.slotDone]}>
      {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <CameraIcon size={26} color={colors.blue} />}
      <View style={[styles.slotTag, shot && { backgroundColor: colors.blue }]}>
        <Text style={[text.chip, { color: shot ? colors.onBlue : colors.sheetFg }]}>{[n, label, shot ? '다시 찍기' : '찍기'].filter(Boolean).join(' ')}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.sheetWeak },
  kv: { backgroundColor: colors.sheetWeak, borderRadius: radius.cardSm, paddingHorizontal: 16 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center' },
  proof: { gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.blue, backgroundColor: colors.blueWeak },
  slotTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(17,19,23,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  slot: { flex: 1, aspectRatio: 4 / 3, maxHeight: 150, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.blue, backgroundColor: colors.sheetBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotDone: { borderStyle: 'solid', borderColor: colors.blue },
})
