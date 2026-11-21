import { StyleSheet, Text, View } from 'react-native'
import { colors, text } from '../theme'

export default function Ticker({ children }) {
  return (
    <View style={styles.box}>
      <Text style={[text.ticker, { color: colors.tapeInk }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.tape, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, transform: [{ rotate: '-1deg' }], boxShadow: '5px 5px 12px #C2CBD9, -5px -5px 12px #FFFFFF' },
})
