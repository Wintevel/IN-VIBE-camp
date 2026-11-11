# frontend

줍퀘스트 모바일 앱 (React Native + Expo, JavaScript).

```bash
cp .env.example .env     # Supabase URL / anon key 입력
npm install
npx expo start           # 폰의 Expo Go 앱으로 QR 스캔, 또는 a(Android)·i(iOS 시뮬레이터)
```

- 카메라·위치는 실제 폰에서 확인하세요. 웹(`w`)은 지원 대상이 아닙니다.
- 패키지 추가는 `npx expo install <패키지>` 로 합니다.
- Supabase 클라이언트는 `src/lib/supabase.js` 에서 가져다 씁니다.

```js
import { supabase } from './src/lib/supabase'
const { data } = await supabase.from('reports').select('*')
```

## 구조

```
App.js                 폰트 로드 + 상태·내비게이션·의뢰 시트 조립
src/theme/             디자인 토큰(색·글꼴·텍스트 스타일)
src/components/        공통 UI (ReportCard, QuestSheet, BottomSheet, MapView, Toast ...)
src/screens/           화면 (시작, 의뢰판, 지도, 크루, 내 정보, 설정, 제보하기, 촬영)
src/navigation/        시작 여부에 따른 스택 + 하단 탭 4개
src/state/AppState.js  앱 상태. 데이터는 전부 src/api 에서 받음(예시 데이터 없음)
src/api/               index.js 가 구현을 고름: remote.js(Supabase) / local.js(기기 저장소)
```

## 데이터가 저장되는 곳
- `.env` 에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 가 **없으면** 기기 저장소 모드입니다. 제보·수락·인증·레벨이 이 기기 안에서 실제로 동작하지만 다른 사람과 공유되지 않습니다. 하트는 내 제보에도 누를 수 있고 하트 1개당 5점(시안 예시값)이 의뢰 포인트로 붙습니다. 크루는 만들기·가입·탈퇴·랭킹이 되지만 이 기기에서 만든 크루만 보입니다. 서버가 생기면 승격·포인트·크루 순위는 서버가 정합니다.
- 두 값이 **있으면** Supabase 를 씁니다. `remote.js` 는 백엔드 API 가이드(`get_nearby_reports`, `toggle_like`, `accept_report`, `submit_proof` 등)에 맞춰 썼지만 실제 서버로는 아직 확인하지 못했습니다.
- 기기 저장소 모드에는 제휴 의뢰 예시 1건(충주사랑상품권 보상, 금액은 예시값)이 내 위치 근처에 들어 있습니다. 실제 상품권 지급은 연결되어 있지 않습니다.
- 기기 저장소 모드의 규칙: 하루 완료 3개(KST 0시 기준), 인증 사진은 의뢰 위치 100m 안, 수락 후 24시간 안에 인증, 경험치 300마다 1레벨.

## 웹 미리보기와 배포
- PC 브라우저: `npx expo start --web`
- `main` 에 `frontend/` 변경이 합쳐지면 `.github/workflows/deploy-web.yml` 이 웹으로 빌드해 GitHub Pages 에 올립니다. 주소는 `https://wintevel.github.io/IN-VIBE-camp_TeamChjChj_JubQuest/` 입니다. 저장소 Settings > Pages 의 Source 가 "GitHub Actions" 여야 합니다.
- 웹은 미리보기용입니다. 실제 인증(카메라·위치 신뢰도)은 폰 앱 기준입니다.

## 지도
지금은 키 없이 도는 Leaflet + OpenStreetMap 을 WebView(웹은 iframe)에 넣었습니다. 네이버지도(`@mj-studio/react-native-naver-map`)는 EAS 개발 빌드와 키가 필요해 그때 `src/components/MapView.native.js` 만 바꾸면 됩니다.
