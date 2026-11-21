import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, neu, text } from '../theme'
import { ND, reduced, SHADOW_EASE } from './Motion'

// 아래 탭바(뉴모피즘 촉감). 살짝 솟은 판 위에서, 고른 탭 자리만 안으로 패인 홈이 탭을 따라 스프링으로 미끄러집니다.
// 고른 탭은 흰 글자, 나머지는 보조 글자색입니다.
const PAD = 6

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets()
  const [w, setW] = useState(0)
  const n = state.routes.length
  const x = useRef(new Animated.Value(state.index)).current
  useEffect(() => {
    if (reduced()) return x.setValue(state.index)
    Animated.spring(x, { toValue: state.index, speed: 14, bounciness: 7, useNativeDriver: ND }).start()
  }, [state.index, x])
  const itemW = w > 0 ? (w - PAD * 2) / n : 0

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {itemW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pit, { width: itemW - 8, transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [PAD + 4, PAD + 4 + itemW * Math.max(1, n - 1)] }) }] }]}
          />
        ) : null}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key]
          const focused = state.index === i
          const color = focused ? colors.fg : colors.sub
          const label = options.title ?? route.name
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params)
          }
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={styles.item}>
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              <Text style={[text.tab, { color }, SHADOW_EASE]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.ink, paddingHorizontal: 14, paddingTop: 8 },
  bar: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: PAD, ...neu.raised },
  pit: { position: 'absolute', top: PAD, bottom: PAD, left: 0, borderRadius: 18, backgroundColor: colors.ink, ...neu.inset },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8 },
})
