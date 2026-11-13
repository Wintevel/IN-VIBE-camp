import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import { code, dist, isCrew, isPartner, remain, issueLabel, MARK_LABELS, FLAG_REASONS } from '../lib/format'
import { navigationRef } from '../navigation/ref'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { HeartIcon } from './Icons'
import { RewardTiles, rewardParts } from './Reward'
import Stamp from './Stamp'

// 의뢰 상세 시트. 어느 탭에서든 app.openSheet(id) 로 엽니다.
export default function QuestSheet() {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const r = app.reports.find((x) => x.id === app.sheet.id)
  if (!r) return null

  const done = r.status === 'completed'
  const joined = !!r.i_am_participating
  const started = r.status === 'in_progress'
  const single = r.proof_mode === 'single' // 사진 한 장으로 인증하는 의뢰
  const label1 = r.proof_label || '사진'
  const steps = single
    ? [`현장에서 ${label1}을 앱 카메라로 찍어요`, '사진을 올리면 위치와 함께 접수돼요', '확인되면 보상이 지급돼요']
    : ['현장에서 치우기 전 사진을 앱 카메라로 찍어요', '치운 뒤 같은 각도로 한 장 더 찍어요', '두 장을 올리면 보상이 지급돼요']
  const img = photoUrl(r.photo_path)
  const proving = joined && started && !done
  const toProof = () => navigationRef.navigate('Proof', { reportId: r.id })

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
  else if (joined && started) [label, disabled] = ['인증하러 가기', false]
  else if (joined) [label, disabled] = [`인원을 기다리는 중 (${r.current_members}/${r.required_members})`, true]
  else if (started) [label, disabled] = ['다른 이웃이 진행 중이에요', true]
  else if (r.pending_until) [label, disabled] = [`공개 준비 중 · ${remain(r.pending_until)}`, true]
  else if (r.is_mine && !isCrew(r)) [label, disabled] = ['내가 올린 제보는 직접 해결할 수 없어요', true]

  const go = async () => {
    if (proving) {
      app.hideSheet()
      return toProof()
    }
    setBusy(true)
    const d = await app.accept(r.id)
    setBusy(false)
    // 바로 시작되는 의뢰면 속도선과 함께 인증 화면으로 넘어갑니다.
    if (d?.status === 'in_progress') {
      app.hideSheet()
      app.dashTo(toProof)
    }
  }
  const cancel = async () => {
    setBusy(true)
    await app.cancel(r.id)
    setBusy(false)
  }
  const sendFlag = async (reason) => {
    setFlagging(false)
    if (await app.flag(r.id, reason)) app.hideSheet()
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
      {app.social && !done ? (
        <View style={styles.react}>
          <Pressable onPress={() => app.toggleHeart(r.id)} accessibilityRole="button" accessibilityLabel="하트 누르기" accessibilityState={{ selected: !!r.liked_by_me }} style={[styles.chip, r.liked_by_me && { backgroundColor: colors.redSoft }]}>
            <HeartIcon size={16} filled={!!r.liked_by_me} color={r.liked_by_me ? colors.red : colors.sheetSub} />
            <Text style={[text.chip, { color: r.liked_by_me ? colors.red : colors.sheetSub }]}>{r.like_count ?? 0}</Text>
          </Pressable>
          {MARK_LABELS.map(([k, name]) => {
            const on = r.my_mark === k
            return (
              <Pressable key={k} onPress={() => app.mark(r.id, k)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && { backgroundColor: colors.blueWeak, borderColor: colors.blue }]}>
                <Text style={[text.chip, { color: on ? colors.blue : colors.sheetSub }]}>
                  {name} {r.marks?.[k] || 0}
                </Text>
              </Pressable>
            )
          })}
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
      {app.social && !r.is_mine && !isPartner(r) ? (
        flagging ? (
          <View style={{ gap: 8 }}>
            <Text style={text.section}>신고하는 이유</Text>
            <View style={styles.react}>
              {FLAG_REASONS.map(([k, name]) => (
                <Pressable key={k} onPress={() => sendFlag(k)} accessibilityRole="button" style={styles.chip}>
                  <Text style={[text.chip, { color: colors.sheetFg }]}>{name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[text.caption, { color: colors.sheetSub }]}>신고한 제보는 내 의뢰판에서 사라지고 운영진이 확인해요.</Text>
          </View>
        ) : (
          <Text onPress={() => setFlagging(true)} accessibilityRole="button" style={[text.caption, { color: colors.sheetSub, textDecorationLine: 'underline', alignSelf: 'flex-start', paddingVertical: 4 }]}>
            이 제보 신고하기
          </Text>
        )
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.sheetWeak },
  kv: { backgroundColor: colors.sheetWeak, borderRadius: radius.cardSm, paddingHorizontal: 16 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center' },
  react: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.sheetWeak, borderWidth: 1, borderColor: 'transparent' },
})
