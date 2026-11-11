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
App.js                 폰트 로드 + 상태·내비게이션 조립
src/theme/             디자인 토큰(색·글꼴·텍스트 스타일). tokens.json 과 같은 값
src/components/        공통 UI (Stamp, QuestCard, ReportCard, BottomSheet, Toast ...)
src/screens/           화면 (로그인, 의뢰판+의뢰 시트, 지도, 크루, 내 정보, 설정, 제보하기, 촬영, 크루 가입/의뢰)
src/navigation/        로그인 여부에 따른 스택 + 하단 탭 4개
src/state/AppState.js  앱 상태(목 데이터 기반, 안내용 하루 상한 표시 포함)
src/data/mock.js       시안 예시 데이터. 백엔드 연결 시 src/api/ 로 대체
```

## 지금 상태와 다음 단계
- 모든 화면은 목 데이터로 동작합니다. Supabase 연결은 백엔드 API 확정 후 `src/api/` 를 만들어 `AppState` 의 목 로직을 바꿉니다.
- 지도는 시안의 육각 구역 그림(자리표시)입니다. 네이버지도(`@mj-studio/react-native-naver-map`)는 Expo Go 에서 안 돌아가므로 EAS 개발 빌드로 붙입니다.
- 촬영 화면은 `expo-camera` + `expo-location` 으로 사진과 촬영 위치·시각을 함께 받습니다. 실제 폰에서 확인이 필요합니다.
- 로그인 수단(카카오·이메일)과 설정 항목은 시안 가정값입니다.
