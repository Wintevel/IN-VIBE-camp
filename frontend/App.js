import { useAppFonts } from './src/theme/loadFonts'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import ClearOverlay from './src/components/ClearOverlay'
import QuestSheet from './src/components/QuestSheet'
import Toast from './src/components/Toast'
import RootNavigator from './src/navigation/RootNavigator'
import { AppStateProvider } from './src/state/AppState'
import { colors } from './src/theme'

export default function App() {
  const loaded = useAppFonts()
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ink }} />
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
          <RootNavigator />
          <QuestSheet />
          <Toast />
          <ClearOverlay />
        </View>
        <StatusBar style="light" />
      </AppStateProvider>
    </SafeAreaProvider>
  )
}
