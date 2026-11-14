-- 백엔드 요청(docs/backend-requests.md) 반영: 테이블·컬럼·설정
-- 숫자 값은 전부 app_settings 에 두고, 아직 정해지지 않은 값은 "임시"로 표시합니다.

-- ─────────────────────────────────────────────
-- 서버 내부 설정
-- ─────────────────────────────────────────────
alter table public.app_settings
  add column heart_giver_points int not null default 1,          -- 1-2 하트 누른 사람 포인트 (임시)
  add column heart_daily_limit int not null default 10,          -- 1-4 하트 하루 상한 (확정)
  add column xp_per_level int not null default 300,              -- 1-5 개인 레벨 (임시)
  add column xp_by_category jsonb not null default
    '{"빗물받이":100,"버스정류장":80,"공원":150,"골목·거리":80,"기타":50}', -- 1-5 장소 유형별 XP (임시)
  add column crew_xp_per_level int not null default 500,         -- 1-6 크루 레벨 (임시)
  add column crew_quest_xp_multiplier int not null default 2,    -- 1-6 크루 의뢰 크루 XP 배수 (임시)
  add column crew_quest_points int not null default 50,          -- 1-6 크루 의뢰(kind='crew') 개인 포인트 (임시, 요청에 값이 없어 정함)
  add column report_publish_delay interval not null default interval '3 minutes', -- 3-7 제보 공개 지연
  add column proof_min_gap interval not null default interval '1 minute';         -- 3-6 전·후 사진 최소 간격 (임시)

-- 레벨은 이제 XP 로 계산하고, 크루 의뢰도 크루 XP 로 보상하므로 예전 값은 지웁니다.
alter table public.app_settings drop column points_per_level, drop column crew_quest_score;

-- ─────────────────────────────────────────────
-- 사용자: XP, 꾸미기 착용
-- ─────────────────────────────────────────────
alter table public.profiles
  add column xp int not null default 0 check (xp >= 0),          -- 1-5 쌓이기만 하는 값
  add column frame_id text not null default 'frame-tape',        -- 2-10 착용 중인 테두리
  add column name_color_id text not null default 'name-white';   -- 2-10 착용 중인 닉네임 색

-- ─────────────────────────────────────────────
-- 제보: 문제 유형, 필요 인원, 공개 시각
-- ─────────────────────────────────────────────
alter table public.reports
  add column issue_type text not null default 'litter'
    check (issue_type in ('litter','dumping','bin','drain','graffiti')),              -- 2-9
  add column required_members int not null default 1 check (required_members between 1 and 50), -- 2-8
  add column visible_at timestamptz,                                                   -- 3-7 (insert 시 서버가 채움)
  add column is_demo boolean not null default false;                                   -- 3-4
alter table public.reports drop column author_points_paid;  -- 1-1 제보자 적립이 없어져 필요 없음
create index reports_visible_idx on public.reports (visible_at);

-- ─────────────────────────────────────────────
-- 의뢰: 장소 유형(XP), 문제 유형, 인증 방식, 제휴 보상
-- ─────────────────────────────────────────────
alter table public.quests
  add column category text not null default '기타'
    check (category in ('빗물받이','버스정류장','공원','골목·거리','기타')),               -- 1-5 XP 기준
  add column issue_type text check (issue_type in ('litter','dumping','bin','drain','graffiti')), -- 2-9
  add column proof_mode text not null default 'before_after' check (proof_mode in ('before_after','single')), -- 2-4
  add column proof_label text,                                                         -- 2-4 예: '벤치 사진'
  add column reward_label text,                                                        -- 2-5 예: '충주사랑상품권 5,000원'
  add column reward_value text,                                                        -- 2-5 예: '5,000원'
  add column reward_unit text,                                                         -- 2-5 예: '상품권'
  add column is_demo boolean not null default false;                                   -- 3-4

-- ─────────────────────────────────────────────
-- 수락·인증: XP 기록, 업로드 시각, 제휴 보상 수령 기록
-- ─────────────────────────────────────────────
alter table public.quest_claims rename column crew_score_awarded to crew_xp_awarded;
alter table public.quest_claims
  add column xp_awarded int not null default 0,
  add column reward_label text;   -- 2-5 받은 제휴 보상 (승인 시점 값)

-- ─────────────────────────────────────────────
-- 포인트 원장: XP, 새 사유
-- crew_score 는 이제 "크루 XP" 입니다(크루 레벨·시즌 랭킹 모두 이 값).
-- ─────────────────────────────────────────────
alter table public.point_ledger
  add column xp int not null default 0;
alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in (
  'report_promoted','report_heart',          -- 예전 기록용 (1-1 이후 쓰지 않음)
  'heart_given',                             -- 1-2 하트 누른 사람
  'quest_approved','crew_quest',             -- 의뢰 해결
  'shop_redeem','cosmetic_buy',              -- 2-6, 2-10 포인트 사용 (amount 음수)
  'seed'));

-- ─────────────────────────────────────────────
-- 크루: 시연용 표시, 활동 알림
-- ─────────────────────────────────────────────
alter table public.crews add column is_demo boolean not null default false;   -- 3-4
alter table public.partners add column is_demo boolean not null default false; -- 3-4

-- 2-3 크루 활동 알림 (사람이 쓰는 채팅이 아니라 서버가 자동으로 남기는 기록)
create table public.crew_events (
  id bigint generated always as identity primary key,
  crew_id bigint not null references public.crews(id) on delete cascade,
  type text not null check (type in ('create','join','leave','quest','complete')),
  user_id uuid references public.profiles(id) on delete set null,
  nickname text not null default '',          -- 기록 당시 닉네임
  quest_id bigint references public.quests(id) on delete set null,
  title text,                                 -- 의뢰 제목
  crew_xp int not null default 0,
  points int not null default 0,
  is_crew_quest boolean not null default false,
  created_at timestamptz not null default now()
);
create index crew_events_crew_idx on public.crew_events (crew_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2-6 포인트 교환 상점
-- ─────────────────────────────────────────────
create table public.shop_items (
  id bigint generated always as identity primary key,
  name text not null,
  cost int not null check (cost > 0),
  active boolean not null default true,
  sort int not null default 0
);

create table public.coupons (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id bigint references public.shop_items(id) on delete set null,
  name text not null,              -- 교환 당시 상품 이름
  cost int not null,
  code text not null unique,
  created_at timestamptz not null default now()
);
create index coupons_user_idx on public.coupons (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2-10 프로필 꾸미기
-- ─────────────────────────────────────────────
create table public.cosmetics (
  id text primary key,
  kind text not null check (kind in ('frame','name')),
  name text not null,
  style text,                      -- frame 모양 이름 (frontend/src/components/AvatarFrame.js)
  colors text[] not null,
  cost int not null default 0 check (cost >= 0),   -- 0 이면 레벨로만 열림
  level int not null default 1 check (level >= 1), -- 필요 레벨
  sort int not null default 0
);

create table public.user_cosmetics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.cosmetics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

-- ─────────────────────────────────────────────
-- 권한
-- ─────────────────────────────────────────────
alter table public.crew_events enable row level security;
alter table public.shop_items enable row level security;
alter table public.coupons enable row level security;
alter table public.cosmetics enable row level security;
alter table public.user_cosmetics enable row level security;
revoke insert, update, delete, truncate on public.crew_events, public.shop_items, public.coupons,
  public.cosmetics, public.user_cosmetics from anon, authenticated;

create policy "crew read" on public.crew_events for select to authenticated
  using (exists (select 1 from public.crew_members m where m.crew_id = crew_events.crew_id and m.user_id = (select auth.uid())));
create policy "public read" on public.shop_items for select to anon, authenticated using (active);
create policy "own read" on public.coupons for select to authenticated using (user_id = (select auth.uid()));
create policy "public read" on public.cosmetics for select to anon, authenticated using (true);
create policy "own read" on public.user_cosmetics for select to authenticated using (user_id = (select auth.uid()));

-- 1-3 하트 취소 없음: 클라이언트 delete 권한·정책 제거 (트리거는 함수 파일에서 정리)
revoke delete on public.report_hearts from authenticated;
drop policy "own heart delete" on public.report_hearts;

-- 2-8, 2-9 제보 insert 허용 컬럼 추가
grant insert (issue_type, required_members) on public.reports to authenticated;

-- 크루 의뢰 올리기: 장소 유형도 받기
grant insert (category) on public.quests to authenticated;
