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

// 폰트 이름은 App.js 에서 useFonts 로 불러오는 이름과 같아야 합니다.
export const fonts = {
  display: 'BlackHanSans_400Regular',
  body: 'NotoSansKR_400Regular',
  bodyMedium: 'NotoSansKR_500Medium',
  bodyBold: 'NotoSansKR_700Bold',
  bodyExtra: 'NotoSansKR_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
}

// 텍스트 스타일 (tokens.json 의 textStyle)
export const text = {
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.5, color: colors.fg },
  point: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: colors.fg },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.fg },
  num: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.fg },
  sheetTitle: { fontFamily: fonts.bodyExtra, fontSize: 22, lineHeight: 30, color: colors.sheetFg },
  cardTitle: { fontFamily: fonts.bodyExtra, fontSize: 17, lineHeight: 23, color: colors.fg },
  section: { fontFamily: fonts.bodyExtra, fontSize: 15, lineHeight: 21, color: colors.fg },
  regular: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.fg },
  button: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  chip: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20, color: colors.sub },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17, color: colors.sub },
  tab: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 13 },
  ticker: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 0.3 },
  stamp: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.6 },
  code: { fontFamily: fonts.mono, fontSize: 10 },
  monoPoint: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.fg },
}
