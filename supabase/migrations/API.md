# 클린길드 백엔드 API 가이드 (MVP)

Supabase 프로젝트: IN:VIBE CAMP

## 0. 연결

```bash
npm i @supabase/supabase-js
```

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ziyycebeszrrwnhtpqmr.supabase.co',
  'sb_publishable_RiJeEh4sjhdKxzYIqbxBvg_aKa0H2uz'
)

// 앱 시작 시: 세션 없으면 익명 로그인 (프로필은 서버에서 자동 생성)
const { data: { session } } = await supabase.auth.getSession()
if (!session) await supabase.auth.signInAnonymously()
```

모든 쓰기 작업은 아래 RPC 함수로만 해야 함. 테이블에 직접 insert/update는 막혀 있음.
에러는 `error.message`에 코드 문자열로 옴 (예: `REPORT_FULL`).

## 1. 핵심 흐름

제보 등록 → 공감 5개 → 의뢰로 승격(포인트 생김) → 수락 → 인증 → 완료

- 승격 전 제보도 수락하고 치울 수 있음 → 경험치만 받음
- 승격된 의뢰 → 경험치 + 포인트
- 승격 순간 제보자에게 보너스 20P + 30XP
- 필요 인원(required_members)이 다 차야 진행 중이 되고, 그때부터 24시간 안에 인증해야 함
- 24시간 지나면 자동으로 다시 모집 중으로 돌아감 (5분마다 서버에서 정리)

상태값
- reports.status: `open`(모집 중) / `in_progress`(진행 중) / `completed`(완료)
- place_type: `drain` 빗물받이 / `bus_stop` 버스정류장 / `park` 공원 / `street` 골목·거리 / `etc` 기타

장소별 보상 (경험치 / 승격 시 포인트)
- drain 100 / 100, bus_stop 80 / 80, park 150 / 150, street 80 / 80, etc 50 / 50
- 레벨: 경험치 300마다 1레벨

## 2. 의뢰판: 내 주변 의뢰 목록

```js
const { data, error } = await supabase.rpc('get_nearby_reports', {
  p_lat: 37.4520,
  p_lng: 126.6560,
  p_radius_m: 1500,            // 반경(m), 기본 1500
  p_place_type: null,          // 'drain' 등으로 필터, null이면 전체
  p_only_promoted: false,      // true면 승격된 의뢰만
  p_include_completed: false   // true면 완료된 것도 포함
})
```

각 항목 필드
- id, title, description, place_type, place_label(한글 이름)
- lat, lng, address, dong, photo_path
- status, is_promoted, like_count, like_threshold(승격 기준 공감 수)
- required_members, current_members (크루 의뢰 = required_members > 1)
- reward_xp, reward_points (승격 전엔 reward_points = 0)
- deadline_at (진행 중일 때 인증 마감 시각)
- created_at, reporter_id, reporter_nickname
- distance_m (내 위치로부터 거리, 가까운 순 정렬)
- liked_by_me, i_am_participating

의뢰 번호 표시는 `Q-${String(id).padStart(4,'0')}` 처럼 프론트에서 만들면 됨.

## 3. 제보하기

사진 먼저 업로드 → 경로를 함께 넘김. 사진 경로는 반드시 `{내 user id}/파일명` 형태여야 업로드됨.

```js
const { data: { user } } = await supabase.auth.getUser()
const path = `${user.id}/${Date.now()}.jpg`
await supabase.storage.from('photos').upload(path, file)

const { data: reportId, error } = await supabase.rpc('create_report', {
  p_title: '인하대 후문 빗물받이 꽁초',
  p_place_type: 'drain',
  p_lat: 37.4512,
  p_lng: 126.6566,
  p_address: '인천 미추홀구 인하로 100 인근',   // 지도 API로 좌표→주소 변환해서 넣기
  p_description: '비 오면 물이 안 빠져요',
  p_dong: '용현동',
  p_photo_path: path,
  p_required_members: 1                         // 크루 의뢰면 2 이상
})
```

사진 보여줄 때 (공개 버킷)
```js
supabase.storage.from('photos').getPublicUrl(photo_path).data.publicUrl
```

## 4. 공감 (토글)

```js
const { data } = await supabase.rpc('toggle_like', { p_report_id: id })
// { liked, like_count, is_promoted, just_promoted }
// just_promoted === true 이면 "의뢰로 승격됐어요!" 연출
```
에러: `CANNOT_LIKE_OWN_REPORT` (본인 제보엔 공감 불가)

## 5. 수락 / 취소

```js
const { data } = await supabase.rpc('accept_report', { p_report_id: id })
// { status, current_members, required_members, deadline_at }
// status가 'open'이면 아직 크루 모집 중, 'in_progress'면 시작됨

await supabase.rpc('cancel_participation', { p_report_id: id })
```
에러: `REPORT_NOT_OPEN`, `ALREADY_JOINED`, `REPORT_FULL`, `NOT_PARTICIPATING`

## 6. 진행 중인 내 의뢰

```js
const { data: { user } } = await supabase.auth.getUser()
const { data } = await supabase
  .from('participations')
  .select('id, joined_at, reports(*)')
  .eq('user_id', user.id)
  .eq('status', 'active')
```
(reports(*)에 deadline_at, status 등 포함. lat/lng도 있음)

## 7. 인증 제출 → 완료

```js
const before = `${user.id}/${id}-before-${Date.now()}.jpg`
const after  = `${user.id}/${id}-after-${Date.now()}.jpg`
await supabase.storage.from('photos').upload(before, beforeFile)
await supabase.storage.from('photos').upload(after, afterFile)

const { data } = await supabase.rpc('submit_proof', {
  p_report_id: id, p_before_path: before, p_after_path: after
})
// { xp_gained, points_gained, level, leveled_up, xp, points, streak_weeks }
// leveled_up === true 면 레벨업 연출
```
크루 의뢰는 한 명만 인증해도 완료되고, 참여자 전원이 각자 보상을 다 받음.
에러: `NOT_PARTICIPATING`, `REPORT_NOT_IN_PROGRESS`(크루 인원 덜 참), `DEADLINE_PASSED`

## 8. 내 정보

```js
const { data } = await supabase.rpc('get_my_profile')
// { id, nickname, xp, points, level, xp_in_level, xp_for_next_level,
//   streak_weeks, active_this_week, completed_count }

await supabase.rpc('set_nickname', { p_nickname: '줍줍왕' })

// 보상 내역
await supabase.from('reward_logs').select('*').order('created_at', { ascending: false })
```

## 9. 포인트 교환 (MVP: 가짜 쿠폰)

```js
const { data: items } = await supabase.from('reward_items').select('*').eq('active', true)
const { data } = await supabase.rpc('redeem_item', { p_item_id: items[0].id })
// { coupon_code, item, points }
```
에러: `NOT_ENOUGH_POINTS`

## 10. 시연용 더미 데이터

용현동 / 인하대 주변에 제보 7개가 들어가 있음 (승격 3개, 미승격 4개, 크루 의뢰 2개).
테스트 좌표: lat 37.4520, lng 126.6560, 반경 1500

## 아직 없는 것 (확장)
- 이메일 로그인 연결 (익명 계정 → `supabase.auth.updateUser({ email })` 로 연결 가능)
- "아직 더러워요" 신고, 랭킹, 크루 생성/관리, 실제 상품권 연동
