import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg'
import { colors } from '../theme'

// 집게표 로고: 쓰레기 집게가 느낌표의 막대, 캔 뚜껑이 점입니다(게임의 "퀘스트 있음" 표시).
// 앱 아이콘과 같은 그림입니다(scripts/icon-mark.js 를 고치면 여기도 같이 고칩니다).
const SHADE = '#C99700'
export default function Logo({ size = 72, plain = false }) {
  const main = colors.tape
  return (
    <Svg width={size} height={size} viewBox="0 0 112 112" accessibilityLabel="집게표 로고">
      {plain ? null : <Rect x="0" y="0" width="112" height="112" rx="26" fill={colors.blue} />}
      <Path d="M49.5 64 L41 31 Q41 12 56 12 Q71 12 71 31 L62.5 64" stroke={main} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M49.5 64 L54.5 72 M62.5 64 L57.5 72" stroke={main} strokeWidth="6.5" strokeLinecap="round" fill="none" />
      <Path d="M43.5 48 L51.5 46 M44.8 54 L52.8 52 M68.5 48 L60.5 46 M67.2 54 L59.2 52" stroke={plain ? colors.ink : colors.blue} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <Circle cx="56" cy="14.5" r="2.4" fill={SHADE} />
      <Circle cx="56" cy="92" r="11.5" fill={main} />
      <Circle cx="56" cy="92" r="8.6" stroke={SHADE} strokeWidth="1.4" fill="none" />
      <Ellipse cx="56" cy="96.6" rx="3.9" ry="2.4" fill={colors.tapeInk} />
      <Rect x="52.6" y="85" width="6.8" height="8.4" rx="3.4" stroke={SHADE} strokeWidth="1.8" fill={main} />
      <Circle cx="56" cy="91.4" r="1.2" fill={SHADE} />
    </Svg>
  )
}
