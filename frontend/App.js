import { useAppFonts } from './src/theme/loadFonts'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import FrameInsets from './src/components/FrameInsets'
import PhoneFrame from './src/components/PhoneFrame'
import ClearOverlay from './src/components/ClearOverlay'
import QuestSheet from './src/components/QuestSheet'
import SpeedDash from './src/components/SpeedDash'
import Toast from './src/components/Toast'
import RootNavigator from './src/navigation/RootNavigator'
import { AppStateProvider } from './src/state/AppState'
import { colors, theme } from './src/theme'

export default function App() {
  const loaded = useAppFonts()
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.page }} />
  // PhoneFrame: 웹을 데스크톱으로 열면 폰 크기 틀 안에 앱을 넣습니다(폰에서는 그대로). 시트·토스트·연출도 틀 안에서 뜨도록 같은 안에 둡니다.
  return (
    <PhoneFrame>
      <SafeAreaProvider>
        <FrameInsets>
          <AppStateProvider>
            <View style={{ flex: 1, backgroundColor: colors.ink }}>
              <RootNavigator />
              <QuestSheet />
              <Toast />
              <SpeedDash />
              <ClearOverlay />
            </View>
            <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
          </AppStateProvider>
        </FrameInsets>
      </SafeAreaProvider>
    </PhoneFrame>
  )
}
