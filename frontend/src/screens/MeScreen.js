import { StyleSheet, Text, View } from 'react-native'
import { Card, List, SectionTitle } from '../components/ListRows'
import Screen from '../components/Screen'
import { ME } from '../data/mock'
import { useApp } from '../state/AppState'
import { colors, fonts, radius, text } from '../theme'

export default function MeScreen({ navigation }) {
  const app = useApp()
  return (
    <Screen>
      <View style={styles.me}>
        <View style={styles.avatar}>
          <Text style={[text.h1, { fontSize: 26, color: colors.tape }]}>{ME.initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[text.cardTitle, { fontSize: 20 }]}>{ME.nickname}</Text>
          <Text style={[text.small, { marginTop: 4 }]}>
            {app.crew ?? '크루 없음'} · 가입 {ME.joinedDays}일째
          </Text>
        </View>
        <Text onPress={() => navigation.navigate('Settings')} style={[text.chip, styles.settings]} accessibilityRole="button">
          설정
        </Text>
      </View>

      <Card style={{ gap: 8 }}>
        <View style={styles.lvTop}>
          <Text style={text.small}>{ME.levelLabel}</Text>
          <Text style={text.num}>Lv.{ME.level}</Text>
        </View>
        <View style={styles.bar}>
          <View style={{ width: `${ME.levelProgress * 100}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
        </View>
        <View style={styles.lvTop}>
          <Text style={text.small}>다음 레벨까지 {ME.nextLevelPoints}점</Text>
          <Text style={text.small}>누적 {app.points.toLocaleString()}점</Text>
        </View>
      </Card>

      <SectionTitle>배지</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {ME.badges.map((b) => (
          <View key={b.name} style={[styles.badge, !b.on && { opacity: 0.35 }]}>
            <Text style={text.num}>{b.name}</Text>
            <Text style={[text.caption, { fontSize: 11, textAlign: 'center' }]}>{b.desc}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>내 기록</SectionTitle>
      <List rows={ME.records.map(([label, value]) => ({ label, value }))} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.tape, alignItems: 'center', justifyContent: 'center' },
  settings: { color: colors.fg, backgroundColor: colors.panel2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, overflow: 'hidden', fontFamily: fonts.bodyBold },
  lvTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { height: 6, backgroundColor: colors.panel2, borderRadius: 99, overflow: 'hidden' },
  badge: { flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 2 },
})
