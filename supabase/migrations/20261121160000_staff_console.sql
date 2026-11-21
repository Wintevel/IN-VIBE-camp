-- ─────────────────────────────────────────────
-- 운영 웹(/dev) 용 운영진 권한 (2026-11-21, 한재준 요청·작성)
--
-- 지금까지 운영진 결정(staff_review_quest, staff_review_claim, staff_attention 등)은
-- 대시보드 SQL 에디터에서만 할 수 있었습니다. 운영진으로 등록된 계정만 웹에서 부를 수 있는
-- admin_* 함수를 더합니다. 기존 함수·테이블은 바꾸지 않고 감싸기만 합니다.
--   - 운영진 목록: staff_members (RLS 켬, 정책 없음 = 함수로만 읽음)
--   - 모든 admin_* 함수는 맨 앞에서 is_staff() 를 확인하고, 아니면 NOT_STAFF 에러
--   - 운영진이 한 일은 staff_actions 에 한 줄씩 남김
--   - 포인트 조정은 point_ledger reason 'staff_adjust'
--   - 정지는 Supabase Auth 의 auth.users.banned_until 을 씀(로그인·토큰 갱신이 막힘,
--     이미 받은 토큰은 만료(기본 1시간)까지 유효)
--
-- 실행 뒤 운영진 등록 (SQL 에디터에서 한 번, 이메일은 본인 것으로):
--   insert into public.staff_members (user_id, name)
--   select id, '운영진' from auth.users where email = '본인 이메일';
-- ─────────────────────────────────────────────

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '운영진' check (char_length(name) between 1 and 20),
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

create table if not exists public.staff_actions (
  id bigint generated always as identity primary key,
  staff_id uuid references auth.users(id) on delete set null,
  action text not null,          -- quest_review / claim_review / report_hide / report_restore / report_dismiss / points / ban
  target text not null,          -- 'quest:12', 'claim:3', 'report:7', 'user:<uuid>'
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.staff_actions enable row level security;
create index if not exists staff_actions_created_idx on public.staff_actions (created_at desc);

alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in (
  'report_promoted','report_heart','heart_given','quest_approved','crew_quest',
  'shop_redeem','cosmetic_buy','feat_reward','seed',
  'claim_disputed','verify_answer','quick_clean','staff_adjust'));

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid())
$$;

create or replace function public.require_staff()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not public.is_staff() then raise exception 'NOT_STAFF'; end if;
end $$;

create or replace function public.staff_log(p_action text, p_target text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.staff_actions (staff_id, action, target, detail) values (auth.uid(), p_action, p_target, coalesce(p_detail, '{}'::jsonb))
$$;

-- 이메일은 가려서 보여 줍니다: hj****@gmail.com
create or replace function public.mask_email(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p is null or position('@' in p) = 0 then null
              else left(split_part(p, '@', 1), 2) || repeat('*', greatest(2, char_length(split_part(p, '@', 1)) - 2)) || '@' || split_part(p, '@', 2) end
$$;

-- ── 나 ──────────────────────────────────────
create or replace function public.admin_me()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('staff', s.user_id is not null, 'name', s.name)
  from (select 1) x left join public.staff_members s on s.user_id = auth.uid()
$$;

-- ── 요약 ────────────────────────────────────
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_staff();
  return json_build_object(
    'quest_review', (select count(*) from public.quests where kind = 'partner' and status = 'review'),
    'claim_review', (select count(*) from public.quest_claims where status = 'staff_review'),
    'flagged', (select count(distinct r.id) from public.reports r
                where r.hidden_at is not null
                   or exists (select 1 from public.report_flags f where f.report_id = r.id and f.status = 'pending')),
    'users', (select count(*) from public.profiles),
    'banned', (select count(*) from auth.users where banned_until > now()),
    'today_claims', (select count(*) from public.quest_claims
                     where submitted_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'today_reports', (select count(*) from public.reports
                      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'recent', (select coalesce(json_agg(json_build_object('action', a.action, 'target', a.target, 'detail', a.detail,
                                                           'at', a.created_at, 'by', s.name) order by a.created_at desc), '[]'::json)
               from (select * from public.staff_actions order by created_at desc limit 8) a
               left join public.staff_members s on s.user_id = a.staff_id));
end $$;

-- ── 제휴 의뢰 검토 ──────────────────────────
-- p_status: 'review'(검토 대기, 기본) | 'all'(최근 60일)
create or replace function public.admin_quests(p_status text default 'review')
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_staff();
  return (select coalesce(json_agg(public.partner_quest_json(q.id)::jsonb
                                   || jsonb_build_object('org_name', q.org_name)
                                   order by (q.status = 'review') desc, q.created_at desc), '[]'::json)
          from public.quests q
          where q.kind = 'partner'
            and (case when p_status = 'review' then q.status = 'review'
                      else q.created_at > now() - interval '60 days' end));
end $$;

create or replace function public.admin_review_quest(p_quest_id bigint, p_approve boolean, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_staff();
  if not p_approve and char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED'; end if;
  v := public.staff_review_quest(p_quest_id, p_approve, nullif(btrim(coalesce(p_reason, '')), ''));
  perform public.staff_log('quest_review', 'quest:' || p_quest_id, jsonb_build_object('approve', p_approve, 'reason', p_reason));
  return v;
end $$;

-- ── 인증 검토 ───────────────────────────────
-- p_status: 'staff_review'(운영진 검토, 기본) | 'all'(최근 14일 제출)
create or replace function public.admin_claims(p_status text default 'staff_review')
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_staff();
  return (select coalesce(json_agg(json_build_object(
            'id', c.id, 'quest_id', q.id, 'title', q.title, 'kind', q.kind, 'org_name', q.org_name,
            'user', p.nickname, 'user_id', c.user_id,
            'before', c.before_photo_url, 'after', c.after_photo_url, 'single', q.proof_mode = 'single',
            'lat', c.before_lat, 'lng', c.before_lng,
            'submitted_at', c.submitted_at, 'disputed_at', c.disputed_at,
            'status', c.status, 'reject_reason', c.reject_reason, 'decided_at', c.decided_at, 'decided_by', c.decided_by)
          order by (c.status = 'staff_review') desc, c.submitted_at desc), '[]'::json)
          from public.quest_claims c
          join public.quests q on q.id = c.quest_id
          left join public.profiles p on p.id = c.user_id
          where (case when p_status = 'staff_review' then c.status = 'staff_review'
                      else c.submitted_at > now() - interval '14 days'
                           and c.status in ('submitted','staff_review','approved','rejected') end));
end $$;

create or replace function public.admin_review_claim(p_claim_id bigint, p_approve boolean, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_staff();
  if not p_approve and char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED'; end if;
  v := public.staff_review_claim(p_claim_id, p_approve, nullif(btrim(coalesce(p_reason, '')), ''));
  perform public.staff_log('claim_review', 'claim:' || p_claim_id, jsonb_build_object('approve', p_approve, 'reason', p_reason));
  return v;
end $$;

-- ── 신고·숨김 제보 ──────────────────────────
create or replace function public.admin_reports()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_staff();
  return (select coalesce(json_agg(json_build_object(
            'id', r.id, 'title', r.title, 'description', r.description, 'category', r.category, 'spot', r.spot,
            'photo', r.photo_url, 'lat', r.lat, 'lng', r.lng, 'author', p.nickname, 'author_id', r.author_id,
            'created_at', r.created_at, 'hidden_at', r.hidden_at, 'gone_flagged_at', r.gone_flagged_at,
            'flags', (select count(*) from public.report_flags f where f.report_id = r.id and f.status = 'pending'),
            'reasons', (select coalesce(json_agg(f.reason), '[]'::json) from public.report_flags f
                        where f.report_id = r.id and f.status = 'pending'))
          order by coalesce(r.hidden_at, r.created_at) desc), '[]'::json)
          from public.reports r
          left join public.profiles p on p.id = r.author_id
          where r.hidden_at is not null
             or r.gone_flagged_at is not null
             or exists (select 1 from public.report_flags f where f.report_id = r.id and f.status = 'pending'));
end $$;

-- p_action: 'hide'(숨기고 신고 처리) | 'restore'(다시 보이고 신고 기각) | 'dismiss'(보이는 채로 신고 기각)
create or replace function public.admin_set_report(p_report_id bigint, p_action text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  if p_action not in ('hide','restore','dismiss') then raise exception 'INVALID_INPUT'; end if;
  if not exists (select 1 from public.reports where id = p_report_id) then raise exception 'NOT_FOUND'; end if;
  if p_action = 'hide' then
    update public.reports set hidden_at = coalesce(hidden_at, now()) where id = p_report_id;
    update public.report_flags set status = 'resolved' where report_id = p_report_id and status = 'pending';
  else
    update public.reports set hidden_at = null, gone_flagged_at = null where id = p_report_id and p_action = 'restore';
    update public.reports set gone_flagged_at = null where id = p_report_id and p_action = 'dismiss';
    update public.report_flags set status = 'dismissed' where report_id = p_report_id and status = 'pending';
  end if;
  perform public.staff_log('report_' || p_action, 'report:' || p_report_id);
  return p_action;
end $$;

-- ── 계정 ────────────────────────────────────
-- 닉네임 일부 또는 이메일 전체로 찾습니다. 빈 값이면 최근 가입 50명.
create or replace function public.admin_users(p_query text default '')
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_q text := btrim(coalesce(p_query, ''));
begin
  perform public.require_staff();
  return (select coalesce(json_agg(json_build_object(
            'id', p.id, 'nickname', p.nickname, 'email', public.mask_email(u.email), 'anonymous', coalesce(u.is_anonymous, false),
            'points', p.points, 'total_earned', p.total_earned, 'xp', p.xp, 'level', public.level_of(p.xp),
            'created_at', p.created_at, 'last_sign_in_at', u.last_sign_in_at,
            'banned_until', case when u.banned_until > now() then u.banned_until end,
            'staff', exists (select 1 from public.staff_members s where s.user_id = p.id),
            'solved', (select count(*) from public.quest_claims c where c.user_id = p.id and c.status = 'approved'),
            'reports', (select count(*) from public.reports r where r.author_id = p.id))
          order by p.created_at desc), '[]'::json)
          from (select p.* from public.profiles p
                join auth.users u on u.id = p.id
                where v_q = ''
                   or p.nickname ilike '%' || v_q || '%'
                   or lower(u.email) = lower(v_q)
                   or p.id::text = v_q
                order by p.created_at desc limit 50) p
          join auth.users u on u.id = p.id);
end $$;

-- 포인트 더하기·빼기. 빼서 0 아래로는 내려가지 않습니다. 돌려주는 값은 바뀐 뒤 보유 포인트.
create or replace function public.admin_adjust_points(p_user_id uuid, p_delta int, p_reason text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_now int; v_applied int;
begin
  perform public.require_staff();
  if p_delta = 0 or abs(p_delta) > 100000 then raise exception 'INVALID_INPUT'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED'; end if;
  select points into v_now from public.profiles where id = p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  v_applied := greatest(p_delta, -v_now);
  update public.profiles set points = points + v_applied where id = p_user_id;
  insert into public.point_ledger (user_id, amount, reason) values (p_user_id, v_applied, 'staff_adjust');
  perform public.staff_log('points', 'user:' || p_user_id, jsonb_build_object('delta', v_applied, 'reason', btrim(p_reason)));
  return v_now + v_applied;
end $$;

-- 정지: p_days 일 동안 로그인 막기. 0 이면 정지 풀기. 운영진 계정은 정지할 수 없습니다.
create or replace function public.admin_ban_user(p_user_id uuid, p_days int, p_reason text default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz;
begin
  perform public.require_staff();
  if p_days < 0 or p_days > 3650 then raise exception 'INVALID_INPUT'; end if;
  if p_user_id = auth.uid() or exists (select 1 from public.staff_members where user_id = p_user_id) then raise exception 'CANNOT_BAN_STAFF'; end if;
  if p_days > 0 and char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED'; end if;
  v_until := case when p_days = 0 then null else now() + make_interval(days => p_days) end;
  update auth.users set banned_until = v_until where id = p_user_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public.staff_log('ban', 'user:' || p_user_id, jsonb_build_object('days', p_days, 'until', v_until, 'reason', p_reason));
  return v_until;
end $$;

-- ── 실행 권한 ────────────────────────────────
revoke execute on function public.is_staff(), public.require_staff(), public.staff_log(text, text, jsonb), public.mask_email(text)
  from public, anon, authenticated;
revoke execute on function public.admin_me(), public.admin_overview(), public.admin_quests(text),
  public.admin_review_quest(bigint, boolean, text), public.admin_claims(text), public.admin_review_claim(bigint, boolean, text),
  public.admin_reports(), public.admin_set_report(bigint, text), public.admin_users(text),
  public.admin_adjust_points(uuid, int, text), public.admin_ban_user(uuid, int, text)
  from public, anon;
grant execute on function public.admin_me(), public.admin_overview(), public.admin_quests(text),
  public.admin_review_quest(bigint, boolean, text), public.admin_claims(text), public.admin_review_claim(bigint, boolean, text),
  public.admin_reports(), public.admin_set_report(bigint, text), public.admin_users(text),
  public.admin_adjust_points(uuid, int, text), public.admin_ban_user(uuid, int, text)
  to authenticated;
