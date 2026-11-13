import { View } from 'react-native'
import { colors } from '../theme'
import { CameraIcon, HeartIcon, PointIcon, TabIcon } from './Icons'

// 안내 항목 아이콘. 이미 있는 아이콘을 둥근 판 위에 올립니다.
export default function GuideIcon({ name, size = 56 }) {
  const s = size * 0.5
  const icon =
    name === 'camera' ? <CameraIcon size={s} color={colors.fg} /> : name === 'heart' ? <HeartIcon size={s} filled color={colors.red} /> : name === 'point' ? <PointIcon size={s} /> : <TabIcon name={name} color={colors.blue} size={s} />
  return <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
}
