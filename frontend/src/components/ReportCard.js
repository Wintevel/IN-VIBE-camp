import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { photoUrl } from '../api'
import { code, dist, isCrew, isPartner } from '../lib/format'
import { colors, radius, text } from '../theme'
import { GiftIcon, HeartIcon, PinIcon } from './Icons'
import { PressScale } from './Motion'
import { RewardPills } from './Reward'
import Stamp from './Stamp'

// 의뢰 카드: 왼쪽 사진, 오른쪽 내용. 라벨은 "주민 제보"만 쓰고 승격·기준 문구는 보여주지 않습니다.
export default function ReportCard({ report: r, onPress, onHeart }) {
  const done = r.status === 'completed'
  const img = photoUrl(r.photo_path)
  return (
    <PressScale onPress={onPress} accessibilityRole="button" to={0.975} style={[styles.card, r.i_am_participating && !done && styles.accepted, done && { opacity: 0.55 }]}>
      <View style={styles.thumb}>
        {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="제보 사진" /> : isPartner(r) ? <GiftIcon size={30} /> : <PinIcon size={28} />}
        <View style={styles.codeTag}>
          <Text style={[text.code, { color: colors.fg }]}>{code(r.id)}</Text>
        </View>
      </View>
      <View style={styles.main}>
        <View style={styles.tags}>
          {isPartner(r) ? <Stamp type="partner">제휴 의뢰</Stamp> : <Stamp>주민 제보</Stamp>}
          {isCrew(r) ? <Stamp type="partner">크루 {r.current_members}/{r.required_members}</Stamp> : null}
          {r.status === 'in_progress' ? <Stamp type="hot">진행 중</Stamp> : null}
          {done ? <Stamp type="done">완료</Stamp> : null}
        </View>
        <Text style={text.cardTitle} numberOfLines={2}>
          {r.title}
        </Text>
        <Text style={text.small} numberOfLines={1}>
          {[r.partner_name, r.place_label, dist(r.distance_m), r.dong].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.bottom}>
          <RewardPills report={r} style={{ flex: 1 }} />
          <Pressable onPress={onHeart} hitSlop={6} accessibilityRole="button" accessibilityLabel="하트" accessibilityState={{ selected: !!r.liked_by_me }} style={[styles.heart, r.liked_by_me && styles.heartOn]}>
            <HeartIcon size={16} filled={!!r.liked_by_me} color={r.liked_by_me ? colors.red : colors.sub} />
            <Text style={[text.chip, { color: r.liked_by_me ? colors.red : colors.sub }]}>{r.like_count ?? 0}</Text>
          </Pressable>
        </View>
      </View>
      {r.i_am_participating && !done ? <View style={styles.edge} /> : null}
    </PressScale>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  accepted: { borderColor: colors.blue },
  thumb: { width: 88, alignSelf: 'stretch', minHeight: 104, borderRadius: radius.md, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  codeTag: { position: 'absolute', left: 0, bottom: 0, backgroundColor: 'rgba(17,19,23,0.72)', paddingHorizontal: 6, paddingVertical: 3, borderTopRightRadius: 8 },
  main: { flex: 1, gap: 6, paddingVertical: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  heart: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.panel2 },
  heartOn: { backgroundColor: colors.redSoft },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.blue },
})
