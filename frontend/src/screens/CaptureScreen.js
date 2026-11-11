import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/Button'
import { useApp } from '../state/AppState'
import { colors, radius, text } from '../theme'

// 앱 안 카메라로만 촬영합니다(갤러리 선택 없음). 촬영 순간의 위치·시각을 함께 남기고,
// 서버가 의뢰 위치와의 거리·시각·사진 해시를 검증합니다(docs/api.md 악용 방지 규칙).
export default function CaptureScreen({ navigation, route }) {
  const { kind, questId, slot, title } = route.params
  const app = useApp()
  const insets = useSafeAreaInsets()
  const camera = useRef(null)
  const [camPerm, requestCam] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!camPerm) return <View style={styles.root} />
  if (!camPerm.granted) {
    return (
      <View style={[styles.root, styles.center, { padding: 24 }]}>
        <Text style={[text.sheetTitle, { color: colors.fg, textAlign: 'center' }]}>카메라 권한이 필요해요</Text>
        <Text style={[text.small, { textAlign: 'center', marginVertical: 12 }]}>인증 사진은 앱 카메라로 찍은 것만 쓸 수 있어요.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button type="ghost" onPress={() => navigation.goBack()}>
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
        uri: pic.uri,
        takenAt: new Date().toISOString(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        mocked: !!pos.mocked, // Android 모의 위치 감지(안내용, 서버 검증이 최종)
      }
      if (shot.mocked) throw new Error('모의 위치가 켜져 있으면 인증할 수 없어요.')
      if (kind === 'quest') app.setPhoto(questId, slot, shot)
      else app.setDraftPhoto(shot)
      navigation.goBack()
    } catch (e) {
      setError(e.message || '촬영에 실패했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.chip}>
          <Text style={[text.chip, { color: colors.fg }]}>닫기</Text>
        </Pressable>
        <Text style={[text.button, { color: colors.fg }]}>{title}</Text>
        <View style={{ width: 52 }} />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {error ? <Text style={[text.small, { color: colors.red, textAlign: 'center' }]}>{error}</Text> : null}
        <Pressable onPress={shoot} disabled={busy} accessibilityRole="button" accessibilityLabel="촬영" style={styles.shutter}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  chip: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
})
