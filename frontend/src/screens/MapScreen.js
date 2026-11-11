import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/ListRows'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import { refresher } from '../components/States'
import { useApp } from '../state/AppState'
import { colors, text } from '../theme'

const COLOR = { open: colors.tape, in_progress: colors.blue, completed: colors.green }
const LEGEND = [
  ['의뢰 있음', colors.tape],
  ['진행 중', colors.blue],
  ['치운 곳', colors.green],
]

// 동네 지도: 서버에서 받은 주변 의뢰를 위치에 찍습니다. 핀을 누르면 의뢰 시트가 열립니다.
export default function MapScreen() {
  const app = useApp()
  const markers = useMemo(() => app.reports.filter((r) => r.lat && r.lng).map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: COLOR[r.status] || colors.tape })), [app.reports])
  const count = (s) => app.reports.filter((r) => r.status === s).length
  return (
    <Screen refreshControl={refresher(app)}>
      <ScreenHeader title="동네 지도" sub="핀을 누르면 의뢰를 볼 수 있어요" />
      <View style={styles.map}>{app.coords ? <MapView center={app.coords} me={app.located ? app.coords : null} markers={markers} onSelect={app.openSheet} /> : null}</View>
      <View style={styles.legend}>
        {LEGEND.map(([label, color]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <Text style={text.caption}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [count('open'), '열린 의뢰'],
          [count('in_progress'), '진행 중'],
          [count('completed'), '치운 곳'],
        ].map(([num, label]) => (
          <Card key={label} style={{ flex: 1, padding: 12, borderRadius: 14 }}>
            <Text style={text.point}>{num}</Text>
            <Text style={[text.caption, { marginTop: 4 }]}>{label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  map: { aspectRatio: 1 / 1.05, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#15181D' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
})
