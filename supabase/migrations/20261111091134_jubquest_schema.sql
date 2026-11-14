-- 줍퀘스트 스키마 (docs/api.md + frontend 화면 기준)

create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;

-- ─────────────────────────────────────────────
-- 서버 내부 설정 (앱에 노출하지 않음: 승격 기준 등)
-- ─────────────────────────────────────────────
create table public.app_settings (
  id boolean primary key default true check (id),
  promote_heart_threshold int not null default 5,     -- 하트 N개 이상이면 승격
  points_per_heart int not null default 5,            -- 하트 1개당 포인트
  report_points_cap int not null default 100,         -- 제보 1건 포인트 상한
  claim_radius_m int not null default 100,            -- 인증 반경
  claim_time_limit interval not null default interval '24 hours', -- 수락 후 인증 제한시간
  daily_claim_limit int not null default 3,           -- 하루 달성 상한 (KST)
  crew_quest_score int not null default 100,          -- 크루 의뢰 1건 완료 시 크루 점수
  points_per_level int not null default 200           -- 레벨 1 오르는 데 필요한 누적 포인트
);
insert into public.app_settings default values;

-- ─────────────────────────────────────────────
-- 사용자 / 제휴처 / 크루 / 시즌
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 20),
  avatar_url text,
  home_area text,
  points int not null default 0 check (points >= 0),         -- 현재 보유 포인트 (합계 캐시, 원장은 point_ledger)
  total_earned int not null default 0 check (total_earned >= 0), -- 누적 획득 포인트 (레벨 계산용)
  created_at timestamptz not null default now()
);

create table public.partners (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  kind text not null check (kind in ('brand','gov','shop'))
);

create table public.crews (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 30),
  area text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.crew_members (
  crew_id bigint not null references public.crews(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade, -- 1인 1크루
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table public.seasons (
  id bigint generated always as identity primary key,
  label text not null,          -- 'SEASON 11'
  period text not null,         -- '미추홀구 · 11월 시즌'
  note text,                    -- 시즌 보상 안내
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

-- ─────────────────────────────────────────────
-- 제보 / 하트
-- ─────────────────────────────────────────────
create table public.reports (
  id bigint generated always as identity primary key,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 40),
  description text not null default '',
  category text not null check (category in ('빗물받이','버스정류장','공원','골목·거리','기타')),
  photo_url text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point,4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  address text,
  status text not null default 'open' check (status in ('open','promoted','rejected')),
  heart_count int not null default 0 check (heart_count >= 0),
  author_points_paid int not null default 0,   -- 제보자에게 이미 지급한 하트 포인트 (상한 관리)
  est_minutes int not null default 15,
  promoted_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_location_idx on public.reports using gist (location);
create index reports_status_idx on public.reports (status);
create index reports_author_idx on public.reports (author_id);

create table public.report_hearts (
  report_id bigint not null references public.reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);
create index report_hearts_user_idx on public.report_hearts (user_id);

-- ─────────────────────────────────────────────
-- 의뢰 / 수락·인증
-- ─────────────────────────────────────────────
create table public.quests (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('partner','crew','report')),  -- 제휴 / 크루 / 승격된 주민 제보
  report_id bigint unique references public.reports(id) on delete cascade,
  partner_id bigint references public.partners(id) on delete set null,
  crew_id bigint references public.crews(id) on delete cascade,
  requester_id uuid default auth.uid() references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '',
  org_name text,                 -- 카드에 보이는 의뢰한 곳 (제휴처명 / 크루명 / 제보자 닉네임)
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  location extensions.geography(Point,4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  address text,                  -- 크루 의뢰는 '모임 장소'
  est_minutes int,
  time_label text,               -- 예: '토 09:00 · 1시간' (없으면 '약 N분')
  goal text,
  tools text,
  reward_points int not null default 0 check (reward_points >= 0), -- 제휴 의뢰 포인트 (report 는 하트로 계산)
  reward_text text,
  hot boolean not null default false,
  required_members int not null default 1 check (required_members between 1 and 50),
  starts_at timestamptz,
  expires_at timestamptz,
  status text not null default 'open' check (status in ('open','done','expired')),
  created_at timestamptz not null default now(),
  check ((lat is null) = (lng is null)),
  check (kind <> 'crew' or crew_id is not null),
  check (kind <> 'report' or report_id is not null)
);
create index quests_location_idx on public.quests using gist (location);
create index quests_status_idx on public.quests (status, kind);
create index quests_partner_idx on public.quests (partner_id);
create index quests_crew_idx on public.quests (crew_id);
create index quests_requester_idx on public.quests (requester_id);

create table public.quest_claims (
  id bigint generated always as identity primary key,
  quest_id bigint not null references public.quests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted'
    check (status in ('accepted','approved','cancelled','expired')),
  accepted_at timestamptz not null default now(),
  before_photo_url text, after_photo_url text,
  before_lat double precision, before_lng double precision, before_accuracy_m real, before_taken_at timestamptz,
  after_lat double precision, after_lng double precision, after_accuracy_m real, after_taken_at timestamptz,
  before_photo_hash text, after_photo_hash text,
  points_awarded int not null default 0,
  crew_score_awarded int not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index quest_claims_one_active_idx on public.quest_claims (quest_id, user_id) where status = 'accepted';
create index quest_claims_user_idx on public.quest_claims (user_id, status, approved_at);
create index quest_claims_quest_idx on public.quest_claims (quest_id, status);
create index quest_claims_before_hash_idx on public.quest_claims (before_photo_hash);
create index quest_claims_after_hash_idx on public.quest_claims (after_photo_hash);

-- 포인트·크루 점수 원장
create table public.point_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,  -- null 은 시드용 크루 점수
  amount int not null default 0,          -- 개인 포인트 증감
  crew_id bigint references public.crews(id) on delete set null,   -- 적립 당시 소속 크루
  crew_score int not null default 0,      -- 크루 랭킹 점수
  reason text not null check (reason in ('report_promoted','report_heart','quest_approved','crew_quest','seed')),
  quest_id bigint references public.quests(id) on delete set null,
  report_id bigint references public.reports(id) on delete set null,
  created_at timestamptz not null default now()
);
create index point_ledger_user_idx on public.point_ledger (user_id, created_at desc);
create index point_ledger_crew_idx on public.point_ledger (crew_id, created_at);
create index point_ledger_quest_idx on public.point_ledger (quest_id);
create index point_ledger_report_idx on public.point_ledger (report_id);

-- ─────────────────────────────────────────────
-- 가입 시 프로필 자동 생성
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, '줍퀘러' || substr(replace(new.id::text, '-', ''), 1, 4))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 권한: 쓰기는 꼭 필요한 컬럼만, 판정은 서버 함수
-- ─────────────────────────────────────────────
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.seasons enable row level security;
alter table public.reports enable row level security;
alter table public.report_hearts enable row level security;
alter table public.quests enable row level security;
alter table public.quest_claims enable row level security;
alter table public.point_ledger enable row level security;

revoke all on public.app_settings from anon, authenticated;
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- 읽기
create policy "public read" on public.profiles for select to anon, authenticated using (true);
create policy "public read" on public.partners for select to anon, authenticated using (true);
create policy "public read" on public.crews for select to anon, authenticated using (true);
create policy "public read" on public.crew_members for select to anon, authenticated using (true);
create policy "public read" on public.seasons for select to anon, authenticated using (true);
create policy "public read" on public.reports for select to anon, authenticated using (true);
create policy "public read" on public.report_hearts for select to anon, authenticated using (true);
create policy "public read" on public.quests for select to anon, authenticated using (true);
create policy "own read" on public.quest_claims for select to authenticated using (user_id = (select auth.uid()));
create policy "own read" on public.point_ledger for select to authenticated using (user_id = (select auth.uid()));

-- 프로필: 닉네임·아바타·동네만 수정
grant update (nickname, avatar_url, home_area) on public.profiles to authenticated;
create policy "own update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 제보 올리기
grant insert (title, description, category, photo_url, lat, lng, address) on public.reports to authenticated;
create policy "own insert" on public.reports for insert to authenticated
  with check (author_id = (select auth.uid()));

-- 하트 (본인 제보 제외)
grant insert (report_id) on public.report_hearts to authenticated;
grant delete on public.report_hearts to authenticated;
create policy "own heart insert" on public.report_hearts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.reports r where r.id = report_id and r.author_id = (select auth.uid()))
  );
create policy "own heart delete" on public.report_hearts for delete to authenticated
  using (user_id = (select auth.uid()));

-- 크루 가입·탈퇴
grant insert (crew_id) on public.crew_members to authenticated;
grant delete on public.crew_members to authenticated;
create policy "join self" on public.crew_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member');
create policy "leave self" on public.crew_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- 크루 의뢰 올리기 (크루원만)
grant insert (kind, crew_id, title, description, address, lat, lng, required_members, time_label, starts_at, est_minutes, goal, tools)
  on public.quests to authenticated;
create policy "crew member insert" on public.quests for insert to authenticated
  with check (
    kind = 'crew'
    and requester_id = (select auth.uid())
    and exists (select 1 from public.crew_members m where m.crew_id = quests.crew_id and m.user_id = (select auth.uid()))
  );

-- crew_members.user_id 기본값
alter table public.crew_members alter column user_id set default auth.uid();

-- ─────────────────────────────────────────────
-- Storage: 제보 사진 / 인증 사진 (공개 읽기, 본인 폴더에만 업로드)
-- 경로 규칙: {user_id}/파일명
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('report-photos', 'report-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('claim-photos',  'claim-photos',  true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('report-photos','claim-photos')
              and (storage.foldername(name))[1] = (select auth.uid())::text);
