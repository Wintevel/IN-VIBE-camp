import { Platform } from 'react-native'

// 디자인 토큰: 소프트 뉴모피즘(2026-11-21 개편).
// 배경과 카드가 같은 색(#E4E9F2)이고, 좌상단 흰 빛과 우하단 그림자(#C2CBD9)만으로 솟거나(양각) 패인(음각) 면을 만듭니다.
// 누를 수 있는 것은 양각, 입력창·진행 바 트랙·눌린 상태는 음각입니다. 집게표 노랑(tape)·파랑은 브랜드 포인트로 남깁니다.
// 이름은 예전 어두운 테마와 같게 두어(ink=바탕, panel=카드, fg=글자 …) 화면 코드가 그대로 따라오게 했습니다.

export const colors = {
  ink: '#E4E9F2', // 바탕(= 카드와 같은 면)
  panel: '#E4E9F2', // 카드(바탕과 같은 색, 그림자로만 구분)
  panel2: '#DCE2EE', // 살짝 패인 면(칩·진행 바 트랙)
  line: '#D3DAE6', // 구분선·격자(아주 옅게)
  fg: '#2D3748', // 본문(슬레이트 잉크)
  sub: '#475569', // 보조 글자(바탕 대비 6.2:1)
  disabled: '#5B6577', // 꺼진 탭·의뢰 번호(4.8:1)
  page: '#E4E9F2',
  hi: '#FFFFFF', // 좌상단 하이라이트
  shade: '#C2CBD9', // 우하단 그림자

  blue: '#3B5BDB', // 촉각 악센트(주 버튼·선택 상태)
  blueText: '#2B45C4', // 바탕 위 파란 글자
  blueWeak: '#D6DEF7',
  onBlue: '#FFFFFF',
  tape: '#FFD43B', // 집게표 노랑(띠·제휴·포인트 면)
  tapeInk: '#2D3748', // 노랑 위 글자
  tapeText: '#7A5200', // 바탕 위 노랑 계열 글자(포인트 숫자 등, 5.7:1)

  green: '#0A7446',
  red: '#C92A3A',
  purple: '#6B3FD4',

  greenSoft: 'rgba(10,116,70,0.12)',
  redSoft: 'rgba(201,42,58,0.10)',
  dim: 'rgba(45,55,72,0.32)',

  // 바텀시트(바탕과 같은 면)
  sheetBg: '#E4E9F2',
  sheetFg: '#2D3748',
  sheetSub: '#475569',
  sheetLine: '#D3DAE6',
  sheetWeak: '#DCE2EE',
  sheetToast: '#2D3748',
}

// 그림자: 모든 요소가 같은 광원(좌상단)을 씁니다. RN 0.76+ 의 boxShadow(웹·안드로이드·iOS 공통, inset 포함)를 씁니다.
const S = colors.shade
const H = colors.hi
export const neu = {
  raised: { boxShadow: `8px 8px 16px ${S}, -8px -8px 16px ${H}` }, // 카드·큰 버튼
  raisedHi: { boxShadow: `10px 10px 20px ${S}, -10px -10px 20px ${H}` }, // 마우스 올림
  raisedSm: { boxShadow: `4px 4px 9px ${S}, -4px -4px 9px ${H}` }, // 칩·작은 버튼
  inset: { boxShadow: `inset 6px 6px 12px ${S}, inset -6px -6px 12px ${H}` }, // 입력창·눌림
  insetSm: { boxShadow: `inset 3px 3px 6px ${S}, inset -3px -3px 6px ${H}` }, // 진행 바 트랙·작은 홈
  flat: { boxShadow: `0px 0px 0px ${S}, 0px 0px 0px ${H}` },
}

export const radius = { sm: 8, md: 14, cardSm: 16, lg: 22, xl: 28, pill: 999 }
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 }

// 네이티브는 App 에서 불러온 ttf 이름을, 웹은 구글 폰트(가벼운 분할 로딩)의 family + weight 를 씁니다.
// 한글은 Noto Sans KR, 숫자·영문은 Outfit(제목·숫자)·Inter(본문)로 그립니다. Black Han Sans 는 로고 글자와 게임 연출(출동!·의뢰 완료)에만 남겼습니다.
const web = Platform.OS === 'web'
const KR = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
const f = (native, family, weight) => (web ? { fontFamily: `${family}, ${KR}`, fontWeight: weight } : { fontFamily: native })
export const font = {
  brand: f('BlackHanSans_400Regular', "'Black Han Sans'", '400'),
  display: f('NotoSansKR_800ExtraBold', "'Outfit'", '800'),
  body: f('NotoSansKR_400Regular', "'Inter'", '400'),
  bodyMedium: f('NotoSansKR_500Medium', "'Inter'", '500'),
  bodyBold: f('NotoSansKR_700Bold', "'Inter'", '700'),
  bodyExtra: f('NotoSansKR_800ExtraBold', "'Outfit'", '800'),
  numeral: f('Outfit_700Bold', "'Outfit'", '700'), // 숫자 전용(한글 없음)
  mono: f('JetBrainsMono_500Medium', "'JetBrains Mono'", '500'),
  monoBold: f('JetBrainsMono_700Bold', "'JetBrains Mono'", '700'),
}

// 텍스트 스타일 (tokens.json 의 textStyle)
export const text = {
  h1: { ...font.display, fontSize: 28, lineHeight: 36, letterSpacing: -0.4, color: colors.fg },
  point: { ...font.numeral, fontSize: 22, lineHeight: 26, color: colors.fg },
  title: { ...font.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: colors.fg },
  num: { ...font.numeral, fontSize: 18, lineHeight: 22, color: colors.fg },
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
