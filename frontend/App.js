import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>줍퀘스트</Text>
      <Text style={styles.sub}>프론트엔드 개발 시작점입니다.</Text>
      <StatusBar style="light" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111317', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2F4F6', fontSize: 28, fontWeight: '700' },
  sub: { color: '#8B95A1', marginTop: 8 },
})
