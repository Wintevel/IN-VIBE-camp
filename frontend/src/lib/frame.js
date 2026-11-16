import { createContext, useContext } from 'react'
import { useWindowDimensions } from 'react-native'

// 웹에서 데스크톱으로 열면 앱이 가운데 폰 크기 틀(components/PhoneFrame.web.js) 안에 들어갑니다.
// 이때 화면 크기가 필요한 컴포넌트는 창 크기(useWindowDimensions) 대신 이 훅으로 틀의 크기를 받아야 합니다.
// 틀이 없으면(폰·작은 창) 창 크기를 그대로 돌려줍니다.
export const FrameContext = createContext(null)

export function useFrameSize() {
  const frame = useContext(FrameContext)
  const win = useWindowDimensions()
  return frame || win
}
