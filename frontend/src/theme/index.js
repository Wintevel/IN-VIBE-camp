import { Appearance, Platform } from 'react-native'

// 디자인 토큰: /mnt/project-files/jupquest/figma/tokens.json 과 같은 값입니다.
// 바텀시트는 피그마 2차 수정에 따라 어두운 면을 씁니다.

// 화면 모드(2026-11-23): 다크(기본)·라이트·시스템. 같은 이름의 색을 두 벌 두고,
// 앱이 화면 모듈을 불러오기 전에 applyTheme 으로 한 벌을 골라 넣습니다(StyleSheet 가 불러올 때 색을 잡기 때문).
// 그래서 모드를 바꾸면 앱을 다시 불러옵니다.
const DARK_COLORS = {
  ink: '#111317', // 게시판 바탕
  panel: '#1B1E24', // 카드
  panel2: '#252932', // 칩·진행 바 바탕
  line: '#2F343E', // 테두리·격자
  fg: '#F2F4F6', // 본문
  sub: '#8B95A1', // 보조 글자
  disabled: '#4E5968', // 꺼진 탭·의뢰 번호
  page: '#0A0B0D',

  blue: '#3182F6',
  blueWeak: '#1B2A44',
  onBlue: '#FFFFFF',
  tape: '#FFD43B', // 제휴·띠(면)
  tapeText: '#FFD43B', // 노랑을 글자·선으로 쓸 때
  tapeInk: '#191F28',

  green: '#3DD68C',
  red: '#F04452',
  purple: '#A97CFF',
  mint: '#5CE1C8', // 크루 포인트

  greenSoft: 'rgba(61,214,140,0.16)',
  redSoft: 'rgba(240,68,82,0.16)',
  dim: 'rgba(0,0,0,0.55)',

  // 바텀시트(어두운 면)
  sheetBg: '#1B1E24',
  sheetFg: '#F2F4F6',
  sheetSub: '#8B95A1',
  sheetLine: '#2F343E',
  sheetWeak: '#252932',
  sheetToast: '#333D4B',
}

const LIGHT_COLORS = {
  ...DARK_COLORS,
  ink: '#F2F4F6',
  panel: '#FFFFFF',
  panel2: '#EAEDF1',
  line: '#DFE3E8',
  fg: '#191F28',
  sub: '#6B7684',
  disabled: '#B0B8C1',
  page: '#E5E8EB',
  blueWeak: '#E8F3FF',
  tapeText: '#B7791F',
  green: '#0FA968',
  red: '#E5303F',
  purple: '#7B4DFF',
  mint: '#0BA591',
  greenSoft: 'rgba(15,169,104,0.12)',
  redSoft: 'rgba(229,48,63,0.10)',
  dim: 'rgba(0,0,0,0.4)',
  sheetBg: '#FFFFFF',
  sheetFg: '#191F28',
  sheetSub: '#6B7684',
  sheetLine: '#E5E8EB',
  sheetWeak: '#F2F4F6',
}

export const colors = { ...DARK_COLORS }

export const THEME_KEY = 'jipgepyo:theme'
export const theme = { mode: 'dark', scheme: 'dark' }

// 뉴모피즘 촉감(2026-11-21): 화면 전체가 아니라 누르는 곳에만 약하게 씁니다.
// 버튼·탭바·필터 칩·하트 칩·레벨 다이얼은 위로 살짝 솟은 면(raised), 누르거나 고른 상태는 안으로 패인 면(inset)입니다.
// 카드·목록·입력창은 원래 어두운 의뢰판 스타일(면 + 얇은 테두리) 그대로입니다. 그림자는 어느 면 색에서도 맞도록 반투명 검정·흰색을 씁니다.
// 라이트 모드는 뉴모피즘 없이 옅은 그림자만 씁니다.
const DARK = 'rgba(0,0,0,0.5)'
const LIGHT = 'rgba(255,255,255,0.05)'
const NEU_DARK = {
  raised: { boxShadow: `4px 4px 10px ${DARK}, -3px -3px 8px ${LIGHT}` },
  raisedHi: { boxShadow: `6px 6px 14px ${DARK}, -4px -4px 10px ${LIGHT}` },
  raisedSm: { boxShadow: `2px 2px 6px ${DARK}, -2px -2px 5px ${LIGHT}` },
  inset: { boxShadow: `inset 3px 3px 7px ${DARK}, inset -2px -2px 6px ${LIGHT}` },
  insetSm: { boxShadow: `inset 2px 2px 4px ${DARK}, inset -1px -1px 3px ${LIGHT}` },
}
const NEU_LIGHT = {
  raised: { boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)' },
  raisedHi: { boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.08)' },
  raisedSm: { boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.05)' },
  inset: { boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.10)' },
  insetSm: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)' },
}
export const neu = { ...NEU_DARK }

export const radius = { sm: 6, md: 12, cardSm: 14, lg: 16, xl: 24, pill: 999 }
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 }

// 네이티브는 App 에서 불러온 ttf 이름을, 웹은 구글 폰트(가벼운 분할 로딩)의 family + weight 를 씁니다.
const web = Platform.OS === 'web'
const f = (native, family, weight) => (web ? { fontFamily: `${family}, "'Noto Sans KR'", 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif`, fontWeight: weight } : { fontFamily: native })
export const font = {
  display: f('BlackHanSans_400Regular', "'Black Han Sans'", '400'),
  body: f('NotoSansKR_400Regular', "'Noto Sans KR'", '400'),
  bodyMedium: f('NotoSansKR_500Medium', "'Noto Sans KR'", '500'),
  bodyBold: f('NotoSansKR_700Bold', "'Noto Sans KR'", '700'),
  bodyExtra: f('NotoSansKR_800ExtraBold', "'Noto Sans KR'", '800'),
  mono: f('JetBrainsMono_500Medium', "'JetBrains Mono'", '500'),
  monoBold: f('JetBrainsMono_700Bold', "'JetBrains Mono'", '700'),
}

// 텍스트 스타일 (tokens.json 의 textStyle)
export const text = {
  h1: { ...font.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.5, color: colors.fg },
  point: { ...font.display, fontSize: 22, lineHeight: 24, color: colors.fg },
  title: { ...font.display, fontSize: 20, lineHeight: 24, color: colors.fg },
  num: { ...font.display, fontSize: 18, lineHeight: 22, color: colors.fg },
  sheetTitle: { ...font.bodyExtra, fontSize: 22, lineHeight: 30, color: colors.sheetFg },
  cardTitle: { ...font.bodyExtra, fontSize: 17, lineHeight: 23, color: colors.fg },
  section: { ...font.bodyExtra, fontSize: 15, lineHeight: 21, color: colors.fg },
  regular: { ...font.body, fontSize: 15, lineHeight: 24, color: colors.fg },
  button: { ...font.bodyBold, fontSize: 16, lineHeight: 20 },
  chip: { ...font.bodyBold, fontSize: 13, lineHeight: 16 },
  small: { ...font.bodyMedium, fontSize: 13, lineHeight: 20, color: colors.sub },
  caption: { ...font.bodyMedium, fontSize: 12, lineHeight: 17, color: colors.sub },
  tab: { ...font.bodyBold, fontSize: 11, lineHeight: 13 },
  ticker: { ...font.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  stamp: { ...font.bodyBold, fontSize: 11, lineHeight: 15, letterSpacing: 0.3 },
  code: { ...font.mono, fontSize: 10 },
  monoPoint: { ...font.monoBold, fontSize: 15, color: colors.fg },
}

const TEXT_COLOR = { h1: 'fg', point: 'fg', title: 'fg', num: 'fg', sheetTitle: 'sheetFg', cardTitle: 'fg', section: 'fg', regular: 'fg', small: 'sub', caption: 'sub', monoPoint: 'fg' }

// mode: 'dark' | 'light' | 'system'
export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode
  if (mode === 'system') return Appearance.getColorScheme?.() === 'light' ? 'light' : 'dark'
  return 'dark'
}

export function applyTheme(mode) {
  const m = mode === 'light' || mode === 'system' ? mode : 'dark'
  const scheme = resolveTheme(m)
  theme.mode = m
  theme.scheme = scheme
  Object.assign(colors, scheme === 'light' ? LIGHT_COLORS : DARK_COLORS)
  Object.assign(neu, scheme === 'light' ? NEU_LIGHT : NEU_DARK)
  for (const [k, c] of Object.entries(TEXT_COLOR)) text[k] = { ...text[k], color: colors[c] }
}

// 웹은 저장값을 바로 읽을 수 있어 여기서 적용합니다. 네이티브는 index.js 가 불러온 뒤 적용합니다.
if (web) {
  let saved = null
  try {
    saved = window.localStorage.getItem(THEME_KEY)
  } catch {}
  applyTheme(saved || 'dark')
}

// 닉네임 색처럼 어두운 바탕에 맞춘 밝은 색을 글자로 쓸 때: 라이트 모드에서는 같은 색 계열로 어둡게 맞춥니다.
// 기본(흰색에 가까운) 색은 본문 색으로 바꿉니다.
export function readable(hex) {
  if (!hex) return colors.fg
  if (theme.scheme !== 'light' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const lum = () => {
    const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
  }
  if (Math.max(r, g, b) - Math.min(r, g, b) < 24 && lum() > 0.6) return colors.fg
  for (let i = 0; i < 20 && lum() > 0.18; i++) [r, g, b] = [r, g, b].map((v) => Math.round(v * 0.88))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
