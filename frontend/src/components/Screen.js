import { useRoute } from '@react-navigation/native'
import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from './BoardBackground'
import { ND, reduced } from './Motion'

const TAB_ROUTES = ['Board', 'Map', 'Crew', 'Me']

// 탭·스택 화면 공통 틀: 게시판 배경 + 안전영역 + 좌우 20 패딩
export default function Screen({ children, top = true, bottomPad = 24, refreshControl }) {
  const insets = useSafeAreaInsets()
  const route = useRoute()
  // 화면을 넘기는 움직임: 폰은 내비게이션이 직접 밀어 주므로 여기서는 움직이지 않습니다.
  // 웹은 그 효과가 없어서, 스택으로 새로 열리는 화면(설정·상점 등)만 오른쪽에서 짧게 밀려 들어옵니다.
  // 탭 사이 전환은 탭 내비게이터의 크로스페이드가 맡으므로 다시 재생하지 않습니다(같은 화면이 깜빡이는 느낌이 나서).
  const still = Platform.OS !== 'web' || reduced() || TAB_ROUTES.includes(route.name)
  const v = useRef(new Animated.Value(still ? 1 : 0)).current
  useEffect(() => {
    if (still) return
    Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND }).start()
  }, [still, v])
  return (
    <BoardBackground>
      <Animated.View style={{ flex: 1, opacity: v.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }}>
        <ScrollView refreshControl={refreshControl} contentContainerStyle={[styles.content, { paddingTop: (top ? insets.top : 0) + 8, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 20, gap: 22 } })
