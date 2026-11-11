# 줍퀘스트 (JubQuest)

동네 쓰레기·꽁초를 치우는 환경 미화 퀘스트 앱입니다. IN:VIBE Camp 팀 CHJCHJ 프로젝트.

주민이 제보하고 하트를 많이 받은 제보는 서버가 자동으로 승격해 포인트가 붙고(사용자에게는 "주민 제보"로만 보임), 근처 사용자가 의뢰를 해결하면 포인트를 받습니다. 제휴처가 직접 올리는 의뢰도 있습니다. 승격된 의뢰에만 포인트가 붙습니다.

## 팀과 역할
| 역할 | 담당 | 범위 |
|---|---|---|
| 프론트엔드 | 한재준 | `frontend/` (React Native, Expo) |
| 백엔드 | 팀원 | `supabase/` (DB·인증·스토리지) |

## 구조
```
frontend/   React Native(Expo) 모바일 앱
supabase/   마이그레이션 SQL, Supabase 설정
docs/       테이블·API 초안 (docs/api.md) — 프론트·백엔드 공통 계약
CLAUDE.md   Claude 작업 규칙 (영역 경계). frontend/, supabase/ 에도 각각 있음
```

## 실행 방법
```bash
cd frontend
cp .env.example .env     # Supabase URL / anon key 는 백엔드 담당에게 받기
npm install
npx expo start           # 폰의 Expo Go 앱으로 QR 스캔
```
Node 20 이상을 권합니다.

## 협업 규칙
- `main` 은 PR 로만 합칩니다. 직접 push 하지 않습니다.
- 브랜치 이름: `feature/기능`, `fix/내용`, `docs/내용` (프론트는 `feature/fe-...`, 백엔드는 `feature/be-...` 처럼 앞에 구분을 붙여도 좋습니다)
- 커밋 메시지는 한 줄로 무엇을 했는지 적습니다. 예: `제보 목록 화면 추가`
- PR 은 상대 역할 한 명이 확인한 뒤 합칩니다. API·테이블을 바꾸면 `docs/api.md` 도 같이 고칩니다.
- 각자 Claude 와 작업하며, 자기 폴더만 수정합니다(프론트 `frontend/`, 백엔드 `supabase/`). 상대 쪽에 필요한 변경은 `docs/api.md` 나 PR 설명으로 요청합니다. 자세한 규칙은 `CLAUDE.md`.
- `.env`, 키, 비밀번호는 커밋하지 않습니다. (`service_role` 키는 특히 주의)
