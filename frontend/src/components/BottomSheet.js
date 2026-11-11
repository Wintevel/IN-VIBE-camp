import { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius } from '../theme'
import Toast from './Toast'

// 어두운 토스식 바텀시트. 딤을 누르면 닫힙니다.
export default function BottomSheet({ visible, onClose, children, footer }) {
  const insets = useSafeAreaInsets()
  const y = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.timing(y, { toValue: visible ? 0 : 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [visible, y])
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기" />
      <Animated.View style={[styles.sheet, { paddingBottom: 20 + insets.bottom, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }] }]}>
        <View style={styles.grab} />
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer}
      </Animated.View>
      <Toast />
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.dim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: colors.sheetBg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 12, paddingHorizontal: 20, gap: 16 },
  grab: { width: 40, height: 4, borderRadius: 9, backgroundColor: colors.sheetLine, alignSelf: 'center' },
})
