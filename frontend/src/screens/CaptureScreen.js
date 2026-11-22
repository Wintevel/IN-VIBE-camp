import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/Button'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 앱 안 카메라로만 촬영합니다(갤러리 선택 없음). 촬영 순간의 위치·시각을 함께 남기고,
// 서버가 의뢰 위치와의 거리·시각·사진 해시를 검증합니다(docs/api.md 악용 방지 규칙).
//
// 확대: 두 손가락으로 벌리거나 아래 1x·2x·3x 를 누릅니다. 폰 앱은 카메라 자체 줌(zoom), 웹은 화면 확대 대신
// 영상을 키워 보여 주고 찍은 사진도 같은 만큼 가운데를 잘라 냅니다. 웹에서 이 화면에 있는 동안은
// 브라우저의 페이지 확대(핀치 줌)를 막아 촬영 버튼이 화면 밖으로 밀려나지 않게 합니다.
const WEB = Platform.OS === 'web'
const MAX = 4 // 웹 디지털 확대 최대 배율
const STEPS = [1, 2, 3]
// 폰 카메라의 zoom 값(0~1, 기기 최대 줌 대비 비율)으로 바꿉니다. 기기마다 최대 줌이 달라 대략 맞춥니다.
const nativeZoom = (f) => Math.min(1, (f - 1) / 10)

// 웹: 이 화면이 열려 있는 동안 페이지 핀치 줌을 막고, 닫으면 원래대로 돌립니다.
function useNoPageZoom() {
  useEffect(() => {
    if (!WEB || typeof document === 'undefined') return
    const meta = document.querySelector('meta[name=viewport]')
    const before = meta?.getAttribute('content')
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no')
    const stop = (e) => e.preventDefault()
    const multi = (e) => e.touches && e.touches.length > 1 && e.preventDefault()
    document.addEventListener('gesturestart', stop, { passive: false }) // iOS 사파리
    document.addEventListener('gesturechange', stop, { passive: false })
    document.addEventListener('touchmove', multi, { passive: false })
    return () => {
      if (meta && before) meta.setAttribute('content', before)
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('gesturechange', stop)
      document.removeEventListener('touchmove', multi)
    }
  }, [])
}

// 웹 디지털 확대: 찍힌 사진의 가운데를 배율만큼 잘라 원래 크기로 되돌립니다.
async function cropCenter(uri, f) {
  if (f <= 1.01) return uri
  const img = new Image()
  await new Promise((ok, no) => {
    img.onload = ok
    img.onerror = no
    img.src = uri
  })
  const w = img.width / f
  const h = img.height / f
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d').drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, img.width, img.height)
  return c.toDataURL('image/jpeg', 0.85)
}

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY)

export default function CaptureScreen({ navigation, route }) {
  const { kind, reportId, slot, title } = route.params
  const app = useApp()
  const insets = useSafeAreaInsets()
  const camera = useRef(null)
  const [camPerm, requestCam] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [factor, setFactor] = useState(1)
  const pinch = useRef(null)
  useNoPageZoom()
  const clamp = (f) => Math.max(1, Math.min(MAX, f))
  const touch = {
    onTouchStart: (e) => {
      const t = e.nativeEvent.touches
      if (t && t.length === 2) pinch.current = { d: dist(t), f: factor }
    },
    onTouchMove: (e) => {
      const t = e.nativeEvent.touches
      if (!pinch.current || !t || t.length !== 2) return
      setFactor(clamp(pinch.current.f * (dist(t) / pinch.current.d)))
    },
    onTouchEnd: () => {
      pinch.current = null
    },
  }
  const close = () => {
    navigation.goBack()
  }

  if (!camPerm) return <View style={styles.root} />
  if (!camPerm.granted) {
    return (
      <View style={[styles.root, styles.center, { padding: 24 }]}>
        <Text style={[text.sheetTitle, { color: colors.fg, textAlign: 'center' }]}>카메라 권한이 필요해요</Text>
        <Text style={[text.small, { textAlign: 'center', marginVertical: 12 }]}>인증 사진은 앱 카메라로 찍은 것만 쓸 수 있어요.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button type="ghost" onPress={close}>
            닫기
          </Button>
          <Button onPress={requestCam}>권한 허용</Button>
        </View>
      </View>
    )
  }

  const shoot = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (perm.status !== 'granted') throw new Error('위치 권한이 필요해요. 의뢰 장소 근처인지 확인해야 해요.')
      const [pic, pos] = await Promise.all([camera.current.takePictureAsync({ quality: 0.7 }), Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })])
      const shot = {
        uri: WEB ? await cropCenter(pic.uri, factor) : pic.uri,
        takenAt: new Date().toISOString(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        mocked: !!pos.mocked, // Android 모의 위치 감지(안내용, 서버 검증이 최종)
      }
      if (shot.mocked) throw new Error('모의 위치가 켜져 있으면 인증할 수 없어요.')
      if (kind === 'quest') app.setPhoto(reportId, slot, shot)
      else if (kind === 'quick') app.setQuickPhoto(slot, shot)
      else app.setDraftPhoto(shot)
      close()
    } catch (e) {
      setError(e.message || '촬영에 실패했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} {...touch}>
        <View style={[StyleSheet.absoluteFill, WEB && { transform: [{ scale: factor }] }]}>
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" zoom={WEB ? 0 : nativeZoom(factor)} />
        </View>
      </View>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={close} accessibilityRole="button" style={styles.chip}>
          <Text style={[text.chip, { color: colors.fg }]}>닫기</Text>
        </Pressable>
        <Text style={[text.button, { color: colors.fg }]}>{title}</Text>
        <View style={{ width: 52 }} />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[text.chip, styles.warn]}>사람 얼굴과 차 번호판이 찍히지 않게 해 주세요</Text>
        {error ? <Text style={[text.small, { color: colors.red, textAlign: 'center' }]}>{error}</Text> : null}
        <View style={styles.zooms} accessibilityRole="radiogroup" accessibilityLabel="확대">
          {STEPS.map((f) => {
            const on = Math.abs(factor - f) < 0.25
            return (
              <Pressable key={f} onPress={() => setFactor(f)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${f}배 확대`} style={[styles.zoom, on && styles.zoomOn]}>
                <Text style={[text.chip, { color: on ? colors.tape : '#fff' }]}>{on ? `${factor.toFixed(1)}x` : `${f}x`}</Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable onPress={shoot} disabled={busy} accessibilityRole="button" accessibilityLabel="촬영" style={styles.shutter}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  clip: { overflow: 'hidden', ...(WEB ? { touchAction: 'none' } : null) },
  zooms: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  zoom: { minWidth: 44, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  zoomOn: { backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  chip: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  warn: { color: '#fff', backgroundColor: 'rgba(240,68,82,0.92)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, overflow: 'hidden', textAlign: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
})
