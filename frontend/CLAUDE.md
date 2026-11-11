# frontend 작업 규칙

담당: 프론트엔드(한재준). 루트 `CLAUDE.md` 의 공통 규칙을 먼저 따릅니다.

- 수정 범위는 `frontend/` 입니다. `supabase/` 는 읽기만 하고 수정하지 않습니다. 스키마·RPC가 필요하면 `docs/api.md` 에 요청으로 적습니다.
- Supabase 는 `src/lib/supabase.js` 의 클라이언트로만 접근합니다. 테이블·컬럼·RPC 이름은 `docs/api.md` 와 맞춥니다.
- 브라우저에는 anon key 만 둡니다. `service_role` 키는 프론트에 두지 않습니다. 환경변수는 `.env`(미커밋)에 `VITE_` 접두사로, 새 변수는 `.env.example` 에도 추가합니다.
- UI 기준은 프로젝트 시안(모바일 화면, 어두운 의뢰판 + 토스식 바텀시트)입니다.
- 인증 사진은 앱 안 카메라 촬영만 허용하고 갤러리 선택 UI를 만들지 않습니다. 촬영 시 위치·시각을 함께 서버로 보냅니다. 하루 3개 상한 표시는 안내용이고 서버 응답을 따릅니다.
- 변경 후 `cd frontend && npm run lint && npm run build` 를 통과시킵니다.
