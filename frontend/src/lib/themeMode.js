import AsyncStorage from '@react-native-async-storage/async-storage'
import { DevSettings, Platform } from 'react-native'
import { applyTheme, theme, THEME_KEY } from '../theme'

// 화면 모드 저장·불러오기. 색은 화면 모듈을 불러올 때 정해지므로 바꾸면 앱을 다시 불러옵니다.
export async function loadThemeMode() {
  if (Platform.OS === 'web') return theme.mode
  try {
    applyTheme((await AsyncStorage.getItem(THEME_KEY)) || 'dark')
  } catch {
    applyTheme('dark')
  }
  return theme.mode
}

// 다시 불러오지 못하면 false 를 돌려줍니다(앱을 껐다 켜면 적용).
export async function saveThemeMode(mode) {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(THEME_KEY, mode)
      window.location.reload()
      return true
    } catch {
      return false
    }
  }
  await AsyncStorage.setItem(THEME_KEY, mode).catch(() => {})
  try {
    if (__DEV__ && DevSettings?.reload) {
      DevSettings.reload()
      return true
    }
  } catch {}
  return false
}
