import { useContext } from 'react'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'
import { FrameContext } from '../lib/frame'

// 데스크톱 폰 틀 안에서는 브라우저에 안전영역이 없으므로, 폰의 상태 표시줄·홈 표시줄 자리를 가상으로 줍니다.
// (둥근 모서리에 제목이나 탭바가 붙지 않게.) 틀이 없으면 아무것도 하지 않습니다.
const INSETS = { top: 22, bottom: 12, left: 0, right: 0 }

export default function FrameInsets({ children }) {
  const framed = useContext(FrameContext)
  if (!framed) return children
  return <SafeAreaInsetsContext.Provider value={INSETS}>{children}</SafeAreaInsetsContext.Provider>
}
