# frontend 작업 규칙

담당: 프론트엔드(한재준). 루트 `CLAUDE.md` 의 공통 규칙을 먼저 따릅니다. React Native(Expo, JavaScript) 앱입니다.

- 수정 범위는 `frontend/` 입니다. `supabase/` 는 읽기만 하고 수정하지 않습니다. 스키마·RPC가 필요하면 `docs/api.md` 에 요청으로 적습니다.
- Supabase 는 `src/lib/supabase.js` 의 클라이언트로만 접근합니다. 테이블·컬럼·RPC 이름은 `docs/api.md` 와 맞춥니다.
- 앱에는 anon key 만 둡니다. `service_role` 키는 앱에 두지 않습니다. 환경변수는 `.env`(미커밋)에 `EXPO_PUBLIC_` 접두사로, 새 변수는 `.env.example` 에도 추가합니다.
- Expo 패키지는 반드시 `npx expo install <패키지>` 로 설치합니다(SDK 호환 버전 자동 선택). Expo API는 버전마다 크게 바뀌므로 코드를 쓰기 전에 `package.json` 의 `expo` 버전에 맞는 공식 문서(`https://docs.expo.dev/versions/v<major>.0.0/`)를 확인합니다.
- UI 기준은 프로젝트 시안(어두운 의뢰판 + 토스식 바텀시트)입니다.
- 인증 사진은 `expo-camera` 로 앱 안에서 촬영한 것만 쓰고, 갤러리 선택(`expo-image-picker` 의 라이브러리 선택 등)을 쓰지 않습니다. 촬영 시 `expo-location` 위치·시각을 함께 서버로 보냅니다. 하루 3개 상한 표시는 안내용이고 서버 응답을 따릅니다.
- 변경 후 `cd frontend && npx expo export --platform android` 로 번들이 되는지 확인합니다.
