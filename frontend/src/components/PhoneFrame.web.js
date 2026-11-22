import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { FrameContext } from '../lib/frame'
import { colors, text } from '../theme'
import Logo from './Logo'

// 데스크톱(노트북) 브라우저에서 열어도 폰 화면처럼 보이게, 가운데에 폰 크기 틀을 둡니다.
// 창이 좁은 폰·태블릿 세로, 높이가 낮은 가로 화면은 틀 없이 꽉 채웁니다.
const FRAME_W = 400
const MAX_H = 880
const MARGIN = 20 // 틀 위아래 여백
const WIDE = 1180 // 이 너비부터 폰 왼쪽에 소개 문구를 둠(폰은 항상 가운데)

export default function PhoneFrame({ children }) {
  const { width, height } = useWindowDimensions()
  const framed = width >= 600 && height >= 520
  if (!framed) return <FrameContext.Provider value={null}>{children}</FrameContext.Provider>

  const h = Math.min(MAX_H, height - MARGIN * 2)
  return (
    <View style={styles.stage}>
      <View style={styles.row}>
        {width >= WIDE ? (
          <View style={styles.aside} pointerEvents="none">
            <Logo size={56} />
            <Text style={[text.h1, { fontSize: 34, lineHeight: 42 }]}>집게표</Text>
            <Text style={[text.regular, { color: colors.sub }]}>동네 환경 미화 의뢰판</Text>
            <Text style={[text.small, { marginTop: 4 }]}>폰에서 열면 전체 화면으로 쓰고, 홈 화면에 설치할 수 있어요.</Text>
          </View>
        ) : null}
        <View style={[styles.phone, { width: FRAME_W, height: h }]}>
          <FrameContext.Provider value={{ width: FRAME_W, height: h }}>{children}</FrameContext.Provider>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page, overflow: 'hidden' },
  row: { alignItems: 'center', justifyContent: 'center' },
  aside: { position: 'absolute', right: FRAME_W + 80, top: 0, bottom: 0, width: 300, justifyContent: 'center', gap: 14 },
  phone: {
    backgroundColor: colors.ink,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: '0 28px 80px rgba(0,0,0,0.6), 0 0 0 8px #15171c, 0 0 0 9px #2a2f38',
  },
})
