# 테이블·API

프론트(한재준)와 백엔드(팀원)의 계약 문서입니다. 확정된 스키마의 기준은 `supabase/migrations/` 이고, 이 문서는 그것과 같게 유지합니다. `?` 표시는 아직 정해지지 않은 부분입니다.

프론트는 별도 서버 없이 `supabase-js` 로 호출합니다. 읽기는 대부분 RPC(화면에 맞춘 모양으로 반환), 쓰기는 단순한 것만 테이블 insert/delete 이고 판정이 필요한 것(수락, 인증 승인)은 RPC 입니다. 승격·포인트·하루 상한·위치 검증은 전부 서버가 결정합니다.

## MVP 범위
| 화면 | 백엔드 |
|---|---|
| 의뢰판 | `quests_nearby`, `reports_nearby`, `area_stats`(상단 띠) |
| 의뢰 상세 시트 | `quests_nearby` 행 그대로, 수락 `accept_quest` |
| 인증 | Storage `claim-photos` 업로드 → `approve_claim` |
| 제보하기 | Storage `report-photos` 업로드 → `reports` insert |
| 하트 | `report_hearts` insert / delete |
| 동네 지도 | `map_overview` |
| 크루 랭킹 / 내 크루 / 크루 찾기 | `current_season`, `crew_ranking`, `my_crew`, `crews_to_join` |
| 크루 가입·탈퇴 | `crew_members` insert / delete |
| 크루 의뢰 올리기 | `quests` insert (`kind='crew'`, 크루원만) |
| 내 탭 | `my_profile` |
| 설정 | `profiles` update (nickname, avatar_url, home_area), 로그아웃 |
| 로그인 | 지금은 익명 로그인. 카카오·이메일 연결은 이후 ? |

**하트와 승격 표시 원칙**: 승격은 서버가 자동으로 처리하고, 앱은 승격이라는 말이나 기준을 보여주지 않습니다. 승격 기준값은 서버 내부(`app_settings`, 클라이언트 접근 불가)에만 있습니다. 승격된 제보는 의뢰(`kind='report'`)가 되고 라벨은 "주민 제보"로 내려갑니다.

## 확정 규칙
**하트·승격·포인트**
- 하트 1개당 5점, 제보 1건당 최대 100점(하트 20개)
- 하트 5개가 되면 자동 승격 → 같은 위치에 `kind='report'` 의뢰가 생기고, 그때부터 수락 가능
- 승격 전 제보는 하트만 받고 수락할 수 없음
- 포인트는 승격된 것에만: 승격 순간 제보자에게 (하트 수 × 5)점, 이후 하트가 늘면 상한까지 추가 지급. 하트를 취소해도 지급분은 회수하지 않고, 다시 눌러도 중복 지급 없음
- 승격된 제보를 치운 사람(해결자)도 같은 값(하트 수 × 5, 최대 100)을 받음
- 본인 제보에는 하트 불가, 본인 제보에서 나온 의뢰는 본인이 수락 불가
- 제휴 의뢰는 `quests.reward_points` 만큼 지급

**수락·인증**
- 동시 수락 허용. 수락 후 24시간 안에 인증해야 하고, 지나면 자동 만료(5분마다 정리)
- 주민 제보 의뢰는 첫 승인으로 마감(다른 사람의 수락은 자동 취소). 제휴·크루 의뢰는 마감일까지 여러 명이 각자 한 번씩 가능
- 검증만 통과하면 자동 승인(별도 승인자 없음)

**레벨**: 누적 획득 포인트(`total_earned`, 써도 줄지 않음) 200점마다 1레벨. 라벨: 1~2 새싹 줍줍러 / 3~5 골목 지킴이 / 6~9 동네 정화러 / 10+ 클린 히어로

**크루**: 1인 1크루, 바로 가입(초대·승인 없음). 크루 점수 = 시즌 동안 크루원이 번 포인트 합 + 크루 의뢰 완료 1건당 100점. 크루 의뢰는 개인 포인트 없이 크루 점수만.

## 악용 방지 규칙 (확정, 서버 `approve_claim` 에서 판정)
1. **하루 3개 상한**: 승인 기준, 한국 시간 0시 기준. 수락만 한 것은 세지 않음 → `DAILY_LIMIT`
2. **카메라 촬영 + 위치 검증**
   - 전·후 사진 모두 의뢰 위치에서 **100m 이내** → 아니면 `TOO_FAR`
   - 전·후 촬영 위치끼리도 100m 이내 → `PHOTOS_TOO_FAR_APART`
   - 촬영 시각: 수락 이후, 전 ≤ 후, 미래 불가 → `INVALID_TIME`
   - Android 모의 위치(`mocked`)면 거절 → `MOCK_LOCATION`
3. **사진 해시 중복**: 전·후 해시가 같거나, 다른 인증에서 쓴 해시면 거절 → `DUPLICATE_PHOTO`

크루 의뢰처럼 위치가 없는 의뢰는 2의 "의뢰 위치 반경"만 건너뛰고 나머지는 동일하게 검사합니다.

## 테이블
| 테이블 | 주요 컬럼 | 클라이언트 권한 |
|---|---|---|
| `profiles` | id(=auth.users.id), nickname, avatar_url, home_area, points(보유), total_earned(누적), created_at | 전체 읽기, 본인 nickname·avatar_url·home_area 수정. 가입 시 자동 생성 |
| `reports` | id, author_id, title, description, category(`빗물받이`/`버스정류장`/`공원`/`골목·거리`/`기타`), photo_url, lat, lng, address, status(`open`/`promoted`/`rejected`), heart_count, est_minutes, created_at | 전체 읽기, insert(title, description, category, photo_url, lat, lng, address) |
| `report_hearts` | report_id, user_id, created_at | 전체 읽기, 본인 insert(report_id)/delete |
| `quests` | id, kind(`partner`/`crew`/`report`), report_id, partner_id, crew_id, title, description, org_name, lat, lng, address, est_minutes, time_label, goal, tools, reward_points, reward_text, hot, required_members, starts_at, expires_at, status(`open`/`done`/`expired`) | 전체 읽기, 크루원만 `kind='crew'` insert |
| `quest_claims` | id, quest_id, user_id, status(`accepted`/`approved`/`cancelled`/`expired`), accepted_at, 전·후 photo_url/lat/lng/accuracy_m/taken_at/photo_hash, points_awarded, crew_score_awarded, approved_at | 본인 것만 읽기. 쓰기는 RPC 로만 |
| `point_ledger` | id, user_id, amount, crew_id, crew_score, reason, quest_id, report_id, created_at | 본인 것만 읽기 |
| `partners` | id, name, logo_url, kind(`brand`/`gov`/`shop`) | 전체 읽기 |
| `crews` | id, name, area, owner_id | 전체 읽기 |
| `crew_members` | crew_id, user_id(유일 = 1인 1크루), role, joined_at | 전체 읽기, 본인 insert(crew_id)/delete |
| `seasons` | id, label, period, note, starts_at, ends_at | 전체 읽기 |

Storage 버킷: `report-photos`, `claim-photos` (공개 읽기). 업로드 경로는 반드시 `{내 user id}/파일명`.

## 연결
```js
// frontend/.env
EXPO_PUBLIC_SUPABASE_URL=https://ziyycebeszrrwnhtpqmr.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=(백엔드 담당에게 받기, publishable/anon key)

// 앱 시작 시 세션이 없으면 익명 로그인 (대시보드에서 Anonymous sign-ins 켜 둠)
const { data: { session } } = await supabase.auth.getSession()
if (!session) await supabase.auth.signInAnonymously()
```
에러는 `error.message` 에 아래 코드 문자열로 옵니다.

## API

### 의뢰판
```js
// 의뢰 목록 (제휴 / 내 크루 의뢰 / 승격된 주민 제보), 가까운 순
supabase.rpc('quests_nearby', { p_lat, p_lng, p_radius_m: 1500, p_kind: null }) // p_kind: 'partner'|'crew'|'report'|null
```
반환 행 ↔ mock `QUESTS`: `code`(Q-0012) · `kind` · `label`(제휴 의뢰/크루 의뢰/주민 제보) · `title` · `org` · `description`(desc) · `goal` · `tools` · `time_label`(time) · `point` · `reward` · `hot` · `dist`(320m/1.1km) · `near`(500m 이내) · `distance_m` · `lat` · `lng` · `address` · `required_members` · `current_members` · `hearts`/`hearted`(report 만) · `my_status`(`accepted`/`approved`/...) · `cleared`(내가 완료) · `status` · `expires_at`.
`id` 는 숫자이고 화면 표시는 `code` 를 쓰세요. 크루 의뢰는 내 크루 것만 내려옵니다. 내가 완료한 의뢰는 마감돼도 `cleared: true` 로 같이 내려옵니다.

```js
// 주민 제보 (아직 승격 안 된 것)
supabase.rpc('reports_nearby', { p_lat, p_lng, p_radius_m: 1500 })
```
반환 ↔ mock `REPORTS`: `code`(R-0003) · `title` · `author` · `description` · `category` · `photo_url` · `dist` · `near` · `time_label` · `hearts` · `point` · `hearted` · `mine`(내 제보면 하트 버튼 숨기기) · `lat` · `lng` · `address`.

```js
// 상단 띠
supabase.rpc('area_stats', { p_lat, p_lng, p_radius_m: 1500 })
// { open_quests, done_today, new_reports, ticker: '오늘 이 동네 의뢰 3건 · 완료 1건 · 새 제보 2건' }
```

### 하트
```js
await supabase.from('report_hearts').insert({ report_id })             // 누르기
await supabase.from('report_hearts').delete().eq('report_id', report_id).eq('user_id', me) // 취소
```
본인 제보면 RLS 로 거절(42501). 누른 뒤 `reports_nearby` 를 다시 불러 오면 됩니다. 하트 5개째에 제보가 목록에서 빠지고 `quests_nearby` 에 `kind='report'` 로 나타납니다.

### 제보하기
```js
const path = `${user.id}/${Date.now()}.jpg`
await supabase.storage.from('report-photos').upload(path, file, { contentType: 'image/jpeg' })
await supabase.from('reports').insert({
  title, category,                // category 는 REPORT_CATEGORIES 값 그대로
  photo_url: path, lat, lng,      // 촬영 위치
  address, description,           // 선택
})
```

### 수락 / 인증
```js
const { data } = await supabase.rpc('accept_quest', { p_quest_id: quest.id })
// { claim_id, deadline_at, daily_remaining }
// 에러: QUEST_CLOSED, OWN_REPORT, NOT_CREW_MEMBER, ALREADY_ACCEPTED, ALREADY_CLEARED

await supabase.rpc('cancel_claim', { p_claim_id })
const { data: active } = await supabase.rpc('my_claims')     // 진행 중인 내 의뢰
const { data: left } = await supabase.rpc('my_daily_remaining') // 오늘 남은 인증 수(안내용)
```

```js
// CaptureScreen 의 shot = { uri, lat, lng, accuracyM, takenAt, mocked } 두 장 + 사진 해시
// 해시는 촬영 파일 내용의 SHA-256 (예: expo-crypto + expo-file-system 으로 base64 읽어서 digest)
await supabase.storage.from('claim-photos').upload(`${user.id}/${claimId}-before.jpg`, beforeFile)
await supabase.storage.from('claim-photos').upload(`${user.id}/${claimId}-after.jpg`, afterFile)

const { data, error } = await supabase.rpc('approve_claim', {
  p_claim_id: claimId,
  p_before_photo_url, p_before_lat, p_before_lng, p_before_accuracy_m, p_before_taken_at, p_before_photo_hash,
  p_after_photo_url,  p_after_lat,  p_after_lng,  p_after_accuracy_m,  p_after_taken_at,  p_after_photo_hash,
  p_mocked: before.mocked || after.mocked,
})
// 성공: { points_awarded, crew_score_awarded, points, level, leveled_up, daily_remaining }
// 실패: DAILY_LIMIT, TOO_FAR, PHOTOS_TOO_FAR_APART, INVALID_TIME, MOCK_LOCATION, DUPLICATE_PHOTO,
//       MISSING_PROOF, CLAIM_EXPIRED, QUEST_CLOSED, CLAIM_NOT_ACTIVE
```
실패해도 claim 은 `accepted` 로 남아서 다시 찍어 올릴 수 있습니다(만료 제외).

### 내 탭 / 설정
```js
supabase.rpc('my_profile')
// { nickname, initial, joined_days, level, level_label, level_progress(0~1), next_level_points,
//   points, total_earned, crew, daily_remaining, badges:[{name,desc,on}], records:[[라벨, 값]] }
await supabase.from('profiles').update({ nickname, home_area }).eq('id', me)
await supabase.auth.signOut()
```
배지는 첫줍(1건)·열줍(10건)·새벽(오전 7시 전 완료)·???(비 오는 날, 아직 판정 없음) 입니다. 시안의 "주운 쓰레기 kg", "함께 걸은 거리"는 기록하지 않아서 `records` 는 완료한 의뢰·올린 제보·누적 포인트로 내려갑니다.

### 크루
```js
supabase.rpc('current_season')  // { label:'SEASON 11', period, note, title:'시즌 종료까지 20일', ... }
supabase.rpc('crew_ranking')    // [{ rank, crew_id, name, meta:'용현동 · 5명', score, mine }]
supabase.rpc('my_crew')         // null 이면 미가입 화면. { id, name, rank, score, stats:[[라벨, 값] x3] }
supabase.rpc('crews_to_join')   // [{ id, name, meta }]
await supabase.from('crew_members').insert({ crew_id })        // 가입 (이미 크루가 있으면 23505)
await supabase.from('crew_members').delete().eq('user_id', me) // 탈퇴
await supabase.from('quests').insert({                         // 크루 의뢰 올리기 (크루원만)
  kind: 'crew', crew_id, title, address: 모임장소, required_members, // 2 이상
  time_label, starts_at, lat, lng,                             // 선택
})
```
`my_crew.stats` 첫 줄은 시안의 "함께 치운 시간" 대신 "이번 주 함께 완료한 의뢰"입니다(시간은 기록하지 않음).

### 동네 지도
```js
supabase.rpc('map_overview', { p_lat, p_lng, p_radius_m: 1500 })
// { stats: [['38%','우리 동네 정화율'], ['14','우리 크루 구역'], ['6','새 제보']],
//   points: [{ type:'cleared'|'quest'|'hot_report', lat, lng, crew:'mine'|'other'|'none'|null }] }
```
범례 매핑: cleared+mine = 우리 크루, cleared+other = 다른 크루, quest = 의뢰 있음, hot_report = 제보 많음.

## 시드 데이터
`supabase/seed.sql` 에 mock 값(제휴 의뢰 3, 크루 의뢰 1, 주민 제보 3, 크루 5, 시즌 11)이 들어 있고 원격 DB 에도 넣어 두었습니다. 시연 좌표: lat 37.4520, lng 126.6560 (인하대 후문 근처). "인하대 후문 빗물받이 꽁초" 제보는 하트 1개만 더 받으면 승격됩니다.

## 프론트에 요청
- 의뢰 카드 라벨: `kind='report'` 는 "주민 제보" 도장으로 보여 주세요(`label` 필드 그대로 써도 됩니다).
- 인증 시 사진 해시(SHA-256)를 같이 보내 주세요. 없으면 `MISSING_PROOF` 입니다.
- 로그인 화면의 카카오·이메일 버튼은 당분간 둘 다 `signInAnonymously()` 로 연결해 주세요.

## 정해야 할 것
- 로그인 방식 확정(카카오·이메일)과 익명 계정 연결 시점 ?
- 같은 위치 중복 제보 처리 ?
- 포인트 사용처(제휴 쿠폰, 지자체 마일리지 연계 등). MVP 에는 교환 화면 없음 ?
- 비 오는 날 배지 판정 방법 ?
