import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors } from '../theme'

// 집게표 로고: 쓰레기 집게 두 다리가 느낌표의 막대, 집으려는 것이 점입니다(게임의 "퀘스트 있음" 표시).
// assets 의 앱 아이콘과 같은 그림입니다(scripts/icon.svg).
export default function Logo({ size = 72, plain = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 112 112" accessibilityLabel="집게표 로고">
      {plain ? null : <Rect x="0" y="0" width="112" height="112" rx="26" fill={colors.blue} />}
      <Path d="M45 24 L52.5 72" stroke={colors.tape} strokeWidth="7.5" strokeLinecap="round" fill="none" />
      <Path d="M67 24 L59.5 72" stroke={colors.tape} strokeWidth="7.5" strokeLinecap="round" fill="none" />
      <Rect x="39" y="15" width="34" height="13" rx="6.5" fill={colors.tape} />
      <Circle cx="56" cy="89" r="8.5" fill={colors.tape} />
    </Svg>
  )
}
