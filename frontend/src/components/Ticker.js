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
  box: { backgroundColor: colors.tape, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, transform: [{ rotate: '-1deg' }] },
})
