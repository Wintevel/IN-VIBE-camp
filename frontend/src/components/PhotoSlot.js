import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { CameraIcon } from './Icons'

// 인증 사진 한 칸. 누르면 앱 카메라로 갑니다.
export default function PhotoSlot({ n, shot, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shot ? `${label} 다시 찍기` : `${label} 찍기`} style={[styles.slot, shot && styles.done]}>
      {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <CameraIcon size={30} color={colors.blue} />}
      <View style={[styles.tag, shot && { backgroundColor: colors.blue }]}>
        <Text style={[text.chip, { color: shot ? colors.onBlue : colors.fg }]}>{[n, label, shot ? '다시 찍기' : '찍기'].filter(Boolean).join(' ')}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  slot: { flex: 1, aspectRatio: 3 / 4, maxHeight: 260, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.blue, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  done: { borderStyle: 'solid' },
  tag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(17,19,23,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
})
