import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import BottomSheet from '../components/BottomSheet'
import Button from '../components/Button'
import FilterChips from '../components/FilterChips'
import QuestCard from '../components/QuestCard'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Stamp from '../components/Stamp'
import Ticker from '../components/Ticker'
import { AREA, DAILY_LIMIT, QUESTS, TICKER } from '../data/mock'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

const FILTERS = [
  ['all', '전체'],
  ['partner', '제휴 의뢰'],
  ['near', '500m 이내'],
  ['crew', '크루 의뢰'],
  ['report', '주민 제보'],
]

export default function BoardScreen({ navigation }) {
  const app = useApp()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null) // 열려 있는 의뢰
  const [visible, setVisible] = useState(false)
  const reopen = useRef(false)

  // 촬영 화면에서 돌아오면 시트를 다시 엽니다.
  useFocusEffect(
    useCallback(() => {
      if (reopen.current) {
        reopen.current = false
        setVisible(true)
      }
    }, []),
  )

  const quests = QUESTS.filter((q) => filter === 'all' || (filter === 'near' ? q.near : q.kind === filter))
  const reports = app.reports.filter((r) => filter === 'all' || filter === 'report' || (filter === 'near' && r.near))
  const empty = quests.length + (filter === 'all' || filter === 'near' || filter === 'report' ? reports.length : 0) === 0

  const stateOf = (id) => (app.cleared.has(id) ? 'cleared' : app.accepted.has(id) ? 'accepted' : 'default')

  const openQuest = (q) => {
    setSelected(q)
    setVisible(true)
  }
  const close = () => setVisible(false)
  const capture = (slot) => {
    reopen.current = true
    setVisible(false)
    navigation.navigate('Capture', { kind: 'quest', questId: selected.id, slot, title: slot === 'before' ? '치우기 전 사진' : '치운 뒤 사진' })
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="의뢰판" sub={`${AREA.name} · ${AREA.radiusLabel}`} action="동네 변경" onAction={() => app.showToast('동네 변경은 설정에서 곧 열려요')} />
        <Ticker>{TICKER}</Ticker>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        <View style={{ gap: 14 }}>
          {filter !== 'report' && quests.map((q) => <QuestCard key={q.id} quest={q} state={stateOf(q.id)} onPress={() => openQuest(q)} />)}
          {filter !== 'partner' && filter !== 'crew' && reports.map((r) => <ReportCard key={r.id} report={r} hearted={app.hearted.has(r.id)} onHeart={() => app.toggleHeart(r.id)} />)}
          {empty ? <Text style={[text.small, { textAlign: 'center', paddingVertical: 32 }]}>이 조건의 의뢰가 아직 없어요</Text> : null}
        </View>
      </Screen>

      <Pressable onPress={() => navigation.navigate('ReportCreate')} accessibilityRole="button" accessibilityLabel="주민 제보 올리기" style={styles.fab}>
        <Text style={[text.button, { color: colors.onBlue }]}>＋ 제보하기</Text>
      </Pressable>

      <QuestSheet quest={selected} visible={visible} onClose={close} onCapture={capture} />
    </View>
  )
}

function QuestSheet({ quest, visible, onClose, onCapture }) {
  const app = useApp()
  if (!quest) return null
  const accepted = app.accepted.has(quest.id)
  const cleared = app.cleared.has(quest.id)
  const p = app.photos[quest.id] || {}
  const kv = [
    ['의뢰한 곳', quest.org],
    ['거리', quest.dist],
    ['예상 시간', quest.time],
    ['목표', quest.goal],
    ['보상', quest.reward],
    ['준비물', quest.tools],
  ]
  const go = () => {
    if (!accepted) return app.accept(quest.id)
    if (app.complete(quest)) onClose()
  }
  const label = cleared ? '완료한 의뢰예요' : accepted ? '완료 인증하기' : '의뢰 수락하기'
  const disabled = cleared || (accepted && !(p.before && p.after))
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button type="weak" onPress={onClose}>
            닫기
          </Button>
          <Button disabled={disabled} onPress={go}>
            {label}
          </Button>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Stamp type={quest.kind === 'partner' ? 'partner' : 'default'}>{quest.kind === 'partner' ? '제휴 의뢰' : '크루 의뢰'}</Stamp>
        <Stamp>{quest.id}</Stamp>
      </View>
      <Text style={text.sheetTitle}>{quest.title}</Text>
      <Text style={[text.regular, { color: colors.sheetSub }]}>{quest.desc}</Text>
      <View style={styles.kv}>
        {kv.map(([k, v], i) => (
          <View key={k} style={[styles.kvRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.sheetLine }]}>
            <Text style={[text.small, { color: colors.sheetSub, fontSize: 14 }]}>{k}</Text>
            <Text style={[text.small, { color: colors.sheetFg, fontFamily: 'NotoSansKR_700Bold', fontSize: 14, flex: 1, textAlign: 'right' }]}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Text style={text.section}>완료 인증 방법</Text>
        {['현장 도착하면 위치가 자동 확인돼요', '치우기 전 사진을 앱 카메라로 찍어요', '치운 뒤 같은 각도로 한 장 더 찍어요'].map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={styles.step}>
              <Text style={[text.tab, { color: colors.sheetSub }]}>{i + 1}</Text>
            </View>
            <Text style={[text.regular, { fontSize: 14, lineHeight: 21, flex: 1 }]}>{s}</Text>
          </View>
        ))}
        <Text style={text.caption}>오늘 남은 인증 {app.dailyRemaining}/{DAILY_LIMIT}개 · 최종 판정은 서버가 해요</Text>
      </View>
      {accepted && !cleared ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PhotoSlot done={!!p.before} label="전 사진" onPress={() => onCapture('before')} />
          <PhotoSlot done={!!p.after} label="후 사진" onPress={() => onCapture('after')} />
        </View>
      ) : null}
    </BottomSheet>
  )
}

function PhotoSlot({ done, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.slot, done && styles.slotDone]}>
      <Text style={[text.chip, { color: done ? colors.blue : colors.sheetSub }]}>{done ? `${label} 완료` : `${label} 찍기`}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 20, bottom: 16, backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.pill },
  kv: { backgroundColor: colors.sheetWeak, borderRadius: radius.cardSm, paddingHorizontal: 16 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center' },
  slot: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.sheetLine, backgroundColor: colors.sheetWeak, alignItems: 'center', justifyContent: 'center' },
  slotDone: { borderStyle: 'solid', borderColor: colors.blue, backgroundColor: colors.blueWeak },
})
