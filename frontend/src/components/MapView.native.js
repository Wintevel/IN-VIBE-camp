import { useMemo } from 'react'
import { WebView } from 'react-native-webview'
import { buildMapHtml } from './mapHtml'
import { colors } from '../theme'

export default function MapView({ center, me, markers, onSelect }) {
  const html = useMemo(() => buildMapHtml({ center, me, markers }), [center, me, markers])
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: colors.panel2 }}
      onMessage={(e) => {
        try {
          const m = JSON.parse(e.nativeEvent.data)
          if (m.type === 'report') onSelect?.(m.id)
        } catch {}
      }}
    />
  )
}
