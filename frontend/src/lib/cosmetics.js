// 시즌 순위 보상과 크루 상점 품목. 기기 저장소 모드(api/local.js)가 그대로 쓰고, 서버에는 같은 id 로 넣어 달라고 요청했습니다(docs/backend-requests.md 9장).

// 시즌 보상: 시즌이 끝날 때 크루 순위 1·2·3위 크루의 크루원 모두에게 주는 테두리. 살 수 없습니다.
// style 'crest' 는 components/AvatarFrame.js 의 시즌 테두리(날개·왕관·순위 메달). colors = [밝은 면, 본색, 그림자, 보석]
export const SEASON_REWARDS = [
  { id: 'frame-s1-1', kind: 'frame', season: 1, rank: 1, name: 'SEASON 1 · 골목 평정 황금 날개', style: 'crest', colors: ['#FFF6C8', '#FFD43B', '#A86B05', '#F04452'], cost: 0, level: 1 },
  { id: 'frame-s1-2', kind: 'frame', season: 1, rank: 2, name: 'SEASON 1 · 아깝다 은빛 날개', style: 'crest', colors: ['#FFFFFF', '#C9D6E3', '#5E7185', '#7DF9FF'], cost: 0, level: 1 },
  { id: 'frame-s1-3', kind: 'frame', season: 1, rank: 3, name: 'SEASON 1 · 동메달도 메달이다', style: 'crest', colors: ['#FFDCB8', '#E0884A', '#7A3E16', '#3DD68C'], cost: 0, level: 1 },
]
export const seasonRewards = (no) => SEASON_REWARDS.filter((c) => c.season === no)

// 크루 상점: 크루 포인트로 사는 꾸미기. 크루 레벨(crew_level)이 되어야 살 수 있습니다. 전부 치장용이고 능력치는 없습니다.
export const CREW_SHOP = [
  { id: 'crew-name-violet', kind: 'name', name: '단체복 보라', colors: ['#C9A7FF'], crew_cost: 200, crew_level: 1 },
  { id: 'crew-frame-read', kind: 'frame', name: '단톡방 공지 읽음', style: 'neon', colors: ['#A97CFF', '#E3D1FF', '#A97CFF'], crew_cost: 300, crew_level: 1 },
  { id: 'crew-name-lime', kind: 'name', name: '형광 조끼 연두', colors: ['#C6FF3D'], crew_cost: 400, crew_level: 2 },
  { id: 'crew-frame-vest', kind: 'frame', name: '형광 조끼 단체 착용', style: 'spin', colors: ['#C6FF3D', '#3DD68C', '#FFD43B', '#C6FF3D'], crew_cost: 500, crew_level: 2 },
  { id: 'crew-name-dusk', kind: 'name', name: '뒤풀이 노을', colors: ['#FF9F68'], crew_cost: 700, crew_level: 3 },
  { id: 'crew-frame-party', kind: 'frame', name: '회식 장소는 분리수거장', style: 'stars', colors: ['#FF9F68', '#A97CFF', '#FF7EB6', '#FF9F68'], crew_cost: 900, crew_level: 3 },
  { id: 'crew-frame-flag', kind: 'frame', name: '집게 원정대 깃발', style: 'royal', colors: ['#E3D1FF', '#A97CFF', '#6B3FE0', '#A97CFF'], crew_cost: 1500, crew_level: 5 },
  { id: 'crew-name-aurora', kind: 'name', name: '원정대 오로라', colors: ['#7DF9FF'], crew_cost: 1200, crew_level: 5 },
  { id: 'crew-frame-legend', kind: 'frame', name: '우리 크루 전설로 남다', style: 'legend', colors: ['#A97CFF', '#7DF9FF', '#C6FF3D', '#FFD43B', '#FF7EB6', '#A97CFF'], crew_cost: 2500, crew_level: 7 },
].map((c) => ({ ...c, shop: 'crew', cost: 0, level: 1 }))

// 해금 단계(크루 레벨). 크루 상점 화면이 이 순서로 묶어 보여 줍니다.
export const CREW_TIERS = [...new Set(CREW_SHOP.map((c) => c.crew_level))].sort((a, b) => a - b)

// 크루 경험치 1 = 크루 포인트 1. 크루원으로 의뢰를 해결하거나 바로 치우면 쌓입니다.
export const CREW_POINT_RATE = 1
