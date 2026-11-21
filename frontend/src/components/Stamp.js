import { StyleSheet, Text, View } from 'react-native'
import { colors, neu, radius, text } from '../theme'

// type: default | partner(제휴, 노란 띠) | hot | done
export default function Stamp({ type = 'default', children }) {
  const s = variants[type]
  return (
    <View style={[styles.base, { backgroundColor: s.bg }, s.style, type === 'partner' && styles.skew]}>
      <Text style={[text.stamp, { color: s.fg }]}>{children}</Text>
    </View>
  )
}

const variants = {
  default: { bg: colors.panel, fg: colors.sub, style: neu.insetSm },
  partner: { bg: colors.tape, fg: colors.tapeInk, style: { boxShadow: '2px 2px 5px #C2CBD9' } },
  hot: { bg: colors.redSoft, fg: colors.red },
  done: { bg: colors.greenSoft, fg: colors.green },
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.sm },
  skew: { transform: [{ rotate: '-4deg' }] },
})
