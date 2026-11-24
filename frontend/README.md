# frontend

집게표(구 줍퀘스트) 모바일 앱 (React Native + Expo, JavaScript).

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
src/components/        공통 UI (ReportCard, QuestSheet, MyQuests, DailyLimits, Reward, Motion, ClearOverlay ...)
src/screens/           화면 (시작, 의뢰판, 지도, 크루, 내 정보, 포인트 상점, 설정, 제보하기, 촬영)
src/navigation/        시작 여부에 따른 스택 + 하단 탭 4개
src/state/AppState.js  앱 상태. 데이터는 전부 src/api 에서 받음(예시 데이터 없음)
src/api/               index.js 가 구현을 고름: remote.js(Supabase) / local.js(기기 저장소)
```

## 데이터가 저장되는 곳
- `.env` 에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 가 **없으면** 기기 저장소 모드입니다. 제보·수락·인증·레벨이 이 기기 안에서 실제로 동작하지만 다른 사람과 공유되지 않습니다. 서버가 생기면 승격·포인트·크루 순위는 서버가 정합니다.
- 포인트 규칙(2026-11-12): 의뢰를 올린 사람은 포인트가 없고 해결한 사람만 받습니다. 하트를 누른 사람은 소량을 받습니다. 기기 저장소 모드의 금액은 임시값입니다(해결 보상 = 하트 수 × 5, 하트 누르면 +1, 상점 상품·가격, 크루 레벨 500 경험치).
- 하루 제한은 두 가지이고 화면에서도 따로 보여줍니다: 의뢰 해결 3개, 하트 10개(KST 0시 기준).
- 크루: 만들기·가입·탈퇴·랭킹, 크루 의뢰(최소 2명), 크루원이 의뢰를 해결하면 자동 알림이 올라오는 활동 방, 크루원별 기여도. 이 기기에서 만든 크루만 보입니다.
- 내 정보의 포인트 교환 상점은 예시 상품이며 실제 쿠폰 발급은 연결되어 있지 않습니다.
- 두 값이 **있으면** Supabase 를 씁니다. `remote.js` 는 백엔드 API 가이드(`get_nearby_reports`, `toggle_like`, `accept_report`, `submit_proof` 등)에 맞춰 썼지만 실제 서버로는 아직 확인하지 못했습니다.
- 기기 저장소 모드에는 제휴 의뢰 예시 1건(충주사랑상품권 보상, 금액은 예시값)이 내 위치 근처에 들어 있습니다. 실제 상품권 지급은 연결되어 있지 않습니다.
- 기기 저장소 모드의 규칙: 하루 완료 3개(KST 0시 기준), 인증 사진은 의뢰 위치 100m 안, 수락 후 24시간 안에 인증, 경험치 300마다 1레벨.

## 웹 미리보기와 배포
- PC 브라우저: `npx expo start --web`
- `main` 에 `frontend/` 변경이 합쳐지면 `.github/workflows/deploy-web.yml` 이 웹으로 빌드해 GitHub Pages 에 올립니다. 주소는 `https://wintevel.github.io/IN-VIBE-camp/` 입니다. 저장소 Settings > Pages 의 Source 가 "GitHub Actions" 여야 합니다.
- 웹은 PWA 로도 쓸 수 있습니다. 폰 브라우저에서 열고 Android Chrome 은 "앱 설치"(또는 "홈 화면에 추가"), iOS Safari 는 공유 > "홈 화면에 추가"를 누르면 집게표 아이콘으로 설치되고 주소창 없이 열립니다. 설정 파일은 `frontend/public/` 에 있습니다(`index.html` 템플릿, `manifest.webmanifest`, `sw.js`, `icons/`). 서비스 워커는 앱 셸·번들만 캐시하고 Supabase 응답·업체 웹(`/partner/`)은 건드리지 않습니다. 오프라인에서는 화면만 뜨고 서버 데이터는 못 불러옵니다. 아이콘은 `node scripts/make-icons.js` 로 다시 만듭니다. 주소 경로를 바꾸면(`app.json` 의 `baseUrl`) `public/` 안의 `/IN-VIBE-camp/` 도 함께 바꿔야 합니다.
- 웹의 첫 화면(로그인)과 내 정보 맨 아래에 "홈 화면에 앱으로 설치" 버튼이 있습니다(`src/components/InstallApp.js`, `src/lib/install.js`). 크롬 계열은 설치창을 바로 띄우고, 아이폰 사파리나 설치창을 못 띄우는 브라우저는 메뉴 안내 문구를 보여 줍니다. 이미 홈 화면 앱으로 열었거나 폰 앱(네이티브)에서는 보이지 않습니다.
- 안드로이드 APK 버튼("갤럭시·안드로이드 앱(APK) 받기")은 APK 주소가 있을 때만 보입니다. 저장소 Settings > Secrets and variables > Actions > Variables 에 `APK_URL` 을 넣으면 다음 배포부터 켜집니다(로컬은 `.env` 의 `EXPO_PUBLIC_APK_URL`). APK 파일 자체는 EAS Build(`eas build -p android --profile preview`) 등으로 따로 만들어 올려야 합니다.
- 웹은 미리보기용입니다. 실제 인증(카메라·위치 신뢰도)은 폰 앱 기준입니다.

## 지도
지금은 키 없이 도는 Leaflet + OpenStreetMap 을 WebView(웹은 iframe)에 넣었습니다. 네이버지도(`@mj-studio/react-native-naver-map`)는 EAS 개발 빌드와 키가 필요해 그때 `src/components/MapView.native.js` 만 바꾸면 됩니다.

## 전시 시연판(인터넷 없이 zip 으로 실행)
- `node scripts/build-offline.js` 로 만듭니다. 결과는 `dist-offline/jipgepyo-offline.zip`(커밋하지 않음)이고, Windows PC 에서 압축을 풀고 `START.bat` 을 더블클릭하면 로컬 서버가 켜지고 브라우저로 `http://localhost:8723/IN-VIBE-camp/` 가 열립니다.
- 서버는 `offline/server/` 에 있습니다. Go 가 있으면 `jipgepyo-server.exe` 를 만들어 넣고, 없거나 백신이 막으면 `START.bat` 이 Windows 기본 PowerShell 로 도는 `server.ps1` 로 넘어갑니다.
- 앱은 `EXPO_PUBLIC_DEMO=1` 로 빌드되어 `src/lib/demo.js` 의 시연판 동작을 씁니다: 기기 저장소 모드 고정(서버 연결 안 함), 내 위치 고정(인하대 근처), 이웃 제보 6개·크루 3개·시작 포인트 200 예시, 카메라 없이 "시연용 사진"으로 촬영, 전·후 사진 간격 10초, 폰트·Leaflet 은 zip 안 파일, 지도 배경은 격자 무늬(인터넷 지도 없음).
- 일반 빌드(웹 배포·폰 앱)는 `EXPO_PUBLIC_DEMO` 가 없어 영향이 없습니다. 관람객이 바뀔 때는 설정 > "이 기기의 기록 모두 지우기"로 처음 상태로 돌립니다.
