import { registerRootComponent } from 'expo'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { loadThemeMode } from './src/lib/themeMode'
import { colors } from './src/theme'

// 저장된 화면 모드(다크·라이트)를 먼저 적용한 뒤 App 을 불러옵니다.
// 화면 모듈의 StyleSheet 가 불러올 때 색을 잡기 때문에 App 은 require 로 늦게 불러옵니다.
function Boot() {
  const [App, setApp] = useState(null)
  useEffect(() => {
    loadThemeMode().finally(() => setApp(() => require('./App').default))
  }, [])
  if (!App) return <View style={{ flex: 1, backgroundColor: colors.page }} />
  return <App />
}

registerRootComponent(Boot)
