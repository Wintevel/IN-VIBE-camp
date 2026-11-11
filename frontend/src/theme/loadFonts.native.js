import { useFonts } from 'expo-font'
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans'
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium'
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold'
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular'
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium'
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold'
import { NotoSansKR_800ExtraBold } from '@expo-google-fonts/noto-sans-kr/800ExtraBold'

export function useAppFonts() {
  const [loaded] = useFonts({ BlackHanSans_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold, NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_800ExtraBold })
  return loaded
}
