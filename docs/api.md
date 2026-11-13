# 테이블·API 초안

프론트(한재준)와 백엔드(팀원)가 맞추기 위한 초안입니다. 확정 전까지는 자유롭게 고치고, 확정된 것은 `supabase/migrations/` 가 기준입니다. `?` 표시는 아직 정해지지 않은 부분입니다.

프론트는 별도 서버 없이 `supabase-js` 로 테이블을 직접 읽고 쓰는 것을 기본으로 합니다. 서버 로직이 필요한 곳(승격, 포인트 지급)은 DB 함수(RPC) 또는 Edge Function 으로 둡니다.

## MVP 범위
초기 앱 시안(`jupquest.html`)에 있는 기능 전부에 제보 하트 자동 승격을 더한 것이고, 아래 화면이 추가됩니다.

| 화면 | 기능 |
|---|---|
| 의뢰판 | 의뢰 카드 목록, 필터(전체·제휴 의뢰·500m 이내·크루 의뢰·주민 제보), 동네 변경 |
| 의뢰 상세 시트 | 의뢰 내용·보상 확인, "의뢰 수락하기" |
| 인증 | 전·후 사진을 앱 카메라로 촬영, 완료 인증, 포인트 지급 토스트 |
| 동네 지도 | 의뢰·치운 구역 표시 |
| 크루 랭킹 | 크루별 순위 |
| 내 탭 | 내 포인트·활동 |
| 추가 | 주민 제보 올리기, 하트(좋아요), 하트가 기준을 넘으면 서버가 자동 승격 |
| 로그인 | 로그인·가입 (카카오·구글·이메일, 익명은 보기만) |
| 설정 | 동네, 알림, 로그아웃, 계정 |
| 내 크루 | 가입한 크루 상태 화면 / 미가입 화면(크루 찾기·가입) / 크루 의뢰 올리기 화면 |

시안에 없던 로그인·설정·내 크루·크루 가입·크루 의뢰 올리기는 이번에 화면으로 추가됐으므로 백엔드도 같이 준비합니다.

**하트와 승격 표시 원칙**: "하입"은 "하트"로 이름을 바꿉니다(테이블·API도 `heart`). 승격은 서버가 기준을 보고 자동으로 처리하고 포인트도 자동으로 올립니다. 앱은 승격이라는 말이나 "하트 N개 모이면 ~" 같은 기준을 사용자에게 보여주지 않고 라벨은 "주민 제보"로만 표시합니다. 그래서 승격 기준값은 서버 내부 값이고 API로 노출하지 않습니다.

## 악용 방지 규칙 (확정)
1. **하루 3개 상한**: 한 사용자가 하루에 달성(승인)할 수 있는 의뢰는 3개까지입니다. 하루의 기준은 한국 시간(KST) 0시입니다. 수락만 하고 달성하지 않은 의뢰는 세지 않습니다. 검사는 서버(`approve_claim` RPC)에서 하며 프론트는 안내용으로만 보여줍니다.
2. **카메라 촬영만 인증**: 갤러리에서 고른 사진은 인증에 쓸 수 없습니다. 촬영 순간의 위치(lat, lng, accuracy)와 시각을 사진과 함께 기록하고, 서버가 의뢰 위치와 거리를 비교해 반경 밖이면 거절합니다.
   - 반경은 `quest_claims` 검사 함수에서 상수로 둡니다. 초기값 100m ?
   - 전 사진과 후 사진의 촬영 위치도 서로 가까워야 합니다.
   - 같은 사진 재사용을 막기 위해 사진 해시를 저장하고 중복이면 거절합니다.

**플랫폼**: 앱은 React Native(Expo)로 확정입니다. 앱 안 카메라(`expo-camera`)로만 촬영하고 갤러리 선택을 쓰지 않으며, Android 는 모의 위치(mock location) 감지를 고려합니다. 다만 루팅·후킹 등으로 우회될 수 있어 완벽하지 않으므로, 서버 검사(거리, 시각, 해시, 하루 3개)를 최종 방어선으로 둡니다.

## 흐름
1. 주민이 쓰레기 위치를 **제보**(report)합니다. (사진, 위치, 종류)
2. 다른 사용자가 **하트**(좋아요)를 누릅니다.
3. 하트가 서버 내부 기준을 넘으면 제보가 자동 **승격**되어 포인트가 자동으로 붙습니다(사용자에게는 "주민 제보"로만 보임). 포인트는 승격된 것에만 붙습니다. 승격된 제보가 근처 사용자가 해결하는 의뢰(quest)가 되는지, 포인트를 받는 사람이 제보자인지 해결자인지는 ?
4. 근처 사용자가 의뢰를 **수락**하고 치운 뒤 전후 사진으로 **인증**합니다.
5. 인증이 승인되면 **포인트**가 지급됩니다.
6. 제휴처(브랜드·지자체·상점)가 직접 의뢰를 올리는 경로도 있습니다.

## 테이블 초안

| 테이블 | 주요 컬럼 | 설명 |
|---|---|---|
| `profiles` | id(=auth.users.id), nickname, avatar_url, home_area, points, crew_id? | 사용자 프로필. 포인트는 합계 캐시, 원장은 `point_ledger` |
| `reports` | id, author_id, photo_url, lat, lng, address, category, status(`open`/`promoted`/`rejected`), heart_count, created_at | 주민 제보 |
| `report_hearts` | report_id, user_id, created_at | 하트. (report_id, user_id) 유일 |
| `quests` | id, report_id?, partner_id?, requester_id?, title, reward_points, status(`open`/`claimed`/`done`/`expired`), lat, lng, created_at | 의뢰. 제보 승격분은 report_id 연결, 제휴처·사용자 직접 의뢰는 비움 |
| `quest_claims` | id, quest_id, user_id, before_photo_url, after_photo_url, before_lat, before_lng, after_lat, after_lng, accuracy_m, before_taken_at, after_taken_at, photo_hash, status(`pending`/`approved`/`rejected`), approved_at, created_at | 수락·인증 기록. 촬영 위치·시각은 클라이언트가 보내고 서버가 검증 |
| `point_ledger` | id, user_id, amount, reason, quest_id?, created_at | 포인트 적립·사용 원장 |
| `partners` | id, name, logo_url, kind(`brand`/`gov`/`shop`) | 제휴처 |
| `crews` | id, name, area, owner_id, created_at | 크루 (랭킹용) |
| `crew_members` | crew_id, user_id, role(`owner`/`member`), joined_at | 크루 가입. 사용자당 1개 크루(user_id 유일)? |

## API 초안 (supabase-js 기준)

| 기능 | 호출 | 비고 |
|---|---|---|
| 로그인 | `supabase.auth.signInWith...` | 카카오·구글·이메일. 익명 계정은 보기만 가능 |
| 제보 목록 | `from('reports').select().eq('status','open')` | 위치 기반 정렬은 RPC `reports_nearby(lat,lng,radius)` ? |
| 제보 올리기 | 사진은 Storage `report-photos` 업로드 후 `from('reports').insert(...)` | |
| 하트 | `from('report_hearts').insert({report_id})` | 한 사람 1회. 취소 없음(2026-11-13 프론트 반영: 앱이 누른 뒤 4초 동안만 되돌리기를 받고 그 뒤에 insert 합니다. 서버도 delete 를 막아 주세요 — 백엔드 요청) |
| 승격(자동) | 하트 insert 시 트리거로 `heart_count` 증가, 서버 내부 기준 초과 시 `status='promoted'` 처리와 포인트 적립(`point_ledger`) | 기준값 ? 앱에는 노출하지 않음. 프론트는 제보 목록에서 `status` 를 "주민 제보" 라벨로만 보여줌 |
| 의뢰 목록 | `from('quests').select().eq('status','open')` | 근처순 RPC `quests_nearby` ? |
| 의뢰 수락 | `from('quest_claims').insert(...)` | 동시 수락 허용 여부 ? |
| 인증 올리기 | 앱 카메라로 찍은 전후 사진을 Storage 에 올리고 촬영 위치·시각과 함께 claim 갱신 | 갤러리 업로드 불가. 버킷 쓰기는 본인 폴더만 |
| 인증 승인 | RPC `approve_claim(claim_id)` → 검증 통과 시 포인트 적립 | 검증: 의뢰 위치와 거리(≤ 반경), 전후 위치·시각 일관성, 사진 해시 중복, 오늘 승인 3개 미만. 통과하면 자동 승인할지 별도 승인자를 둘지 ? |
| 오늘 남은 횟수 | RPC `my_daily_remaining()` | 프론트 안내용. 최종 판정은 `approve_claim` |
| 내 포인트 | `from('point_ledger').select().eq('user_id', me)` | |
| 크루 랭킹 | 뷰 `crew_ranking` | |
| 내 크루 상태 | `crew_members` 로 내 크루 조회 후 `crews`·`crew_ranking` 조회 | 없으면 미가입 화면 |
| 크루 가입·탈퇴 | `crew_members` insert / delete | 초대·승인 방식 ? |
| 크루 의뢰 올리기 | `from('quests').insert({...})` (크루원만) | 보상 포인트 재원(크루 포인트? 개인?) ? RLS 로 크루원 확인 |
| 설정 | `profiles` update (nickname, home_area), 로그아웃 `supabase.auth.signOut()` | |

## 정해야 할 것
- 승격 기준(하트 수, 기간, 같은 위치 중복 제보 처리). 사용자에게는 비공개
- 승격 시 포인트 수령자(제보자/해결자)와 승격된 제보의 의뢰 전환 여부
- 자작 제보 후 자작 인증 방지(예: 자기 제보에서 승격된 의뢰는 본인이 달성 불가)
- 인증 반경 기본값, 자동 승인 여부
- 포인트 재원과 사용처(제휴 쿠폰, 지자체 마일리지 연계 등)
- 로그인 방식, 위치 검색 방식(PostGIS 사용 여부)
- Storage 버킷 공개 범위
