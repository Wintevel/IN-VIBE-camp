import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../components/Button'
import { CrewXpIcon, PointIcon } from '../components/Icons'
import { Card, SectionTitle } from '../components/ListRows'
import { Appear, Bar, CountUp } from '../components/Motion'
import ReportCard from '../components/ReportCard'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { Empty, refresher } from '../components/States'
import { isCrew } from '../lib/format'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

const TABS = [
  ['feed', '활동'],
  ['quests', '크루 의뢰'],
  ['members', '크루원'],
  ['rank', '랭킹'],
]

// 크루: 크루 활동 경험치로 레벨과 순위가 오르고, 크루원이 의뢰를 해결하면 활동 방에 자동 알림이 올라옵니다.
export default function CrewScreen({ navigation }) {
  const app = useApp()
  const mine = app.myCrew
  const [tab, setTab] = useState('feed')
  const quests = app.reports.filter((r) => isCrew(r) && r.status !== 'completed')

  if (!mine) {
    return (
      <Screen refreshControl={refresher(app)}>
        <ScreenHeader title="크루" sub="함께 줍는 크루를 만들거나 가입해요" />
        <Appear>
          <CreateCrew onCreate={app.createCrew} />
        </Appear>
        <SectionTitle>크루 랭킹</SectionTitle>
        <Ranking crews={app.crews} onJoin={app.joinCrew} />
        <LocalNote app={app} />
      </Screen>
    )
  }

  return (
    <Screen refreshControl={refresher(app)}>
      <ScreenHeader title="크루" sub="크루원이 의뢰를 해결하면 크루 경험치가 쌓여요" />
      <Appear from="left">
        <View style={styles.banner}>
          <View style={styles.slash} />
          <View style={styles.slash2} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.emblem}>
              <Text style={[text.h1, { fontSize: 24, lineHeight: 28, color: colors.ink }]}>{mine.name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[text.title, { fontSize: 22, lineHeight: 26 }]} numberOfLines={1}>
                {mine.name}
              </Text>
              <Text style={[text.caption, { marginTop: 2 }]}>{[mine.area, `크루원 ${mine.member_count}명`].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[text.h1, { color: colors.tape }]}>{mine.rank}위</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CrewXpIcon size={20} />
            <Text style={[text.num, { color: colors.purple }]}>Lv.{mine.level}</Text>
            <Bar ratio={mine.xp_in_level / mine.xp_for_next_level} color={colors.purple} track={colors.panel2} height={8} style={{ flex: 1 }} />
            <Text style={text.caption}>
              {mine.xp_in_level}/{mine.xp_for_next_level}
            </Text>
          </View>
        </View>
      </Appear>

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map(([key, label]) => {
          const on = tab === key
          return (
            <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[text.chip, { color: on ? colors.ink : colors.sub }]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>

      <View key={tab} style={{ gap: 12 }}>
        {tab === 'feed' ? <Feed crew={mine} /> : null}
        {tab === 'quests' ? (
          <>
            <Appear>
              <View style={styles.questHead}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={text.section}>크루 의뢰는 2명부터</Text>
                  <Text style={text.caption}>인원이 모이면 시작되고, 해결하면 포인트와 크루 경험치 2배를 받아요</Text>
                </View>
                <Button compact onPress={() => navigation.navigate('ReportCreate', { crew: true })}>
                  올리기
                </Button>
              </View>
            </Appear>
            {quests.map((r, i) => (
              <Appear key={r.id} index={i + 1}>
                <ReportCard report={r} onPress={() => app.openSheet(r.id)} onHeart={() => app.toggleHeart(r.id)} />
              </Appear>
            ))}
            {quests.length === 0 ? <Empty title="모집 중인 크루 의뢰가 없어요" sub="혼자 치우기 힘든 곳을 크루 의뢰로 올려 보세요" /> : null}
          </>
        ) : null}
        {tab === 'members' ? <Members crew={mine} onLeave={app.leaveCrew} /> : null}
        {tab === 'rank' ? <Ranking crews={app.crews} /> : null}
      </View>
      <LocalNote app={app} />
    </Screen>
  )
}

const LocalNote = ({ app }) => (app.localMode ? <Text style={text.caption}>지금은 서버가 없어 이 기기에서 만든 크루와 활동만 보여요. 서버가 연결되면 다른 사람의 크루와 순위를 겨뤄요.</Text> : null)

const hhmm = (at) => {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const LINE = {
  create: (e) => `${e.user} 님이 크루를 만들었어요`,
  join: (e) => `${e.user} 님이 크루에 들어왔어요`,
  leave: (e) => `${e.user} 님이 크루에서 나갔어요`,
}

// 활동 방: 사람이 쓰는 채팅이 아니라 자동 알림만 올라오는 단체방입니다.
function Feed({ crew }) {
  const items = crew.feed || []
  return (
    <View style={styles.room}>
      <View style={styles.roomHead}>
        <View style={styles.live} />
        <Text style={[text.chip, { color: colors.fg, flex: 1 }]}>{crew.name} 활동 방</Text>
        <Text style={text.caption}>자동 알림</Text>
      </View>
      <View style={{ padding: 12, gap: 12 }}>
        {items.map((e, i) =>
          LINE[e.type] ? (
            <Appear key={e.id} index={i} from="bottom" style={styles.sys}>
              <Text style={[text.caption, { textAlign: 'center' }]}>
                {LINE[e.type](e)} · {hhmm(e.at)}
              </Text>
            </Appear>
          ) : (
            <Appear key={e.id} index={i} from="left" style={styles.msg}>
              <View style={styles.face}>
                <Text style={[text.num, { fontSize: 15, color: colors.tape }]}>{(e.user || '줍').slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={text.caption}>
                  {e.user} · {hhmm(e.at)}
                </Text>
                <View style={[styles.bubble, e.type === 'complete' && styles.bubbleDone]}>
                  <Text style={[text.stamp, { color: e.type === 'complete' ? colors.green : colors.tape }]}>{e.type === 'complete' ? (e.is_crew_quest ? '크루 의뢰 해결' : '의뢰 해결') : '크루 의뢰 등록'}</Text>
                  <Text style={[text.section, { fontSize: 14 }]}>{e.title}</Text>
                  {e.type === 'complete' ? (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                      <Gain icon={<CrewXpIcon size={16} />} value={e.crew_xp} color={colors.purple} />
                      {e.points > 0 ? <Gain icon={<PointIcon size={16} />} value={e.points} color={colors.tape} /> : null}
                    </View>
                  ) : (
                    <Text style={text.caption}>함께할 크루원을 기다려요</Text>
                  )}
                </View>
              </View>
            </Appear>
          ),
        )}
        {items.length === 0 ? <Text style={[text.caption, { textAlign: 'center', paddingVertical: 20 }]}>아직 활동이 없어요</Text> : null}
      </View>
      <View style={styles.roomFoot}>
        <Text style={text.caption}>크루원이 의뢰를 해결하면 여기에 자동으로 올라와요</Text>
      </View>
    </View>
  )
}

const Gain = ({ icon, value, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    {icon}
    <Text style={[text.num, { fontSize: 15, color }]}>{(value || 0).toLocaleString()}</Text>
  </View>
)

function Members({ crew, onLeave }) {
  const [confirm, setConfirm] = useState(false)
  const total = crew.members.reduce((s, m) => s + m.contribution, 0)
  const top = Math.max(1, ...crew.members.map((m) => m.contribution))
  return (
    <>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {crew.members.map((m, i) => (
          <Appear key={m.id} index={i} style={[styles.row, i > 0 && styles.sep, m.is_me && { backgroundColor: colors.blueWeak }]}>
            <Text style={[text.point, { width: 28, textAlign: 'center', color: i === 0 && m.contribution > 0 ? colors.tape : colors.sub }]}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={text.section}>{m.nickname}</Text>
                {m.is_me ? <Text style={[text.stamp, { color: colors.blue }]}>나</Text> : null}
                {m.is_owner ? <Text style={[text.stamp, { color: colors.tape }]}>크루장</Text> : null}
              </View>
              <Bar ratio={m.contribution / top} color={colors.purple} track={colors.panel2} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CrewXpIcon size={16} />
                <CountUp value={m.contribution} style={[text.num, { color: colors.purple }]} />
              </View>
              <Text style={text.caption}>기여 {total > 0 ? Math.round((m.contribution / total) * 100) : 0}%</Text>
            </View>
          </Appear>
        ))}
      </Card>
      <Text style={text.caption}>기여도는 크루원이 의뢰를 해결해 쌓은 크루 경험치예요. 크루 의뢰는 2배로 쌓여요.</Text>
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
          <Button type="ghost" onPress={() => setConfirm(true)}>
            크루 탈퇴
          </Button>
        )}
      </View>
    </>
  )
}

function Ranking({ crews, onJoin }) {
  const top = Math.max(1, ...crews.map((c) => c.score))
  if (crews.length === 0) return <Empty title="아직 크루가 없어요" sub="첫 크루를 만들어 보세요" />
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {crews.map((c, i) => (
        <Appear key={c.id} index={i} style={[styles.row, i > 0 && styles.sep, c.is_mine && { backgroundColor: colors.blueWeak }]}>
          <Text style={[text.point, { width: 28, textAlign: 'center', color: i === 0 ? colors.tape : colors.sub }]}>{c.rank}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={text.section}>{c.name}</Text>
            <Text style={text.caption}>{[`Lv.${c.level}`, c.area, `${c.member_count}명`].filter(Boolean).join(' · ')}</Text>
            <Bar ratio={c.score / top} color={colors.purple} track={colors.panel2} />
          </View>
          {onJoin ? (
            <Button type="weak" compact onPress={() => onJoin(c)}>
              가입
            </Button>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <CrewXpIcon size={16} />
              <Text style={text.monoPoint}>{c.score.toLocaleString()}</Text>
            </View>
          )}
        </Appear>
      ))}
    </Card>
  )
}

function CreateCrew({ onCreate }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    await onCreate({ name: name.trim(), area: area.trim() })
    setBusy(false)
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
  banner: { gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.purple, overflow: 'hidden' },
  slash: { position: 'absolute', right: 40, top: -30, bottom: -30, width: 46, backgroundColor: 'rgba(169,124,255,0.14)', transform: [{ skewX: '-18deg' }] },
  slash2: { position: 'absolute', right: 104, top: -30, bottom: -30, width: 14, backgroundColor: 'rgba(169,124,255,0.14)', transform: [{ skewX: '-18deg' }] },
  emblem: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tape, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.fg },
  questHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  room: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  roomFoot: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.panel2, alignItems: 'center' },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  sys: { alignSelf: 'center', backgroundColor: colors.panel2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  msg: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  face: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  bubble: { alignSelf: 'flex-start', maxWidth: '100%', gap: 3, backgroundColor: colors.panel2, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleDone: { borderWidth: 1, borderColor: 'rgba(61,214,140,0.45)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
  input: { backgroundColor: colors.panel2, borderRadius: radius.cardSm, color: colors.fg, ...font.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
})
