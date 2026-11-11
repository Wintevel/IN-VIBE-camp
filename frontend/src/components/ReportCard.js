import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { HeartIcon } from './Icons'
import Stamp from './Stamp'

// 제보 카드는 "주민 제보" 스탬프만 보여줍니다. 승격·기준 문구는 쓰지 않습니다.
export default function ReportCard({ report, hearted, onHeart }) {
  return (
    <View style={styles.card}>
      <Text style={[text.code, styles.code]}>{report.id}</Text>
      <View style={styles.tags}>
        <Stamp>주민 제보</Stamp>
      </View>
      <View style={styles.body}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={text.cardTitle}>{report.title}</Text>
          <Text style={text.small}>
            {report.author}  {report.dist}  {report.time}
          </Text>
          {report.desc ? <Text style={[text.small, { lineHeight: 19 }]}>{report.desc}</Text> : null}
        </View>
        <View style={styles.reward}>
          <Text style={text.point}>{report.point}</Text>
          <Text style={[text.stamp, { color: colors.sub }]}>POINT</Text>
        </View>
      </View>
      <Pressable onPress={onHeart} accessibilityRole="button" accessibilityState={{ selected: hearted }} style={[styles.heart, hearted && styles.heartOn]}>
        <HeartIcon filled={hearted} color={hearted ? colors.red : colors.sub} />
        <Text style={[text.chip, { color: hearted ? colors.red : colors.sub }]}>{report.hearts}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 16, paddingBottom: 14, gap: 10, borderWidth: 1, borderColor: colors.line },
  code: { position: 'absolute', right: 14, top: 14, color: colors.disabled },
  tags: { flexDirection: 'row', gap: 6 },
  body: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reward: { alignItems: 'flex-end', gap: 2 },
  heart: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel2 },
  heartOn: { backgroundColor: colors.redSoft },
})
