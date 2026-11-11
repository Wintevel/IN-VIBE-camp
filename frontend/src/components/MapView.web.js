import { useEffect, useMemo } from 'react'
import { buildMapHtml } from './mapHtml'

export default function MapView({ center, me, markers, onSelect }) {
  const html = useMemo(() => buildMapHtml({ center, me, markers }), [center, me, markers])
  useEffect(() => {
    const on = (e) => {
      try {
        const m = typeof e.data === 'string' ? JSON.parse(e.data) : null
        if (m && m.type === 'report') onSelect?.(m.id)
      } catch {}
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [onSelect])
  return <iframe title="동네 지도" srcDoc={html} style={{ border: 0, width: '100%', height: '100%', display: 'block' }} />
}
