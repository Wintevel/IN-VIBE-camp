import { ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BoardBackground from './BoardBackground'

// 탭·스택 화면 공통 틀: 게시판 배경 + 안전영역 + 좌우 20 패딩
export default function Screen({ children, top = true, bottomPad = 24 }) {
  const insets = useSafeAreaInsets()
  return (
    <BoardBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: (top ? insets.top : 0) + 8, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </BoardBackground>
  )
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 20, gap: 16 } })
