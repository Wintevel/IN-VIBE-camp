import { Fragment } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, text } from '../theme'
import { BackpackIcon, CameraIcon, GiftIcon, HeartIcon, LineIcon, LockIcon, PinIcon, PointIcon, TabIcon, XpIcon } from './Icons'

// 안내(튜토리얼·도움말) 그림 조각. 내용은 src/lib/guide.js 에 있습니다.
export function Glyph({ name, size = 18 }) {
  switch (name) {
    case 'camera':
      return <CameraIcon size={size} color={colors.fg} />
    case 'pin':
      return <PinIcon size={size} color={colors.green} />
    case 'lock':
      return <LockIcon size={size * 0.8} color={colors.sub} />
    case 'heart':
      return <HeartIcon size={size} filled color={colors.red} />
    case 'point':
      return <PointIcon size={size} />
    case 'xp':
      return <XpIcon size={size} />
    case 'gift':
      return <GiftIcon size={size} />
    case 'bag':
      return <BackpackIcon size={size} />
    case 'board':
    case 'map':
      return <TabIcon name={name} color={colors.blue} size={size} />
    case 'crew':
      return <TabIcon name="crew" color={colors.purple} size={size} />
    case 'me':
      return <TabIcon name="me" color={colors.blue} size={size} />
    case 'clock':
      return <LineIcon name="clock" size={size} color={colors.tapeText} />
    case 'check':
      return <LineIcon name="check" size={size} color={colors.green} />
    case 'no':
      return <LineIcon name="no" size={size} color={colors.red} />
    case 'edit':
      return <LineIcon name="edit" size={size} color={colors.fg} />
    case 'alert':
      return <Text style={{ fontSize: size, lineHeight: size * 1.15, fontWeight: '900', color: colors.red }}>!</Text>
    default:
      return null
  }
}

// 순서: 동그라미 아이콘 + 이름, 사이에 화살표
export function Flow({ steps }) {
  return (
    <View style={styles.flow} accessibilityLabel={steps.map((s) => s[1]).join(', 그다음 ')}>
      {steps.map(([icon, label], i) => (
        <Fragment key={label}>
          {i > 0 ? <Text style={styles.arrow}>›</Text> : null}
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Glyph name={icon} size={22} />
            </View>
            <Text style={[text.caption, styles.center, { color: colors.fg }]}>{label}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  )
}

// 숫자 칸: 아이콘, 큰 글자, 작은 설명
export function Facts({ facts }) {
  return (
    <View style={styles.facts}>
      {facts.map(([icon, big, small]) => (
        <View key={small} style={[styles.fact, facts.length > 3 && { minWidth: '45%' }]} accessibilityLabel={`${small} ${big}`}>
          <Glyph name={icon} size={18} />
          <Text style={[text.point, { fontSize: 18, lineHeight: 22 }]}>{big}</Text>
          <Text style={[text.caption, styles.center]}>{small}</Text>
        </View>
      ))}
    </View>
  )
}

// 두 가지 비교: 아이콘·이름·설명 두 칸
export function Compare({ items }) {
  return (
    <View style={styles.facts}>
      {items.map(([icon, name, desc]) => (
        <View key={name} style={[styles.fact, { alignItems: 'flex-start', padding: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Glyph name={icon} size={20} />
            <Text style={text.section}>{name}</Text>
          </View>
          <Text style={[text.small, { color: colors.fg }]}>{desc}</Text>
        </View>
      ))}
    </View>
  )
}

// 하지 말 것 / 챙길 것 두 줄
export function DoDont({ no, yes }) {
  const col = (list, ok) => (
    <View style={[styles.fact, { alignItems: 'flex-start', padding: 14, gap: 8, borderColor: ok ? colors.green + '55' : colors.red + '55' }]}>
      <Text style={[text.chip, { color: ok ? colors.green : colors.red }]}>{ok ? '이렇게 해요' : '손대지 않아요'}</Text>
      {list.map((t) => (
        <View key={t} style={styles.row}>
          <LineIcon name={ok ? 'check' : 'x'} size={14} color={ok ? colors.green : colors.red} />
          <Text style={[text.small, { flex: 1, color: colors.fg }]}>{t}</Text>
        </View>
      ))}
    </View>
  )
  return (
    <View style={styles.facts}>
      {col(no, false)}
      {col(yes, true)}
    </View>
  )
}

// 짧은 문장 목록: 글머리 점 대신 뜻이 보이는 아이콘
export function Points({ points, big }) {
  return (
    <View style={{ gap: big ? 12 : 10 }}>
      {points.map(([icon, t]) => (
        <View key={t} style={styles.row}>
          <View style={styles.pointIcon}>
            <Glyph name={icon} size={16} />
          </View>
          <Text style={[big ? text.regular : text.small, { flex: 1, color: colors.fg }]}>{t}</Text>
        </View>
      ))}
    </View>
  )
}

// 한 항목의 그림 부분 전체(있는 것만)
export function GuideVisual({ g }) {
  return (
    <>
      {g.flow ? <Flow steps={g.flow} /> : null}
      {g.facts ? <Facts facts={g.facts} /> : null}
      {g.compare ? <Compare items={g.compare} /> : null}
      {g.dodont ? <DoDont {...g.dodont} /> : null}
    </>
  )
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  flow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  arrow: { width: 14, textAlign: 'center', color: colors.disabled, fontSize: 22, lineHeight: 44 },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.cardSm, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointIcon: { width: 22, alignItems: 'center' },
})
