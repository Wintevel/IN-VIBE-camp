// 목 데이터: 시안(jupquest.html)의 예시값입니다. 백엔드 연결 시 src/api/ 가 이 자리를 대체합니다.

export const AREA = { name: '인천 미추홀구 용현동', radiusLabel: '반경 1.5km' }
export const DAILY_LIMIT = 3 // 하루 달성 상한(안내용). 최종 판정은 서버.

export const TICKER = '오늘 이 동네 의뢰 12건 · 완료 7건 · 꽁초 1,284개 수거'

// kind: partner(제휴 의뢰) | crew(크루 의뢰)
export const QUESTS = [
  { id: 'Q-0412', kind: 'partner', title: '인하대 후문 골목 담배꽁초 수거', org: '미추홀구청 청소행정과', dist: '320m', near: true, time: '약 20분', point: 120, reward: '에코포인트 120 + 크루 점수', hot: true, desc: '후문 편의점부터 버스정류장까지 약 150m 구간이에요. 주민 제보가 이번 주 9건 들어왔어요.', goal: '꽁초 200개 이상', tools: '집게·봉투는 정류장 옆 수거함에 있어요' },
  { id: 'Q-0408', kind: 'partner', title: '용현동 공원 산책로 줍깅', org: '아웃도어 브랜드 제휴', dist: '1.1km', time: '약 40분', point: 200, reward: '클린팩 1개 + 200점', desc: '공원 한 바퀴(1.2km)를 걸으며 쓰레기를 주워요. 완료하면 제휴 매장에서 클린팩을 받을 수 있어요.', goal: '산책로 1바퀴', tools: '개인 장갑 권장' },
  { id: 'Q-0402', kind: 'crew', title: '토요일 오전 크루 합동 줍깅', org: '인하런앤줍', dist: '450m', near: true, time: '토 09:00 · 1시간', point: 300, reward: '크루 점수 2배', desc: '크루원 4명 이상 모이면 점수가 2배가 돼요. 지금 3명 참여 예정이에요.', goal: '4명 이상 함께', tools: '모임 장소: 인하대 정문' },
  { id: 'Q-0399', kind: 'partner', title: '제물포역 앞 전단 수거', org: '지역 상점가 제휴', dist: '1.3km', time: '약 25분', point: 150, reward: '상점가 음료 쿠폰 + 150점', desc: '역 앞 계단과 난간에 붙은 전단을 떼어 수거해요.', goal: '계단 2곳', tools: '목장갑 권장', clearedAtStart: true },
]

// 주민 제보. 승격 여부·기준은 앱에 드러내지 않고, 라벨은 "주민 제보"만 씁니다.
// 포인트는 서버가 하트 수에 따라 자동으로 올립니다(시안 예시: 하트 1개당 5점).
export const REPORTS = [
  { id: 'R-0215', title: '주안역 3번 출구 화단 정리', author: '이웃주민', dist: '1.4km', time: '약 15분', hearts: 12, point: 60, desc: '화단 사이에 컵과 전단이 쌓여 있다는 제보예요.' },
  { id: 'R-0213', title: '인하대 후문 빗물받이 꽁초', author: '용현동주민', dist: '280m', near: true, time: '약 10분', hearts: 19, point: 95, desc: '비 오면 물이 안 빠져요. 빗물받이 틈에 꽁초가 가득해요.' },
  { id: 'R-0209', title: '학익동 버스정류장 뒤 쓰레기', author: '아침산책', dist: '2.0km', time: '약 20분', hearts: 4, point: 20, desc: '정류장 뒤편 공터에 봉지째 버려진 쓰레기가 있어요.' },
]

export const CREWS = [
  { name: '초록발자국', meta: '남구 · 12명', score: 2140 },
  { name: '인하런앤줍', meta: '용현동 · 5명', score: 1830, mine: true },
  { name: '주안클린워커', meta: '주안동 · 8명', score: 1610 },
  { name: '학익동 아침산책', meta: '학익동 · 6명', score: 1220 },
  { name: '미추홀 줍줍단', meta: '숭의동 · 9명', score: 980 },
]

export const SEASON = { title: '시즌 종료까지 20일', note: '1위 크루는 제휴사 클린팩 20개와 시즌 배지를 받아요', label: 'SEASON 11', period: '미추홀구 · 11월 시즌' }

export const MY_CREW = {
  name: '인하런앤줍',
  stats: [
    ['이번 주 함께 치운 시간', '9시간 40분'],
    ['1위까지 남은 점수', '310점'],
    ['오늘 활동한 크루원', '5명 중 3명'],
  ],
}

export const ME = {
  nickname: '재준',
  initial: '줍',
  joinedDays: 47,
  levelLabel: '동네 정화러',
  level: 7,
  levelProgress: 0.64,
  nextLevelPoints: 180,
  totalPoints: 1320,
  badges: [
    { name: '첫줍', desc: '첫 의뢰', on: true },
    { name: '10K', desc: '꽁초 1만 개', on: true },
    { name: '새벽', desc: '오전 7시 전', on: true },
    { name: '???', desc: '비 오는 날', on: false },
  ],
  records: [
    ['완료한 의뢰', '23건'],
    ['주운 쓰레기', '약 41kg'],
    ['함께 걸은 거리', '68.2km'],
  ],
}

export const MAP_STATS = [
  ['38%', '우리 동네 정화율'],
  ['14', '우리 크루 구역'],
  ['6', '새 제보'],
]

export const REPORT_CATEGORIES = ['빗물받이', '버스정류장', '공원', '골목·거리', '기타']

export const CREWS_TO_JOIN = [
  { name: '초록발자국', meta: '남구 · 12명 · 이번 시즌 1위' },
  { name: '주안클린워커', meta: '주안동 · 8명' },
  { name: '학익동 아침산책', meta: '학익동 · 6명' },
]
