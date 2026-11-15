import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from './BoardBackground'
import { ND, reduced } from './Motion'

// 탭·스택 화면 공통 틀: 게시판 배경 + 안전영역 + 좌우 20 패딩
export default function Screen({ children, top = true, bottomPad = 24, refreshControl }) {
  const insets = useSafeAreaInsets()
  // 화면이 처음 열릴 때만 짧게 나타납니다. 폰은 내비게이션이 화면을 밀어 주므로 여기서는 움직이지 않고,
  // 웹은 그 효과가 없어 옅게 나타나기만 합니다. 탭을 오가거나 돌아올 때는 다시 재생하지 않습니다(같은 화면이 깜빡이는 느낌이 나서).
  const still = Platform.OS !== 'web' || reduced()
  const v = useRef(new Animated.Value(still ? 1 : 0)).current
  useEffect(() => {
    if (still) return
    Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start()
  }, [still, v])
  return (
    <BoardBackground>
      <Animated.View style={{ flex: 1, opacity: v }}>
      <ScrollView refreshControl={refreshControl} contentContainerStyle={[styles.content, { paddingTop: (top ? insets.top : 0) + 8, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      </Animated.View>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 20, gap: 16 } })
