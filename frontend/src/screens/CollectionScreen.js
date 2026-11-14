import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Card, SectionTitle } from '../components/ListRows'
import { Appear, Bar } from '../components/Motion'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { DEX_ISSUES, DEX_PLACES, DEX_TOTAL, dexCount, progress, statsOf } from '../lib/achievements'
import { useApp } from '../state/AppState'
import { colors, font, radius, text } from '../theme'

// 도전과제와 도감. 포인트(노랑)와 구분되게 보라색을 씁니다.
export default function CollectionScreen({ navigation }) {
  const app = useApp()
  const [tab, setTab] = useState('feats')
  const s = statsOf(app.profile, app.myCrew)
  const feats = progress(s)
  const done = feats.filter((a) => a.done).length
  // 달성한 것을 위로, 그다음은 진행이 많이 된 순서
  const sorted = [...feats].sort((a, b) => b.done - a.done || b.now / b.goal - a.now / a.goal)

  return (
    <Screen>
      <ScreenHeader title="도전과제 · 도감" sub="달성한 도전과제의 이름은 칭호로 쓸 수 있어요" action="닫기" onAction={() => navigation.goBack()} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          ['feats', `도전과제 ${done}/${feats.length}`],
          ['dex', `도감 ${dexCount(s)}/${DEX_TOTAL}`],
        ].map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[styles.tab, tab === k && styles.tabOn]}>
            <Text style={[text.chip, { color: tab === k ? colors.ink : colors.sub }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'feats' ? (
        sorted.map((a, i) => (
          <Appear key={a.id} index={i}>
            <Card style={[styles.feat, a.done && { borderColor: colors.purple }]}>
              <View style={[styles.medal, a.done && { backgroundColor: colors.purple }]}>
                <Text style={[text.num, { color: a.done ? colors.ink : colors.disabled }]}>{a.done ? '✓' : '?'}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[text.section, !a.done && { color: colors.sub }]}>{a.name}</Text>
                <Text style={text.caption}>{a.desc}</Text>
                {a.done ? null : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Bar ratio={a.now / a.goal} color={colors.purple} track={colors.panel2} style={{ flex: 1 }} />
                    <Text style={text.caption}>
                      {a.now}/{a.goal}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </Appear>
        ))
      ) : (
        <>
          <Dex title="장소" rows={DEX_PLACES} counts={s.places} />
          <Dex title="문제 유형" rows={DEX_ISSUES} counts={s.issues} />
          <Text style={text.caption}>의뢰를 해결하면 그 장소와 문제 유형이 도감에 채워져요.</Text>
        </>
      )}
    </Screen>
  )
}

function Dex({ title, rows, counts }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.grid}>
        {rows.map(([key, label, note]) => {
          const n = counts[key] || 0
          return (
            <View key={key} style={[styles.cell, n > 0 && { borderColor: colors.purple, backgroundColor: 'rgba(169,124,255,0.10)' }]} accessibilityLabel={n > 0 ? `${label}, ${n}번 해결` : '아직 발견하지 못함'}>
              <Text style={[text.section, n === 0 && { color: colors.disabled }]}>{n > 0 ? label : '???'}</Text>
              <Text style={[text.caption, { minHeight: 32 }]}>{n > 0 ? note : '아직 치워 본 적 없어요'}</Text>
              <Text style={[styles.count, { color: n > 0 ? colors.purple : colors.disabled }]}>{n > 0 ? `${n}번 해결` : '미발견'}</Text>
            </View>
          )
        })}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.pill, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.purple },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  medal: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', flexGrow: 1, gap: 4, padding: 12, borderRadius: radius.cardSm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  count: { ...font.bodyBold, fontSize: 12, lineHeight: 16 },
})
