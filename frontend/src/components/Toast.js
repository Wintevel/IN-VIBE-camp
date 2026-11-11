import { StyleSheet, Text, View } from 'react-native'
import { colors, text } from '../theme'
import { useApp } from '../state/AppState'

// 탭바 위에 잠깐 뜨는 안내. 상태는 AppState.toast 가 가집니다.
export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.box}>
        <Text style={[text.button, { color: colors.onBlue, fontSize: 14 }]}>{toast.message}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, bottom: 96, alignItems: 'center' },
  box: { backgroundColor: colors.sheetToast, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
})
