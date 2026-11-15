import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

// 웹(PWA) 설치와 안드로이드 APK 받기 안내. 폰 앱(네이티브)에서는 아무것도 보이지 않습니다.
// 설치 가능 신호(beforeinstallprompt)는 화면이 뜨기 전에 올 수 있어서 모듈이 불릴 때 바로 받아 둡니다.
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined'
const ua = isWeb ? navigator.userAgent || '' : ''
const ios = /iPhone|iPad|iPod/i.test(ua) || (isWeb && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const android = /Android/i.test(ua)

// APK 주소(깃허브 릴리스 등). 빌드 때 EXPO_PUBLIC_APK_URL 로 넣고, 비어 있으면 APK 버튼은 숨깁니다.
export const APK_URL = process.env.EXPO_PUBLIC_APK_URL || ''

let deferred = null
let installed = false
const listeners = new Set()
const emit = () => listeners.forEach((f) => f())

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

// 이미 홈 화면 앱으로 열린 상태인지
const standalone = () => isWeb && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)

export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => {
    const f = () => tick((n) => n + 1)
    listeners.add(f)
    return () => listeners.delete(f)
  }, [])
  const open = isWeb && !installed && !standalone()
  return {
    showInstall: open,
    showApk: open && !!APK_URL && !ios, // 아이폰은 APK 를 못 씀
    ios,
    android,
    // 브라우저가 바로 설치창을 띄울 수 있으면 true, 아니면 메뉴 안내를 보여 줘야 함
    install: async () => {
      if (!deferred) return 'manual'
      const ev = deferred
      deferred = null
      emit()
      ev.prompt()
      const { outcome } = await ev.userChoice
      return outcome
    },
  }
}
