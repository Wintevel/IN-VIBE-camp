import { Pressable, StyleSheet, Text, View } from 'react-native'
import { code, dist, isCrew, reward } from '../lib/format'
import { colors, radius, text } from '../theme'
import { HeartIcon } from './Icons'
import Stamp from './Stamp'

// 의뢰 카드. 라벨은 "주민 제보"만 쓰고 승격·기준 문구는 보여주지 않습니다.
export default function ReportCard({ report: r, mine, onPress, onHeart }) {
  const done = r.status === 'completed'
  const rw = reward(r)
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.card, r.i_am_participating && !done && styles.accepted, done && { opacity: 0.55 }]}>
      <Text style={[text.code, styles.code]}>{code(r.id)}</Text>
      <View style={styles.tags}>
        <Stamp>주민 제보</Stamp>
        {isCrew(r) ? <Stamp type="partner">크루 의뢰 {r.current_members}/{r.required_members}</Stamp> : null}
        {r.status === 'in_progress' ? <Stamp type="hot">진행 중</Stamp> : null}
        {done ? <Stamp type="done">완료</Stamp> : null}
      </View>
      <View style={styles.body}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={text.cardTitle}>{r.title}</Text>
          <Text style={text.small}>{[r.place_label, dist(r.distance_m), r.dong].filter(Boolean).join('  ')}</Text>
        </View>
        <View style={styles.reward}>
          <Text style={text.point}>{rw.value}</Text>
          <Text style={[text.stamp, { color: colors.sub }]}>{rw.unit}</Text>
        </View>
      </View>
      <Pressable onPress={onHeart} accessibilityRole="button" accessibilityLabel="하트" accessibilityState={{ selected: !!r.liked_by_me }} style={[styles.heart, r.liked_by_me && styles.heartOn]}>
        <HeartIcon filled={!!r.liked_by_me} color={r.liked_by_me ? colors.red : colors.sub} />
        <Text style={[text.chip, { color: r.liked_by_me ? colors.red : colors.sub }]}>{r.like_count ?? 0}</Text>
      </Pressable>
      {r.i_am_participating && !done ? (
        <View style={styles.ribbon}>
          <Text style={[text.chip, { color: colors.onBlue }]}>수락함</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 16, paddingBottom: 14, gap: 10, borderWidth: 1, borderColor: colors.line },
  accepted: { borderColor: colors.blue },
  code: { position: 'absolute', right: 14, top: 14, color: colors.disabled },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingRight: 52 },
  body: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reward: { alignItems: 'flex-end', gap: 2 },
  heart: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel2 },
  heartOn: { backgroundColor: colors.redSoft },
  ribbon: { position: 'absolute', right: -1, bottom: 12, backgroundColor: colors.blue, paddingHorizontal: 10, paddingVertical: 4, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
})
