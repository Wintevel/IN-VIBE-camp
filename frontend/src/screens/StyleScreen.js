import { StyleSheet, Text, View } from 'react-native'
import AvatarFrame from '../components/AvatarFrame'
import { LineIcon } from '../components/Icons'
import { Card } from '../components/ListRows'
import { Appear, PressScale } from '../components/Motion'
import Screen from '../components/Screen'
import ScreenHeader from '../components/ScreenHeader'
import Toast from '../components/Toast'
import { titleText } from '../lib/achievements'
import { useApp } from '../state/AppState'
import { colors, radius, text, readable } from '../theme'

// 프로필 꾸미기: 위에 지금 모습, 아래에 항목별 칸. 칸을 누르면 고르는 화면으로 갑니다.
// 배치는 "사진·테두리"(정사각 두 칸) → 칭호(긴 칸) → 닉네임 색(이름 미리보기 긴 칸) 순서입니다.
export default function StyleScreen({ navigation }) {
  const app = useApp()
  const p = app.profile || {}
  const letter = (p.nickname || '줍').slice(0, 1)
  const title = titleText(p, app.myCrew)
  const worn = (kind) => app.cosmetics.find((c) => c.kind === kind && c.equipped)
  const frameName = worn('frame')?.name
  const go = (kind) => navigation.navigate('StylePick', { kind })
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenHeader title="프로필 꾸미기" action="닫기" onAction={() => navigation.goBack()} />
        <Card style={styles.preview}>
          <AvatarFrame frame={p.frame} size={76} letter={letter} uri={p.avatar_url} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[text.cardTitle, { fontSize: 20 }, p.name_color && { color: readable(p.name_color) }]}>{p.nickname}</Text>
            {title ? <Text style={[text.chip, { color: colors.tapeText }]}>{title}</Text> : null}
          </View>
        </Card>

        <Appear index={0} from="bottom" style={styles.section}>
          <Text style={text.section}>프로필 사진 및 테두리</Text>
          <View style={styles.pair}>
            <Slot onPress={() => go('photo')} label={`프로필 사진 바꾸기, 지금 ${p.avatar_url ? '내 사진' : '기본'}`}>
              <AvatarFrame frame={{ style: 'plain', colors: [colors.line] }} size={76} letter={letter} uri={p.avatar_url} letterColor={colors.sub} />
            </Slot>
            <Slot onPress={() => go('frame')} label={`테두리 바꾸기, 지금 ${frameName || '기본'}`} caption={frameName ? frameName.replace(/^[^·]+· /, '') : null}>
              {frameName ? <AvatarFrame frame={p.frame} size={76} letter="" /> : <View style={styles.dashed} />}
            </Slot>
          </View>
        </Appear>

        <Appear index={1} from="bottom" style={styles.section}>
          <Text style={text.section}>칭호</Text>
          <Slot wide onPress={() => go('title')} label={`칭호 바꾸기, 지금 ${title || '없음'}`}>
            <Text numberOfLines={1} style={[text.section, { flex: 1, color: title ? colors.tapeText : colors.disabled }]}>
              {title || '없음'}
            </Text>
          </Slot>
        </Appear>

        <Appear index={2} from="bottom" style={styles.section}>
          <Text style={text.section}>닉네임 색</Text>
          <Slot wide onPress={() => go('name')} label={`닉네임 색 바꾸기, 지금 ${worn('name')?.name || '기본'}`}>
            <Text numberOfLines={1} style={[text.cardTitle, { flex: 1, fontSize: 22, lineHeight: 28, color: readable(p.name_color) }]}>
              {p.nickname}
            </Text>
          </Slot>
        </Appear>
      </Screen>
      <Toast />
    </View>
  )
}

// 누르는 칸 하나. 오른쪽 위(긴 칸은 오른쪽 가운데)에 + 표시를 둡니다.
function Slot({ onPress, label, children, wide, caption }) {
  // PressScale 은 style 을 안쪽 면에 주므로, 정사각 칸의 너비는 바깥 View 가 나눠 갖습니다.
  return (
    <View style={wide ? null : { flex: 1 }}>
      <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.slot, wide ? styles.wide : styles.square]}>
        {children}
        {caption ? (
          <Text numberOfLines={1} style={[text.caption, styles.caption]}>
            {caption}
          </Text>
        ) : null}
        <View style={[styles.plus, wide && styles.plusWide]}>
          <LineIcon name="plus" size={16} color={colors.ink} />
        </View>
      </PressScale>
    </View>
  )
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 22, paddingVertical: 18 },
  section: { gap: 10 },
  pair: { flexDirection: 'row', gap: 10 },
  slot: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  square: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  wide: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingLeft: 18, paddingRight: 56 },
  dashed: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.disabled },
  caption: { position: 'absolute', left: 10, right: 10, bottom: 10, textAlign: 'center' },
  plus: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.fg, alignItems: 'center', justifyContent: 'center' },
  plusWide: { top: 18 },
})
