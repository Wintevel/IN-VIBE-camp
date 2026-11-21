import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

// 웹(데스크톱)에서 가로 ScrollView 를 마우스 휠과 끌기로 넘길 수 있게 합니다. 폰 터치는 원래 됩니다.
// 끌어서 넘긴 직후의 클릭은 막아, 넘기다가 칩이 눌리지 않게 합니다.
export default function useDragScroll() {
  const ref = useRef(null)
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined
    const el = ref.current?.getScrollableNode?.() || ref.current
    if (!el || !el.addEventListener) return undefined
    let down = null
    let dragged = false
    const wheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY))
      if (max <= 0 || next === el.scrollLeft) return
      e.preventDefault()
      el.scrollLeft = next
    }
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      down = { x: e.clientX, left: el.scrollLeft }
      dragged = false
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - down.x
      if (!dragged && Math.abs(dx) < 5) return
      dragged = true
      el.scrollLeft = down.left - dx
      el.style.userSelect = 'none'
    }
    const onUp = () => {
      down = null
      el.style.userSelect = ''
    }
    const stop = (e) => {
      if (!dragged) return
      e.stopPropagation()
      e.preventDefault()
      dragged = false
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('click', stop, true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, true)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('click', stop, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp, true)
    }
  }, [])
  return ref
}
