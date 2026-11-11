import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import { Card, List, SectionTitle } from '../components/ListRows'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty, refresher } from '../components/States'
import { isCrew } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

// 크루: 만들기·가입·탈퇴·랭킹. 크루 점수는 크루원이 의뢰를 완료할 때 쌓이고 크루 의뢰는 2배입니다.
export default function CrewScreen({ navigation }) {
  const app = useApp()
  const mine = app.myCrew
  const top = Math.max(1, ...app.crews.map((c) => c.score))
  const quests = app.reports.filter((r) => isCrew(r) && r.status !== 'completed')

  return (
    <Screen refreshControl={refresher(app)}>
      <ScreenHeader title="크루" sub={mine ? `${mine.name} · ${mine.rank}위` : '함께 줍는 크루를 만들거나 가입해요'} />

      {mine ? <MyCrew crew={mine} onLeave={app.leaveCrew} onPost={() => navigation.navigate('ReportCreate')} /> : <CreateCrew onCreate={app.createCrew} />}

      <SectionTitle>크루 랭킹</SectionTitle>
      {app.crews.length > 0 ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {app.crews.map((c, i) => (
            <View key={c.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }, c.is_mine && { backgroundColor: colors.blueWeak }]}>
              <Text style={[text.point, { width: 36, textAlign: 'center', color: i === 0 ? colors.tape : colors.sub }]}>{c.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={text.section}>{c.name}</Text>
                <Text style={[text.caption, { marginTop: 2 }]}>{[c.area, `${c.member_count}명`].filter(Boolean).join(' · ')}</Text>
                <View style={styles.bar}>
                  <View style={{ width: `${Math.round((c.score / top) * 100)}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
                </View>
              </View>
              {!mine ? (
                <Button type="weak" style={{ flex: 0, paddingVertical: 10, paddingHorizontal: 14 }} onPress={() => app.joinCrew(c)}>
                  가입
                </Button>
              ) : (
                <Text style={text.monoPoint}>{c.score.toLocaleString()}</Text>
              )}
            </View>
          ))}
        </Card>
      ) : (
        <Empty title="아직 크루가 없어요" sub="첫 크루를 만들어 보세요" />
      )}

      <SectionTitle>크루 의뢰</SectionTitle>
      <View style={{ gap: 14 }}>
        {quests.map((r) => (
          <ReportCard key={r.id} report={r} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
        ))}
        {quests.length === 0 ? <Empty title="모집 중인 크루 의뢰가 없어요" sub="제보할 때 필요한 인원을 2명 이상으로 올리면 크루 의뢰가 돼요" /> : null}
      </View>

      {app.localMode ? <Text style={text.caption}>지금은 서버가 없어 이 기기에서 만든 크루만 보여요. 서버가 연결되면 다른 사람의 크루와 순위를 겨뤄요.</Text> : null}
    </Screen>
  )
}

function MyCrew({ crew, onLeave, onPost }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <List
        rows={[
          { label: '크루 점수', value: `${crew.score.toLocaleString()}점` },
          { label: '순위', value: `${crew.rank}위` },
          { label: '크루원', value: `${crew.member_count}명` },
          { label: '활동 동네', value: crew.area || '정하지 않음' },
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {confirm ? (
          <>
            <Button type="ghost" onPress={() => setConfirm(false)}>
              취소
            </Button>
            <Button onPress={onLeave} style={{ backgroundColor: colors.red }}>
              정말 탈퇴하기
            </Button>
          </>
        ) : (
          <>
            <Button type="ghost" onPress={() => setConfirm(true)}>
              크루 탈퇴
            </Button>
            <Button onPress={onPost} style={{ flex: 1.6 }}>
              크루 의뢰 올리기
            </Button>
          </>
        )}
      </View>
    </>
  )
}

function CreateCrew({ onCreate }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    const ok = await onCreate({ name: name.trim(), area: area.trim() })
    setBusy(false)
    if (ok) {
      setName('')
      setArea('')
    }
  }
  return (
    <Card style={{ gap: 10 }}>
      <Text style={text.section}>크루 만들기</Text>
      <TextInput value={name} onChangeText={setName} placeholder="크루 이름" placeholderTextColor={colors.disabled} style={styles.input} maxLength={16} accessibilityLabel="크루 이름" />
      <TextInput value={area} onChangeText={setArea} placeholder="활동 동네 (선택)" placeholderTextColor={colors.disabled} style={styles.input} maxLength={16} accessibilityLabel="활동 동네" />
      <Button style={{ flex: 0 }} disabled={busy || name.trim().length < 2} onPress={submit}>
        {busy ? '만드는 중…' : '크루 만들기'}
      </Button>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  bar: { height: 6, backgroundColor: colors.panel2, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  input: { backgroundColor: colors.panel2, borderRadius: radius.cardSm, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
