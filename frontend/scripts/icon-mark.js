// 집게표 아이콘 그림(112×112 기준). Logo.js 와 make-icons.js 가 같은 모양을 씁니다.
// 집게: 위가 둥글게 이어진 두 팔이 아래로 모이고, 끝에 안쪽으로 굽은 집게발과 미끄럼 방지 홈이 있습니다.
// 점: 캔 뚜껑(테두리, 따개 고리, 마시는 구멍).
const mark = ({ main = '#FFD43B', shade = '#C99700', cut = '#3182F6', hole = '#191F28' } = {}) => `
  <path d="M49.5 64 L41 31 Q41 12 56 12 Q71 12 71 31 L62.5 64" stroke="${main}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M49.5 64 L54.5 72 M62.5 64 L57.5 72" stroke="${main}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
  <path d="M43.5 48 L51.5 46 M44.8 54 L52.8 52 M68.5 48 L60.5 46 M67.2 54 L59.2 52" stroke="${cut}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <circle cx="56" cy="14.5" r="2.4" fill="${shade}"/>
  <circle cx="56" cy="92" r="11.5" fill="${main}"/>
  <circle cx="56" cy="92" r="8.6" stroke="${shade}" stroke-width="1.4" fill="none"/>
  <ellipse cx="56" cy="96.6" rx="3.9" ry="2.4" fill="${hole}"/>
  <rect x="52.6" y="85" width="6.8" height="8.4" rx="3.4" stroke="${shade}" stroke-width="1.8" fill="${main}"/>
  <circle cx="56" cy="91.4" r="1.2" fill="${shade}"/>`
module.exports = { mark }
