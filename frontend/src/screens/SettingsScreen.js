import { Text } from 'react-native'
import { List } from '../components/ListRows'
import Screen from '../components/Screen'
import { AREA } from '../data/mock'
import { useApp } from '../state/AppState'
import { text } from '../theme'

// 설정 항목은 시안 가정값입니다. 확정 후 profiles 업데이트·알림 설정과 연결합니다.
export default function SettingsScreen({ navigation }) {
  const app = useApp()
  return (
    <Screen>
      <Text style={text.h1}>설정</Text>
      <List
        rows={[
          { label: '내 동네', value: AREA.name, onPress: () => app.showToast('동네 변경은 곧 열려요') },
          { label: '알림', value: '켜짐', onPress: () => app.showToast('알림 설정은 곧 열려요') },
          { label: '크루 탈퇴', value: app.crew ?? '가입 안 함', onPress: app.crew ? () => { app.leaveCrew(); app.showToast('크루에서 나왔어요') } : undefined },
        ]}
      />
      <List
        rows={[
          { label: '로그아웃', danger: true, onPress: () => app.signOut() },
        ]}
      />
    </Screen>
  )
}
