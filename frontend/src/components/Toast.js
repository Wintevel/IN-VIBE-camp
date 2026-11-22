import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, text } from '../theme'
import { useApp } from '../state/AppState'
import { FadeUp } from './Motion'

// 탭바 위에 잠깐 뜨는 안내. 상태는 AppState.toast 가 가집니다.
// 뜰 때는 아래에서 살짝 올라오고, 사라질 때는 아래로 옅어지며 내려갑니다(사라지는 동안은 마지막 내용을 그대로 둠).
export default function Toast() {
  const { toast } = useApp()
  const [shown, setShown] = useState(toast)
  useEffect(() => {
    if (toast) return setShown(toast)
    const t = setTimeout(() => setShown(null), 200)
    return () => clearTimeout(t)
  }, [toast])
  if (!shown) return null
  return (
    <View style={styles.wrap} pointerEvents="box-none" accessibilityLiveRegion="polite">
      <FadeUp key={shown.id} visible={!!toast} distance={14} style={styles.box}>
        <Text style={[text.button, { color: colors.onBlue, fontSize: 14, flexShrink: 1 }]}>{shown.message}</Text>
        {shown.action ? (
          <Pressable onPress={shown.action.onPress} hitSlop={10} accessibilityRole="button" style={styles.action}>
            <Text style={[text.button, { color: colors.tapeText, fontSize: 14 }]}>{shown.action.label}</Text>
          </Pressable>
        ) : null}
      </FadeUp>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, bottom: 96, alignItems: 'center', zIndex: 70 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.sheetToast, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  action: { paddingVertical: 2 },
})
