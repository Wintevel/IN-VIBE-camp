import { useFonts } from 'expo-font'
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans'
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium'
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold'
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular'
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium'
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold'
import { NotoSansKR_800ExtraBold } from '@expo-google-fonts/noto-sans-kr/800ExtraBold'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from './src/components/Toast'
import RootNavigator from './src/navigation/RootNavigator'
import { AppStateProvider } from './src/state/AppState'
import { colors } from './src/theme'

export default function App() {
  const [loaded] = useFonts({
    BlackHanSans_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
    NotoSansKR_800ExtraBold,
  })
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ink }} />
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
          <RootNavigator />
          <Toast />
        </View>
        <StatusBar style="light" />
      </AppStateProvider>
    </SafeAreaProvider>
  )
}
