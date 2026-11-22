import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { refresher } from '../components/States'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

// 동네 지도: 아직 안 끝난 주변 의뢰만 찍습니다(노랑 = 열림, 파랑 = 진행 중). 핀을 누르면 의뢰 시트가 열립니다.
// 끝난 의뢰·바로 치운 곳은 찍지 않습니다(2026-11-23 결정).
const KINDS = [
  ['open', '의뢰', colors.tape],
  ['in_progress', '진행 중', colors.blue],
]

export default function MapScreen() {
  const app = useApp()
  const live = useMemo(() => app.reports.filter((r) => r.lat && r.lng && (r.status === 'open' || r.status === 'in_progress')), [app.reports])
  const markers = useMemo(() => live.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: r.status === 'in_progress' ? colors.blue : colors.tape })), [live])
  return (
    <Screen refreshControl={refresher(app)}>
      <ScreenHeader title="동네 지도" />
      <View style={styles.legend}>
        {KINDS.map(([k, label, color]) => (
          <View key={k} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={text.small}>
              {label} <Text style={{ color: colors.fg }}>{live.filter((r) => r.status === k).length}</Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.map}>{app.coords ? <MapView center={app.coords} me={app.located ? app.coords : null} markers={markers} onSelect={app.openSheet} /> : null}</View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginTop: -6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  map: { aspectRatio: 1 / 1.55, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
})
