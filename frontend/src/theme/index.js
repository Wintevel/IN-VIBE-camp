import { Platform } from 'react-native'

// 디자인 토큰: /mnt/project-files/jupquest/figma/tokens.json 과 같은 값입니다.
// 바텀시트는 피그마 2차 수정에 따라 어두운 면을 씁니다.

export const colors = {
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
  tape: '#FFD43B', // 제휴·띠
  tapeInk: '#191F28',

  green: '#3DD68C',
  red: '#F04452',
  purple: '#A97CFF',

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

export const radius = { sm: 6, md: 12, cardSm: 14, lg: 16, xl: 24, pill: 999 }
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 }

// 네이티브는 App 에서 불러온 ttf 이름을, 웹은 구글 폰트(가벼운 분할 로딩)의 family + weight 를 씁니다.
const web = Platform.OS === 'web'
const f = (native, family, weight) => (web ? { fontFamily: family, fontWeight: weight } : { fontFamily: native })
export const font = {
  display: f('BlackHanSans_400Regular', 'Black Han Sans', '400'),
  body: f('NotoSansKR_400Regular', 'Noto Sans KR', '400'),
  bodyMedium: f('NotoSansKR_500Medium', 'Noto Sans KR', '500'),
  bodyBold: f('NotoSansKR_700Bold', 'Noto Sans KR', '700'),
  bodyExtra: f('NotoSansKR_800ExtraBold', 'Noto Sans KR', '800'),
  mono: f('JetBrainsMono_500Medium', 'JetBrains Mono', '500'),
  monoBold: f('JetBrainsMono_700Bold', 'JetBrains Mono', '700'),
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
  ticker: { ...font.monoBold, fontSize: 12, letterSpacing: 0.3 },
  stamp: { ...font.monoBold, fontSize: 11, letterSpacing: 0.6 },
  code: { ...font.mono, fontSize: 10 },
  monoPoint: { ...font.monoBold, fontSize: 15, color: colors.fg },
}
