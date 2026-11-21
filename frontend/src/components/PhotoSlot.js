import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, neu, radius, text } from '../theme'
import { CameraIcon } from './Icons'

// 인증 사진 한 칸. 누르면 앱 카메라로 갑니다.
export default function PhotoSlot({ n, shot, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shot ? `${label} 다시 찍기` : `${label} 찍기`} style={[styles.slot, shot && styles.done]}>
      {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
        <View style={styles.cam}>
          <CameraIcon size={28} color={colors.blue} />
        </View>
      )}
      <View style={[styles.tag, shot && { backgroundColor: colors.blue }]}>
        <Text style={[text.chip, { color: colors.onBlue }]}>{[n, label, shot ? '다시 찍기' : '찍기'].filter(Boolean).join(' ')}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // 빈 칸은 패인 홈(음각) 가운데에 솟은 카메라 단추, 찍은 뒤에는 사진이 채웁니다.
  slot: { flex: 1, aspectRatio: 3 / 4, maxHeight: 260, borderRadius: radius.lg, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...neu.inset },
  done: { ...neu.raised },
  cam: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, ...neu.raised },
  tag: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(45,55,72,0.82)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
})
