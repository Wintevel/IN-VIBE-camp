import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFrameSize } from '../lib/frame'
import { colors, radius } from '../theme'
import { ND, reduced } from './Motion'
import Toast from './Toast'

const WEB = Platform.OS === 'web'

// 어두운 토스식 바텀시트. 딤을 누르거나, 손잡이를 아래로 끌거나, Esc 로 닫습니다.
// 열 때는 아래에서 올라오고 닫을 때도 내려가며 사라집니다(닫는 움직임이 끝난 뒤에 내용을 치웁니다).
// 웹에서는 Modal 대신 앱 안의 덮개로 그려서, 데스크톱 폰 틀 밖으로 나가지 않게 합니다.
export default function BottomSheet({ visible, onClose, children, footer }) {
  const insets = useSafeAreaInsets()
  const { height } = useFrameSize()
  const [mounted, setMounted] = useState(visible)
  const p = useRef(new Animated.Value(visible ? 1 : 0)).current // 0 닫힘 → 1 열림
  const drag = useRef(new Animated.Value(0)).current // 손잡이로 끌어내린 거리(px)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const heightRef = useRef(height)
  heightRef.current = height

  // 열기: 내용이 그려진 뒤에 올라오게 합니다(그리기 전에 시작하면 첫 프레임이 튑니다).
  useEffect(() => {
    if (visible) setMounted(true)
    else Animated.timing(p, { toValue: 0, duration: reduced() ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => finished && setMounted(false))
  }, [visible, p])
  useEffect(() => {
    if (!visible || !mounted) return
    drag.setValue(0)
    Animated.timing(p, { toValue: 1, duration: reduced() ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start()
  }, [visible, mounted, p, drag])

  // Esc 로 닫기(웹)
  useEffect(() => {
    if (!WEB || !visible) return
    const on = (e) => e.key === 'Escape' && closeRef.current?.()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [visible])

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => drag.setValue(g.dy > 0 ? g.dy : g.dy / 6), // 위로는 살짝만(고무줄)
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) {
          Animated.timing(drag, { toValue: heightRef.current, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start()
          closeRef.current?.()
        } else {
          Animated.spring(drag, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: ND }).start()
        }
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: ND }).start(),
    })
  ).current

  if (!mounted) return null

  const body = (
    <>
      <Animated.View style={[styles.dim, { opacity: p }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: 20 + insets.bottom, transform: [{ translateY: Animated.add(p.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }), drag) }] },
        ]}
        {...(WEB ? { role: 'dialog', 'aria-modal': true } : null)}
      >
        <View style={styles.grabZone} {...pan.panHandlers} accessibilityLabel="아래로 끌어서 닫기">
          <View style={styles.grab} />
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer}
      </Animated.View>
    </>
  )

  if (WEB) {
    return (
      <View style={styles.overlay} pointerEvents="box-none">
        {body}
      </View>
    )
  }
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {body}
      <Toast />
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.dim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: colors.sheetBg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, gap: 4 },
  grabZone: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 12, paddingBottom: 12, ...(WEB ? { cursor: 'grab' } : null) },
  grab: { width: 40, height: 4, borderRadius: 9, backgroundColor: colors.sheetLine },
})
