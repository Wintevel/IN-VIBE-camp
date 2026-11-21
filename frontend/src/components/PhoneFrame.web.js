import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { FrameContext } from '../lib/frame'
import { colors, font, text } from '../theme'
import Logo from './Logo'

// 데스크톱(노트북) 브라우저에서 열어도 폰 화면처럼 보이게, 가운데에 폰 크기 틀을 둡니다.
// 창이 좁은 폰·태블릿 세로, 높이가 낮은 가로 화면은 틀 없이 꽉 채웁니다.
const FRAME_W = 400
const MAX_H = 880
const MARGIN = 20 // 틀 위아래 여백
const BEZEL = 12 // 폰 몸체(솟은 판) 두께
const WIDE = 1180 // 이 너비부터 폰 왼쪽에 소개 문구를 둠(폰은 항상 가운데)

export default function PhoneFrame({ children }) {
  const { width, height } = useWindowDimensions()
  const framed = width >= 600 && height >= 520
  if (!framed) return <FrameContext.Provider value={null}>{children}</FrameContext.Provider>

  const h = Math.min(MAX_H, height - MARGIN * 2 - BEZEL * 2)
  return (
    <View style={styles.stage}>
      <View style={styles.row}>
        {width >= WIDE ? (
          <View style={styles.aside} pointerEvents="none">
            <Logo size={56} />
            <Text style={[text.h1, font.brand, { fontSize: 38, lineHeight: 46, letterSpacing: 0.5 }]}>집게표</Text>
            <Text style={[text.regular, { color: colors.sub }]}>동네의 치울 곳을 이웃이 알리고, 근처 사람이 해결하는 환경 미화 의뢰 앱이에요.</Text>
            <Text style={[text.small, { marginTop: 4 }]}>폰 화면 크기로 보여 드려요. 폰에서 열면 화면 전체로 쓸 수 있고, 홈 화면에 설치할 수도 있어요.</Text>
          </View>
        ) : null}
        <View style={styles.body}>
          <View style={[styles.phone, { width: FRAME_W, height: h }]}>
            <FrameContext.Provider value={{ width: FRAME_W, height: h }}>{children}</FrameContext.Provider>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 바탕과 같은 색의 무대 위에 폰이 솟은 판처럼 놓입니다(뉴모피즘).
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page, backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.7), rgba(228,233,242,0) 55%), radial-gradient(ellipse at 60% 70%, rgba(255,212,59,0.10), rgba(228,233,242,0) 50%)', overflow: 'hidden' },
  row: { alignItems: 'center', justifyContent: 'center' },
  aside: { position: 'absolute', right: FRAME_W + 80, top: 0, bottom: 0, width: 300, justifyContent: 'center', gap: 14 },
  body: {
    padding: BEZEL,
    borderRadius: 40 + BEZEL,
    backgroundColor: colors.page,
    boxShadow: '22px 22px 50px #BAC4D4, -22px -22px 50px #FFFFFF, inset 2px 2px 3px #FFFFFF, inset -2px -2px 4px #CBD3E0',
  },
  phone: {
    backgroundColor: colors.ink,
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: 'inset 4px 4px 10px #C2CBD9, inset -4px -4px 10px #FFFFFF',
  },
})
