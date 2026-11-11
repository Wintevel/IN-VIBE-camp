import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import Stamp from './Stamp'

const KIND_LABEL = { partner: '제휴 의뢰', crew: '크루 의뢰' }

// state: default | accepted | cleared
export default function QuestCard({ quest, state = 'default', onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.card, state === 'accepted' && styles.accepted, state === 'cleared' && { opacity: 0.55 }]}
    >
      <Text style={[text.code, styles.code]}>{quest.id}</Text>
      <View style={styles.tags}>
        <Stamp type={quest.kind === 'partner' ? 'partner' : 'default'}>{KIND_LABEL[quest.kind]}</Stamp>
        {quest.hot ? <Stamp type="hot">제보 많음</Stamp> : null}
        {state === 'cleared' ? <Stamp type="done">완료</Stamp> : null}
      </View>
      <View style={styles.body}>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={text.cardTitle}>{quest.title}</Text>
          <Text style={text.small}>
            {quest.org}  {quest.dist}  {quest.time}
          </Text>
        </View>
        <View style={styles.reward}>
          <Text style={text.point}>{quest.point}</Text>
          <Text style={[text.stamp, { color: colors.sub }]}>POINT</Text>
        </View>
      </View>
      {state === 'accepted' ? (
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
  ribbon: { position: 'absolute', right: -1, bottom: 12, backgroundColor: colors.blue, paddingHorizontal: 10, paddingVertical: 4, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
})
