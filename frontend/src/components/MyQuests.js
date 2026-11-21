import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { isCrew, remain } from '../lib/format'
import { colors, radius, text } from '../theme'
import { CameraIcon } from './Icons'
import { Appear, PressScale } from './Motion'
import { RewardPills } from './Reward'

// 내가 수락한 의뢰만 모아 의뢰판 맨 위에 두는 영역. 필터 칩이 아니라 늘 보이는 가로 선반입니다.
export default function MyQuests({ reports, photos, onOpen }) {
  if (reports.length === 0) return null
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.mark} />
        <Text style={text.section}>내가 수락한 의뢰</Text>
        <Text style={[text.num, { fontSize: 15, color: colors.blue }]}>{reports.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} style={styles.scroll}>
        {reports.map((r, i) => {
          const started = r.status === 'in_progress'
          const p = photos[r.id] || {}
          const need = r.proof_mode === 'single' ? 1 : 2
          const have = (p.before ? 1 : 0) + (need === 2 && p.after ? 1 : 0)
          return (
            <Appear key={r.id} index={i}>
              <PressScale onPress={() => onOpen(r.id)} accessibilityRole="button" accessibilityLabel={`수락한 의뢰 ${r.title}`} style={[styles.card, reports.length === 1 && { width: 320 }]}>
                <Text style={[text.caption, { color: started ? colors.tape : colors.sub }]}>{started ? remain(r.deadline_at) : `인원 모집 중 ${r.current_members}/${r.required_members}`}</Text>
                <Text style={text.cardTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.foot}>
                  <RewardPills report={r} style={{ flex: 1 }} />
                  {started ? (
                    <View style={styles.cta}>
                      <CameraIcon size={16} color={colors.onBlue} />
                      <Text style={[text.chip, { color: colors.onBlue }]}>{have >= need ? '제출하기' : `인증 ${have}/${need}`}</Text>
                    </View>
                  ) : isCrew(r) ? (
                    <Text style={[text.chip, { color: colors.sub }]}>대기 중</Text>
                  ) : null}
                </View>
              </PressScale>
            </Appear>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 6, height: 16, backgroundColor: colors.blue, transform: [{ skewX: '-16deg' }] },
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  list: { gap: 10, paddingHorizontal: 20 },
  card: { width: 264, gap: 6, backgroundColor: colors.blueWeak, borderWidth: 1, borderColor: colors.blue, borderRadius: radius.lg, padding: 14 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
})
