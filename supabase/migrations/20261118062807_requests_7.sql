-- 백엔드 요청 7번 (2026-11-16 한재준 결정): 의뢰 해결 구조 개편
-- 7-1 표본 확인 + 바로 지급 + 사후 이의 / 7-2 기본 포인트 + 하트 보너스 / 7-3 투표 답하면 소량 포인트 / 7-4 바로 치웠어요
-- 숫자는 전부 임시값이고 app_settings 에 있습니다.

alter table public.app_settings
  add column report_base_points int not null default 10,                  -- 7-2
  add column verify_trust_after int not null default 3,                   -- 7-1 승인 인증 3건 미만이면 표본
  add column verify_sample_rate numeric not null default 0.2,             -- 7-1 그 밖에는 20% 무작위 표본
  add column dispute_window interval not null default interval '48 hours', -- 7-1 바로 승인 뒤 이의 기간
  add column verify_near_m int not null default 3000,                     -- 7-1 무작위 이웃은 의뢰 3km 안 우선
  add column verify_answer_points int not null default 1,                 -- 7-3
  add column verify_answer_daily int not null default 5;                  -- 7-3 하루 5번까지
-- dispute_threshold(2) 는 기존 값 그대로: "아직이에요" 2건(제보자 답은 2건으로 셈)

alter table public.quest_claims
  add column dispute_until timestamptz,   -- 바로 승인된 인증의 이의 기간 끝
  add column disputed_at timestamptz;     -- 이의가 모여 운영진 검토로 넘어간 시각
alter table public.quest_claims drop constraint quest_claims_decided_by_check;
alter table public.quest_claims add constraint quest_claims_decided_by_check
  check (decided_by in ('auto','vote','partner','staff'));

-- 해결 확인 알림: 투표(vote) / 바로 승인 뒤 이의 받기(dispute)
alter table public.resolve_notices
  add column kind text not null default 'vote' check (kind in ('vote','dispute'));

alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in (
  'report_promoted','report_heart','heart_given','quest_approved','crew_quest',
  'shop_redeem','cosmetic_buy','feat_reward','seed',
  'claim_disputed','verify_answer','quick_clean'));

-- 7-4 바로 치웠어요 기록
create table public.self_cleans (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default '기타' check (category in ('빗물받이','버스정류장','공원','골목·거리','기타')),
  issue_type text not null default 'litter' check (issue_type in ('litter','dumping','bin','drain','graffiti')),
  before_photo_url text not null, before_lat double precision not null, before_lng double precision not null,
  before_accuracy_m real, before_taken_at timestamptz not null, before_photo_hash text not null,
  after_photo_url text not null, after_lat double precision not null, after_lng double precision not null,
  after_accuracy_m real, after_taken_at timestamptz not null, after_photo_hash text not null,
  xp_awarded int not null default 0,
  crew_xp_awarded int not null default 0,
  hidden_at timestamptz,                  -- 신고 처리 등으로 숨김
  created_at timestamptz not null default now()
);
create index self_cleans_user_idx on public.self_cleans (user_id, created_at desc);
create index self_cleans_hash_idx on public.self_cleans (before_photo_hash);
create index self_cleans_hash2_idx on public.self_cleans (after_photo_hash);
alter table public.self_cleans enable row level security;
revoke insert, update, delete, truncate on public.self_cleans from anon, authenticated;
create policy "own read" on public.self_cleans for select to authenticated using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- 7-2 해결 보상 = 기본 10점 + 하트 3개마다 5점 (상한 100)
-- ─────────────────────────────────────────────
create or replace function public.report_point_value(p_heart_count integer)
returns integer language sql stable security definer set search_path = '' as $$
  select least(s.report_base_points + (coalesce(p_heart_count, 0) / s.hearts_per_step) * s.points_per_heart,
               s.report_points_cap)
  from public.app_settings s
$$;

-- ─────────────────────────────────────────────
-- 하루 3개 상한: 의뢰 제출(확인 대기 포함) + 바로 치웠어요
-- ─────────────────────────────────────────────
create or replace function public.today_done_count(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.quest_claims c
          where c.user_id = p_user and c.status in ('submitted','staff_review','approved')
            and coalesce(c.submitted_at, c.approved_at) >= public.kst_today_start())
       + (select count(*)::int from public.self_cleans sc
          where sc.user_id = p_user and sc.created_at >= public.kst_today_start())
$$;

create or replace function public.my_daily_remaining()
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0, s.daily_claim_limit - public.today_done_count(auth.uid())) from public.app_settings s
$$;

-- ─────────────────────────────────────────────
-- 7-1 표본 판정
-- ─────────────────────────────────────────────

-- 두 사람이 최근 30일 안에 서로의 제보에 하트를 누르거나 해결한 적이 있나
create or replace function public.users_linked(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.report_hearts h join public.reports r on r.id = h.report_id
                 where h.created_at > now() - interval '30 days'
                   and ((h.user_id = p_a and r.author_id = p_b) or (h.user_id = p_b and r.author_id = p_a)))
      or exists (select 1 from public.quest_claims c join public.quests q on q.id = c.quest_id
                 left join public.reports r on r.id = q.report_id
                 where c.status in ('submitted','staff_review','approved')
                   and coalesce(c.submitted_at, c.approved_at) > now() - interval '30 days'
                   and ((c.user_id = p_a and coalesce(r.author_id, q.requester_id) = p_b)
                     or (c.user_id = p_b and coalesce(r.author_id, q.requester_id) = p_a)))
$$;

create or replace function public.claim_needs_sample(p_claim bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare c public.quest_claims; q public.quests; s public.app_settings; v_author uuid;
begin
  select * into c from public.quest_claims where id = p_claim;
  select * into q from public.quests where id = c.quest_id;
  select * into s from public.app_settings;
  -- ① 승인된 인증이 아직 적음
  if (select count(*) from public.quest_claims where user_id = c.user_id and status = 'approved') < s.verify_trust_after then
    return true;
  end if;
  -- ② 최근 30일 안에 반려·이의가 있었음
  if exists (select 1 from public.quest_claims x where x.user_id = c.user_id
             and ((x.status = 'rejected' and x.decided_at > now() - interval '30 days')
                  or x.disputed_at > now() - interval '30 days')) then
    return true;
  end if;
  -- ③ 해결자와 의뢰를 올린 사람이 서로 엮여 있음(계정 두 개 짬짜미)
  if q.kind = 'report' then
    select author_id into v_author from public.reports where id = q.report_id;
  else
    v_author := q.requester_id;
  end if;
  if v_author is not null and v_author <> c.user_id and public.users_linked(c.user_id, v_author) then
    return true;
  end if;
  -- ④ 무작위
  return random() < s.verify_sample_rate;
end $$;

-- 바로 승인된 인증: 제보자(크루는 올린 사람·크루장)와 하트 누른 사람에게 이의 받기 알림
-- weight 는 이의 셈: 제보자 2, 나머지 1
create or replace function public.create_dispute_notices(p_claim bigint)
returns int language plpgsql security definer set search_path = '' as $$
declare c public.quest_claims; q public.quests; v_author uuid; v_owner uuid; v_solver text; v_n int;
begin
  select * into c from public.quest_claims where id = p_claim;
  select * into q from public.quests where id = c.quest_id;
  select nickname into v_solver from public.profiles where id = c.user_id;
  if q.kind = 'report' then
    select author_id into v_author from public.reports where id = q.report_id;
  elsif q.kind = 'crew' then
    v_author := q.requester_id;
    select owner_id into v_owner from public.crews where id = q.crew_id;
  else
    return 0;
  end if;
  insert into public.resolve_notices (user_id, report_id, quest_id, claim_id, title, solver,
                                      before_path, after_path, single, role, weight, kind)
  select x.uid, q.report_id, q.id, c.id, q.title, coalesce(v_solver, ''),
         c.before_photo_url, c.after_photo_url, q.proof_mode = 'single', x.role, x.w, 'dispute'
  from (
    select v_author as uid, 'author' as role, 2::numeric as w where v_author is not null
    union all
    select v_owner, 'owner', 1 where v_owner is not null and v_owner is distinct from v_author
    union all
    select h.user_id, 'heart', 1 from public.report_hearts h
      where q.report_id is not null and h.report_id = q.report_id and h.user_id is distinct from v_author
  ) x
  where x.uid is not null and x.uid <> c.user_id
  on conflict (user_id, claim_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 이의가 모이면: 운영진 검토로 넘기고 지급한 포인트·XP·크루 XP 회수
create or replace function public.dispute_claim(p_claim bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.quest_claims; v_crew bigint; v_pts int; v_xp int;
begin
  select * into c from public.quest_claims where id = p_claim for update;
  if c.status <> 'approved' or c.dispute_until is null or c.disputed_at is not null then return; end if;
  update public.quest_claims set status = 'staff_review', disputed_at = now() where id = c.id;
  select crew_id into v_crew from public.point_ledger
    where user_id = c.user_id and quest_id = c.quest_id and reason in ('quest_approved','crew_quest')
    order by id desc limit 1;
  select least(points, c.points_awarded), least(xp, c.xp_awarded) into v_pts, v_xp
    from public.profiles where id = c.user_id for update;
  update public.profiles
    set points = points - v_pts, xp = xp - v_xp, total_earned = greatest(0, total_earned - c.points_awarded)
    where id = c.user_id;
  insert into public.point_ledger (user_id, amount, xp, crew_id, crew_score, reason, quest_id)
  values (c.user_id, -v_pts, -v_xp, v_crew, case when v_crew is null then 0 else -c.crew_xp_awarded end,
          'claim_disputed', c.quest_id);
  perform public.notify_staff(format('[집게표] 해결 이의 · 인증 #%s 지급 회수 후 운영진 검토', c.id));
end $$;

-- 결론 내기 ('auto' 추가, 반려되면 닫혔던 의뢰를 다시 엶)
create or replace function public.finalize_claim(p_claim bigint, p_ok boolean, p_by text, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare c public.quest_claims; q public.quests; v_crew bigint; v_approved int;
begin
  select * into c from public.quest_claims where id = p_claim for update;
  if c.id is null or c.status not in ('submitted','staff_review') then return c.status; end if;
  select * into q from public.quests where id = c.quest_id for update;

  if not p_ok then
    update public.quest_claims set status = 'rejected', decided_at = now(), decided_by = p_by,
                                   reject_reason = p_reason
      where id = c.id;
    if q.kind in ('report','crew') and q.status = 'done'
       and (select count(*) from public.quest_claims where quest_id = q.id and status = 'approved') < q.required_members
       and (q.expires_at is null or q.expires_at > now()) then
      update public.quests set status = 'open' where id = q.id;
    end if;
    return 'rejected';
  end if;

  update public.quest_claims set status = 'approved', approved_at = coalesce(approved_at, now()),
                                 decided_at = now(), decided_by = p_by
    where id = c.id;
  v_crew := public.credit_points(c.user_id, c.points_awarded, c.xp_awarded, c.crew_xp_awarded,
    case when q.kind = 'crew' then 'crew_quest' else 'quest_approved' end, q.id, q.report_id);
  if v_crew is not null and c.disputed_at is null then
    perform public.crew_event(v_crew, 'complete', c.user_id, q.id, q.title, c.crew_xp_awarded, c.points_awarded,
                              q.kind = 'crew' or q.required_members > 1);
  end if;
  if q.kind in ('report','crew') then
    select count(*) into v_approved from public.quest_claims where quest_id = q.id and status = 'approved';
    if v_approved >= q.required_members then
      update public.quests set status = 'done' where id = q.id and status = 'open';
      update public.quest_claims set status = 'cancelled' where quest_id = q.id and status = 'accepted';
    end if;
  end if;
  return 'approved';
end $$;

-- 해결 확인 답하기: 투표면 집계 + 7-3 소량 포인트, 이의 받기면 이의 셈
create or replace function public.answer_notice(p_notice_id bigint, p_answer text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); n public.resolve_notices; v_status text; c public.quest_claims;
        v_not numeric; s public.app_settings; v_paid int := 0;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_answer not in ('ok','not') then raise exception 'INVALID_INPUT'; end if;
  update public.resolve_notices set answer = p_answer, answered_at = now()
    where id = p_notice_id and user_id = v_uid and answer is null
    returning * into n;
  if n.id is null then raise exception 'NOTICE_NOT_FOUND'; end if;
  select * into s from public.app_settings;
  if n.claim_id is null then return json_build_object('id', n.id, 'answer', n.answer); end if;
  perform pg_advisory_xact_lock(hashtext('verify:' || n.claim_id::text));

  if n.kind = 'vote' then
    -- 7-3 확인해 준 사람에게 1점 (하루 5번까지)
    if s.verify_answer_points > 0
       and (select count(*) from public.point_ledger where user_id = v_uid and reason = 'verify_answer'
            and created_at >= public.kst_today_start()) < s.verify_answer_daily then
      perform public.credit_points(v_uid, s.verify_answer_points, 0, 0, 'verify_answer', n.quest_id, n.report_id);
      v_paid := s.verify_answer_points;
    end if;
    v_status := public.evaluate_claim(n.claim_id);
  else
    select * into c from public.quest_claims where id = n.claim_id;
    v_status := c.status;
    if p_answer = 'not' and c.status = 'approved' and c.dispute_until > now() then
      select coalesce(sum(weight), 0) into v_not from public.resolve_notices
        where claim_id = n.claim_id and kind = 'dispute' and answer = 'not';
      if v_not >= s.dispute_threshold then
        perform public.dispute_claim(n.claim_id);
        v_status := 'staff_review';
      end if;
    end if;
  end if;
  return json_build_object('id', n.id, 'answer', n.answer, 'claim_status', v_status, 'points_gained', v_paid);
end $$;

create or replace function public.my_notices()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
           'id', n.id, 'kind', n.kind, 'claim_id', n.claim_id, 'report_id', n.report_id, 'quest_id', n.quest_id,
           'title', n.title, 'solver', n.solver,
           'before_path', n.before_path, 'after_path', n.after_path, 'single', n.single,
           'role', n.role, 'weight', case when n.kind = 'vote' then round(n.weight, 1) end,
           'claim_status', c.status,
           'can_dispute', n.kind = 'dispute' and n.answer is null and c.status = 'approved' and c.dispute_until > now(),
           'dispute_until', case when n.kind = 'dispute' then c.dispute_until end,
           'at', n.created_at, 'answer', n.answer, 'answered_at', n.answered_at)
         order by n.created_at desc, n.id desc), '[]'::json)
  from public.resolve_notices n left join public.quest_claims c on c.id = n.claim_id
  where n.user_id = auth.uid()
$$;

-- 진행 중인 내 의뢰: 이의 기간 중인 승인 건도 dispute_until 과 함께
drop function if exists public.my_claims();
create or replace function public.my_claims()
returns table (claim_id bigint, quest_id bigint, title text, kind text, status text,
               accepted_at timestamptz, deadline_at timestamptz, submitted_at timestamptz, verify_deadline timestamptz,
               dispute_until timestamptz,
               ok_percent numeric, voters int, answered int, reject_reason text,
               points_pending int, xp_pending int, lat double precision, lng double precision, address text)
language sql stable security definer set search_path = '' as $$
  select c.id, q.id, q.title, q.kind, c.status, c.accepted_at,
         c.accepted_at + s.claim_time_limit,
         c.submitted_at,
         case when c.status = 'submitted' and q.kind in ('report','crew') then c.submitted_at + s.verify_timeout end,
         case when c.status = 'approved' then c.dispute_until end,
         (select round(coalesce(sum(n.weight) filter (where n.answer = 'ok'), 0), 1)
            from public.resolve_notices n where n.claim_id = c.id and n.kind = 'vote'),
         (select count(*)::int from public.resolve_notices n where n.claim_id = c.id and n.kind = 'vote'),
         (select count(*)::int from public.resolve_notices n where n.claim_id = c.id and n.kind = 'vote' and n.answer is not null),
         c.reject_reason, c.points_awarded, c.xp_awarded,
         q.lat, q.lng, q.address
  from public.quest_claims c join public.quests q on q.id = c.quest_id cross join public.app_settings s
  where c.user_id = auth.uid()
    and (c.status in ('accepted','submitted','staff_review')
         or (c.status = 'rejected' and c.decided_at > now() - interval '3 days')
         or (c.status = 'approved' and c.dispute_until > now()))
  order by coalesce(c.submitted_at, c.accepted_at) desc
$$;

-- ─────────────────────────────────────────────
-- 7-4 바로 치웠어요
-- ─────────────────────────────────────────────
create or replace function public.quick_clean(
  p_category text, p_issue_type text, p_title text,
  p_before_photo_url text, p_before_lat double precision, p_before_lng double precision,
  p_before_accuracy_m real, p_before_taken_at timestamptz, p_before_photo_hash text,
  p_after_photo_url text, p_after_lat double precision, p_after_lng double precision,
  p_after_accuracy_m real, p_after_taken_at timestamptz, p_after_photo_hash text,
  p_mocked boolean default false, p_before_thumb text default null, p_after_thumb text default null
) returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); s public.app_settings;
  v_cat text; v_issue text; v_title text; v_before_up timestamptz; v_after_up timestamptz;
  v_diff numeric; v_xp int; v_crew bigint; v_crew_xp int := 0; v_old int; v_new int; v_id bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.require_member();
  perform pg_advisory_xact_lock(hashtext('claim:' || v_uid::text));
  select * into s from public.app_settings;

  if public.my_daily_remaining() <= 0 then raise exception 'DAILY_LIMIT'; end if;
  if coalesce(p_mocked, false) then raise exception 'MOCK_LOCATION'; end if;
  if p_before_photo_url is null or p_before_lat is null or p_before_lng is null or p_before_taken_at is null
     or p_before_photo_hash is null or p_after_photo_url is null or p_after_lat is null or p_after_lng is null
     or p_after_taken_at is null or p_after_photo_hash is null then
    raise exception 'MISSING_PROOF';
  end if;
  v_cat := case when p_category in ('빗물받이','버스정류장','공원','골목·거리','기타') then p_category else '기타' end;
  v_issue := case when p_issue_type in ('litter','dumping','bin','drain','graffiti') then p_issue_type else 'litter' end;
  v_title := coalesce(nullif(btrim(coalesce(p_title, '')), ''), v_cat || ' 바로 치움');
  if char_length(v_title) > 60 then v_title := left(v_title, 60); end if;

  v_before_up := public.own_upload_at('claim-photos', p_before_photo_url, v_uid);
  v_after_up := public.own_upload_at('claim-photos', p_after_photo_url, v_uid);
  if v_before_up is null or v_after_up is null then raise exception 'INVALID_PHOTO'; end if;

  -- 시각: 최근 3시간 안에 찍고 올린 사진, 전 → 후 순서, 미래 불가
  if p_before_taken_at < now() - interval '3 hours' or v_before_up < now() - interval '3 hours'
     or p_after_taken_at < p_before_taken_at
     or p_before_taken_at > now() + interval '5 minutes' or p_after_taken_at > now() + interval '5 minutes' then
    raise exception 'INVALID_TIME';
  end if;
  if v_after_up - v_before_up < s.proof_min_gap or p_after_taken_at - p_before_taken_at < s.proof_min_gap then
    raise exception 'TOO_FAST';
  end if;
  if extensions.st_distance(
       extensions.st_setsrid(extensions.st_makepoint(p_before_lng, p_before_lat), 4326)::extensions.geography,
       extensions.st_setsrid(extensions.st_makepoint(p_after_lng, p_after_lat), 4326)::extensions.geography) > s.claim_radius_m then
    raise exception 'PHOTOS_TOO_FAR_APART';
  end if;
  if p_before_photo_hash = p_after_photo_hash
     or exists (select 1 from public.quest_claims x
                where x.before_photo_hash in (p_before_photo_hash, p_after_photo_hash)
                   or x.after_photo_hash in (p_before_photo_hash, p_after_photo_hash))
     or exists (select 1 from public.self_cleans x
                where x.before_photo_hash in (p_before_photo_hash, p_after_photo_hash)
                   or x.after_photo_hash in (p_before_photo_hash, p_after_photo_hash)) then
    raise exception 'DUPLICATE_PHOTO';
  end if;
  v_diff := public.thumb_diff(p_before_thumb, p_after_thumb);
  if v_diff is not null and v_diff < 4 then raise exception 'NO_CHANGE'; end if;

  -- 포인트 없음, XP 만. 크루원이면 크루 XP 1배
  v_xp := public.category_xp(v_cat);
  select crew_id into v_crew from public.crew_members where user_id = v_uid;
  if v_crew is not null then v_crew_xp := v_xp; end if;
  select public.level_of(xp) into v_old from public.profiles where id = v_uid;

  insert into public.self_cleans (user_id, title, category, issue_type,
    before_photo_url, before_lat, before_lng, before_accuracy_m, before_taken_at, before_photo_hash,
    after_photo_url, after_lat, after_lng, after_accuracy_m, after_taken_at, after_photo_hash,
    xp_awarded, crew_xp_awarded)
  values (v_uid, v_title, v_cat, v_issue,
    p_before_photo_url, p_before_lat, p_before_lng, p_before_accuracy_m, p_before_taken_at, p_before_photo_hash,
    p_after_photo_url, p_after_lat, p_after_lng, p_after_accuracy_m, p_after_taken_at, p_after_photo_hash,
    v_xp, v_crew_xp)
  returning id into v_id;
  perform public.credit_points(v_uid, 0, v_xp, v_crew_xp, 'quick_clean');
  if v_crew is not null then
    perform public.crew_event(v_crew, 'complete', v_uid, null, v_title, v_crew_xp, 0, false);
  end if;
  select public.level_of(xp) into v_new from public.profiles where id = v_uid;
  return json_build_object('id', v_id, 'title', v_title, 'xp_gained', v_xp, 'crew_xp_gained', v_crew_xp,
                           'level', v_new, 'leveled_up', v_new > v_old, 'daily_remaining', public.my_daily_remaining());
end $$;

-- 도전과제 집계: 바로 치웠어요도 completed·places·issues 에 셈
create or replace function public.user_stats(p_user uuid)
returns json language sql stable security definer set search_path = '' as $$
  with done as (
    select q.category, q.issue_type
    from public.quest_claims c join public.quests q on q.id = c.quest_id
    where c.user_id = p_user and c.status = 'approved'
    union all
    select sc.category, sc.issue_type from public.self_cleans sc where sc.user_id = p_user and sc.hidden_at is null
  )
  select json_build_object(
    'completed', (select count(*) from done),
    'hearts', (select count(*) from public.report_hearts where user_id = p_user),
    'reports', (select count(*) from public.reports where author_id = p_user),
    'rewards', (select count(*) from public.quest_claims where user_id = p_user and status = 'approved' and reward_label is not null),
    'places', coalesce((select json_object_agg(k, n) from (select public.category_place(category) k, count(*) n from done group by 1) x), '{}'::json),
    'issues', coalesce((select json_object_agg(k, n) from (select issue_type k, count(*) n from done where issue_type is not null group by 1) x), '{}'::json))
$$;

-- 내가 치운 곳 전체 기록: 바로 치웠어요 포함, self 표시
drop function if exists public.my_cleaned(int, timestamptz);
create or replace function public.my_cleaned(p_limit int default 10, p_before timestamptz default null)
returns table (id text, at timestamptz, title text, place_label text, issue_type text, kind text, self boolean,
               points int, xp int, lat double precision, lng double precision, address text)
language sql stable security definer set search_path = '' as $$
  select * from (
    select q.id::text, c.approved_at, q.title, q.category, q.issue_type, q.kind, false,
           c.points_awarded, c.xp_awarded, q.lat, q.lng, q.address
    from public.quest_claims c join public.quests q on q.id = c.quest_id
    where c.user_id = auth.uid() and c.status = 'approved'
    union all
    select 'self-' || sc.id, sc.created_at, sc.title, sc.category, sc.issue_type, 'self', true,
           0, sc.xp_awarded, sc.after_lat, sc.after_lng, null
    from public.self_cleans sc where sc.user_id = auth.uid() and sc.hidden_at is null
  ) u
  where p_before is null or u.approved_at < p_before
  order by u.approved_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

-- 지도: 바로 치웠어요도 cleared 점으로
create or replace function public.map_overview(p_lat double precision, p_lng double precision, p_radius_m integer default 1500)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_my_crew bigint; v_done int; v_open int; v_crew_spots int; v_new int;
begin
  select crew_id into v_my_crew from public.crew_members where user_id = auth.uid();

  select count(*) into v_done from (
    select 1 from public.quest_claims c join public.quests q on q.id = c.quest_id
      where c.status = 'approved' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m)
    union all
    select 1 from public.self_cleans sc
      where sc.hidden_at is null and extensions.st_dwithin(
        extensions.st_setsrid(extensions.st_makepoint(sc.after_lng, sc.after_lat), 4326)::extensions.geography, v_pt, p_radius_m)) d;
  select count(*) into v_open from public.quests q
    where q.status = 'open' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m);
  select count(*) into v_crew_spots from public.quest_claims c
    join public.quests q on q.id = c.quest_id
    join public.crew_members m on m.user_id = c.user_id
    where c.status = 'approved' and m.crew_id = v_my_crew
      and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m);
  select count(*) into v_new from public.reports r
    where r.created_at >= now() - interval '7 days' and r.hidden_at is null
      and extensions.st_dwithin(r.location, v_pt, p_radius_m);

  return json_build_object(
    'stats', json_build_array(
      json_build_array(case when v_done + v_open = 0 then 0 else round(100.0 * v_done / (v_done + v_open)) end || '%', '우리 동네 정화율'),
      json_build_array(v_crew_spots::text, '우리 크루 구역'),
      json_build_array(v_new::text, '새 제보')),
    'points', coalesce((
      select json_agg(x) from (
        select 'cleared' as type, q.lat, q.lng,
               case when m.crew_id is null then 'none' when m.crew_id = v_my_crew then 'mine' else 'other' end as crew
        from public.quest_claims c join public.quests q on q.id = c.quest_id
        left join public.crew_members m on m.user_id = c.user_id
        where c.status = 'approved' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m)
        union all
        select 'cleared', sc.after_lat, sc.after_lng,
               case when m.crew_id is null then 'none' when m.crew_id = v_my_crew then 'mine' else 'other' end
        from public.self_cleans sc left join public.crew_members m on m.user_id = sc.user_id
        where sc.hidden_at is null and extensions.st_dwithin(
          extensions.st_setsrid(extensions.st_makepoint(sc.after_lng, sc.after_lat), 4326)::extensions.geography, v_pt, p_radius_m)
        union all
        select 'quest', q.lat, q.lng, null from public.quests q
        where q.status = 'open' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m)
      ) x), '[]'::json));
end $$;


-- 7-1 무작위 이웃: 의뢰 3km 안에서 최근 활동한 사람 우선
create or replace function public.create_claim_votes(p_claim bigint)
returns int language plpgsql security definer set search_path = '' as $$
declare
  c public.quest_claims; q public.quests; s public.app_settings;
  v_author uuid; v_owner uuid; v_hearts uuid[] := '{}'; v_random uuid[] := '{}';
  w_a numeric := 0; w_h numeric := 0; w_r numeric := 0; w_o numeric := 0;
  v_solver text; v_report bigint; v_n int;
begin
  select * into c from public.quest_claims where id = p_claim;
  select * into q from public.quests where id = c.quest_id;
  select * into s from public.app_settings;
  select nickname into v_solver from public.profiles where id = c.user_id;

  if q.kind = 'report' then
    v_report := q.report_id;
    select author_id into v_author from public.reports where id = q.report_id;
    if v_author = c.user_id then v_author := null; end if;
    select coalesce(array_agg(h.user_id), '{}') into v_hearts from public.report_hearts h
      where h.report_id = q.report_id and h.user_id <> c.user_id and h.user_id is distinct from v_author;
    select coalesce(array_agg(x.id), '{}') into v_random from (
      select p.id from public.profiles p join auth.users u on u.id = p.id
      where p.id <> c.user_id and p.id is distinct from v_author and not (p.id = any(v_hearts))
        and not coalesce(u.is_anonymous, false)
        and coalesce(u.last_sign_in_at, u.created_at) > now() - interval '30 days'
        and public.has_required_consent(p.id)
      -- 7-1: 의뢰 위치 3km 안에서 최근 30일 안에 제보·인증한 사람 우선, 모자라면 전체에서
      order by (q.location is not null and (
                 exists (select 1 from public.reports rr where rr.author_id = p.id
                           and rr.created_at > now() - interval '30 days'
                           and extensions.st_dwithin(rr.location, q.location, s.verify_near_m))
                 or exists (select 1 from public.quest_claims cc where cc.user_id = p.id
                           and cc.submitted_at > now() - interval '30 days' and cc.before_lat is not null
                           and extensions.st_dwithin(
                                 extensions.st_setsrid(extensions.st_makepoint(cc.before_lng, cc.before_lat), 4326)::extensions.geography,
                                 q.location, s.verify_near_m)))) desc,
               random()
      limit s.verify_random_count) x;
    w_a := case when v_author is null then 0 else s.verify_w_author end;
    w_h := case when cardinality(v_hearts) = 0 then 0 else s.verify_w_heart end;
    w_r := case when cardinality(v_random) = 0 then 0 else s.verify_w_random end;
  elsif q.kind = 'crew' then
    v_author := q.requester_id;
    select owner_id into v_owner from public.crews where id = q.crew_id;
    if v_owner = v_author then v_owner := null; end if;
    if v_author = c.user_id then v_author := null; end if;
    if v_owner = c.user_id then v_owner := null; end if;
    -- 크루장·올린 사람 중 한 명만 남으면 그 사람이 판단(100%)
    w_a := case when v_author is null then 0 when v_owner is null then 100 else 50 end;
    w_o := case when v_owner is null then 0 when v_author is null then 100 else 50 end;
  else
    return 0;
  end if;

  if w_a + w_h + w_r + w_o < s.verify_threshold then return 0; end if;

  insert into public.resolve_notices (user_id, report_id, quest_id, claim_id, title, solver,
                                      before_path, after_path, single, role, weight)
  select x.uid, v_report, q.id, c.id, q.title, coalesce(v_solver, ''),
         c.before_photo_url, c.after_photo_url, q.proof_mode = 'single', x.role, x.w
  from (
    select v_author as uid, 'author' as role, w_a as w where v_author is not null
    union all
    select v_owner, 'owner', w_o where v_owner is not null
    union all
    select h, 'heart', w_h / nullif(cardinality(v_hearts), 0) from unnest(v_hearts) h
    union all
    select r, 'random', w_r / nullif(cardinality(v_random), 0) from unnest(v_random) r
  ) x
  on conflict (user_id, claim_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;


-- 7-1 인증 제출: 표본이면 투표, 아니면 바로 지급 + 이의 기간
create or replace function public.approve_claim(
  p_claim_id bigint,
  p_before_photo_url text, p_before_lat double precision, p_before_lng double precision,
  p_before_accuracy_m real, p_before_taken_at timestamptz, p_before_photo_hash text,
  p_after_photo_url text default null, p_after_lat double precision default null, p_after_lng double precision default null,
  p_after_accuracy_m real default null, p_after_taken_at timestamptz default null, p_after_photo_hash text default null,
  p_mocked boolean default false,
  p_before_thumb text default null, p_after_thumb text default null
) returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.app_settings; c public.quest_claims; q public.quests;
  v_single boolean;
  v_before extensions.geography; v_after extensions.geography;
  v_before_up timestamptz; v_after_up timestamptz;
  v_count int; v_diff numeric;
  v_points int := 0; v_xp int; v_crew_xp int := 0; v_crew bigint; v_crewish boolean;
  v_status text := 'submitted'; v_voters int := 0; v_old_level int; p public.profiles; v_until timestamptz;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform pg_advisory_xact_lock(hashtext('claim:' || v_uid::text));

  select * into s from public.app_settings;
  select * into c from public.quest_claims where id = p_claim_id and user_id = v_uid for update;
  if not found then raise exception 'CLAIM_NOT_FOUND'; end if;
  if c.status <> 'accepted' then raise exception 'CLAIM_NOT_ACTIVE'; end if;
  if c.accepted_at + s.claim_time_limit < now() then
    update public.quest_claims set status = 'expired' where id = c.id;
    raise exception 'CLAIM_EXPIRED';
  end if;
  select * into q from public.quests where id = c.quest_id for update;
  if q.status <> 'open' then raise exception 'QUEST_CLOSED'; end if;
  v_single := q.proof_mode = 'single';

  if public.my_daily_remaining() <= 0 then raise exception 'DAILY_LIMIT'; end if;

  if q.kind in ('report','crew') and q.required_members > 1 then
    select count(*) into v_count from public.quest_claims
      where quest_id = q.id and status in ('accepted','submitted','staff_review','approved');
    if v_count < q.required_members then raise exception 'REPORT_NOT_IN_PROGRESS'; end if;
  end if;

  if coalesce(p_mocked, false) then raise exception 'MOCK_LOCATION'; end if;
  if p_before_photo_url is null or p_before_lat is null or p_before_lng is null
     or p_before_taken_at is null or p_before_photo_hash is null then
    raise exception 'MISSING_PROOF';
  end if;
  if not v_single and (p_after_photo_url is null or p_after_lat is null or p_after_lng is null
                       or p_after_taken_at is null or p_after_photo_hash is null) then
    raise exception 'MISSING_PROOF';
  end if;

  v_before_up := public.own_upload_at('claim-photos', p_before_photo_url, v_uid);
  if v_before_up is null then raise exception 'INVALID_PHOTO'; end if;
  if not v_single then
    v_after_up := public.own_upload_at('claim-photos', p_after_photo_url, v_uid);
    if v_after_up is null then raise exception 'INVALID_PHOTO'; end if;
  end if;

  if p_before_taken_at < c.accepted_at - interval '5 minutes'
     or v_before_up < c.accepted_at
     or p_before_taken_at > now() + interval '5 minutes'
     or (not v_single and (p_after_taken_at < p_before_taken_at or p_after_taken_at > now() + interval '5 minutes')) then
    raise exception 'INVALID_TIME';
  end if;

  if not v_single and (v_after_up - v_before_up < s.proof_min_gap
                       or p_after_taken_at - p_before_taken_at < s.proof_min_gap) then
    raise exception 'TOO_FAST';
  end if;

  v_before := extensions.st_setsrid(extensions.st_makepoint(p_before_lng, p_before_lat), 4326)::extensions.geography;
  if q.location is not null and extensions.st_distance(q.location, v_before) > s.claim_radius_m then
    raise exception 'TOO_FAR';
  end if;
  if not v_single then
    v_after := extensions.st_setsrid(extensions.st_makepoint(p_after_lng, p_after_lat), 4326)::extensions.geography;
    if q.location is not null and extensions.st_distance(q.location, v_after) > s.claim_radius_m then
      raise exception 'TOO_FAR';
    end if;
    if extensions.st_distance(v_before, v_after) > s.claim_radius_m then
      raise exception 'PHOTOS_TOO_FAR_APART';
    end if;
  end if;

  if (not v_single and p_before_photo_hash = p_after_photo_hash)
     or exists (select 1 from public.quest_claims x
                where x.id <> c.id
                  and (x.before_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash))
                       or x.after_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash))))
     or exists (select 1 from public.self_cleans x
                where x.before_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash))
                   or x.after_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash))) then
    raise exception 'DUPLICATE_PHOTO';
  end if;

  if not v_single then
    v_diff := public.thumb_diff(p_before_thumb, p_after_thumb);
    if v_diff is not null and v_diff < 4 then raise exception 'NO_CHANGE'; end if;
  end if;

  -- 받을 보상 계산 (확인되면 지급)
  if q.kind = 'report' then
    select public.report_point_value(r.heart_count) into v_points from public.reports r where r.id = q.report_id;
  else
    v_points := q.reward_points;
  end if;
  v_xp := public.category_xp(q.category);
  v_crewish := q.kind = 'crew' or q.required_members > 1;
  select crew_id into v_crew from public.crew_members where user_id = v_uid;
  if v_crew is not null then
    v_crew_xp := v_xp * case when v_crewish then s.crew_quest_xp_multiplier else 1 end;
  end if;

  update public.quest_claims set
    status = 'submitted', submitted_at = now(),
    before_photo_url = p_before_photo_url, before_lat = p_before_lat, before_lng = p_before_lng,
    before_accuracy_m = p_before_accuracy_m, before_taken_at = p_before_taken_at, before_photo_hash = p_before_photo_hash,
    after_photo_url = p_after_photo_url, after_lat = p_after_lat, after_lng = p_after_lng,
    after_accuracy_m = p_after_accuracy_m, after_taken_at = p_after_taken_at, after_photo_hash = p_after_photo_hash,
    points_awarded = v_points, xp_awarded = v_xp, crew_xp_awarded = v_crew_xp,
    reward_label = q.reward_label
  where id = c.id;

  -- 누가 확인하나
  select public.level_of(xp) into v_old_level from public.profiles where id = v_uid;

  -- 누가 확인하나 (7-1): 제휴는 업체. 주민 제보·크루는 표본만 투표, 나머지는 바로 지급 + 이의 기간
  if q.kind = 'partner' then
    if not exists (select 1 from public.partner_members m where m.partner_id = q.partner_id) then
      perform public.to_staff_review(c.id, '업체 계정 없음');
      v_status := 'staff_review';
    end if;
  elsif public.claim_needs_sample(c.id) then
    v_voters := public.create_claim_votes(c.id);
    if v_voters = 0 then
      perform public.to_staff_review(c.id, '확인할 이웃 없음');
      v_status := 'staff_review';
    end if;
  else
    v_status := public.finalize_claim(c.id, true, 'auto');
    v_until := now() + s.dispute_window;
    update public.quest_claims set dispute_until = v_until where id = c.id;
    perform public.create_dispute_notices(c.id);
  end if;

  if v_status = 'approved' then
    select * into p from public.profiles where id = v_uid;
    return json_build_object(
      'status', 'approved', 'title', q.title,
      'points_gained', v_points, 'xp_gained', v_xp, 'crew_xp_gained', v_crew_xp,
      'reward_label', q.reward_label,
      'points', p.points, 'xp', p.xp, 'level', public.level_of(p.xp), 'leveled_up', public.level_of(p.xp) > v_old_level,
      'dispute_until', v_until,
      'daily_remaining', public.my_daily_remaining());
  end if;
  return json_build_object(
    'status', v_status, 'title', q.title,
    'points_pending', v_points, 'xp_pending', v_xp, 'crew_xp_pending', v_crew_xp,
    'reward_label', q.reward_label, 'voters', v_voters,
    'verify_deadline', case when q.kind = 'partner' then null else now() + s.verify_timeout end,
    'daily_remaining', public.my_daily_remaining());
end $$;


-- 내 정보: 오늘 완료 수에 바로 치웠어요 포함, cleaned 에 self 기록
create or replace function public.my_profile()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); p public.profiles; s public.app_settings;
  v_level int; v_completed int; v_hearts int; v_dones int; v_crew text; v_look json; v_week date;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  select * into s from public.app_settings;
  v_level := public.level_of(p.xp);
  v_week := date_trunc('week', now() at time zone 'Asia/Seoul')::date;
  select count(*) into v_completed from public.quest_claims where user_id = v_uid and status = 'approved';
  v_dones := public.today_done_count(v_uid);
  select count(*) into v_hearts from public.report_hearts
    where user_id = v_uid and created_at >= public.kst_today_start();
  select c.name into v_crew from public.crew_members m join public.crews c on c.id = m.crew_id where m.user_id = v_uid;
  v_look := public.look_of(p.frame_id, p.name_color_id);

  return json_build_object(
    'id', p.id, 'nickname', p.nickname, 'initial', left(p.nickname, 1),
    'avatar_url', p.avatar_url, 'home_area', p.home_area, 'title_key', p.title_key,
    'frame', v_look -> 'frame', 'name_color', v_look ->> 'name_color',
    'joined_days', ((now() at time zone 'Asia/Seoul')::date - (p.created_at at time zone 'Asia/Seoul')::date) + 1,
    'points', p.points, 'total_earned', p.total_earned,
    'xp', p.xp, 'level', v_level,
    'xp_in_level', p.xp % s.xp_per_level, 'xp_for_next_level', s.xp_per_level,
    'crew', v_crew,
    'hearts_today', v_hearts, 'hearts_limit', s.heart_daily_limit,
    'completes_today', v_dones, 'completes_limit', s.daily_claim_limit,
    'daily_remaining', greatest(0, s.daily_claim_limit - v_dones),
    'pending_count', (select count(*) from public.quest_claims where user_id = v_uid and status in ('submitted','staff_review')),
    'completed_count', v_completed,
    'streak_weeks', public.streak_weeks(v_uid),
    'active_this_week', exists (select 1 from public.quest_claims where user_id = v_uid and status = 'approved'
                                and approved_at >= v_week::timestamp at time zone 'Asia/Seoul'),
    'weekly', (select json_agg(coalesce(x.n, 0) order by w.i) from generate_series(0, 7) w(i)
               left join (select date_trunc('week', approved_at at time zone 'Asia/Seoul')::date as wk, count(*) as n
                          from public.quest_claims where user_id = v_uid and status = 'approved'
                            and approved_at >= (v_week - 49)::timestamp at time zone 'Asia/Seoul'
                          group by 1) x on x.wk = v_week - (7 - w.i) * 7),
    'stats', public.user_stats(v_uid),
    'feats_claimed', coalesce((select json_agg(feat_id order by claimed_at) from public.user_feats where user_id = v_uid), '[]'::json),
    -- 7-4: '바로 치웠어요' 기록도 self: true 와 위치로 함께 (id 는 'self-번호')
    'cleaned', coalesce((select json_agg(x order by x.at desc) from (
        select * from (
          select q.id::text as id, c.approved_at as at, q.title, q.category as place_label, q.issue_type,
                 false as self, q.lat, q.lng
          from public.quest_claims c join public.quests q on q.id = c.quest_id
          where c.user_id = v_uid and c.status = 'approved'
          union all
          select 'self-' || sc.id, sc.created_at, sc.title, sc.category, sc.issue_type, true, sc.after_lat, sc.after_lng
          from public.self_cleans sc where sc.user_id = v_uid and sc.hidden_at is null
        ) u order by u.at desc limit 10) x), '[]'::json),
    'rewards', coalesce((select json_agg(x) from (
        select c.reward_label as label, q.org_name as "from", c.approved_at as at
        from public.quest_claims c join public.quests q on q.id = c.quest_id
        where c.user_id = v_uid and c.status = 'approved' and c.reward_label is not null
        order by c.approved_at desc) x), '[]'::json),
    'coupons', coalesce((select json_agg(x) from (
        select name, code, created_at as at from public.coupons where user_id = v_uid order by created_at desc) x), '[]'::json),
    'records', json_build_array(
      json_build_array('완료한 의뢰', v_completed || '건'),
      json_build_array('올린 제보', (select count(*) from public.reports where author_id = v_uid) || '건'),
      json_build_array('누적 포인트', p.total_earned || '점')));
end $$;


-- ─────────────────────────────────────────────
-- 실행 권한
-- ─────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.quests_nearby(double precision, double precision, int, text) to anon, authenticated;
grant execute on function public.reports_nearby(double precision, double precision, int) to anon, authenticated;
grant execute on function public.area_stats(double precision, double precision, int) to anon, authenticated;
grant execute on function public.map_overview(double precision, double precision, int) to anon, authenticated;
grant execute on function public.current_season() to anon, authenticated;
grant execute on function public.crew_ranking() to anon, authenticated;
grant execute on function public.crews_to_join() to anon, authenticated;
grant execute on function public.cosmetics_list() to anon, authenticated;
grant execute on function public.accept_quest(bigint) to authenticated;
grant execute on function public.cancel_claim(bigint) to authenticated;
grant execute on function public.my_daily_remaining() to authenticated;
grant execute on function public.approve_claim(bigint, text, double precision, double precision, real, timestamptz, text,
                                               text, double precision, double precision, real, timestamptz, text, boolean,
                                               text, text) to authenticated;
grant execute on function public.my_claims() to authenticated;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.my_cleaned(int, timestamptz) to authenticated;
grant execute on function public.quick_clean(text, text, text, text, double precision, double precision, real, timestamptz, text,
                                            text, double precision, double precision, real, timestamptz, text, boolean, text, text) to authenticated;
grant execute on function public.my_crew() to authenticated;
grant execute on function public.give_heart(bigint) to authenticated;
grant execute on function public.create_crew(text, text) to authenticated;
grant execute on function public.join_crew(bigint) to authenticated;
grant execute on function public.leave_crew() to authenticated;
grant execute on function public.redeem_item(bigint) to authenticated;
grant execute on function public.buy_cosmetic(text) to authenticated;
grant execute on function public.equip_cosmetic(text) to authenticated;
grant execute on function public.partner_me() to authenticated;
grant execute on function public.partner_register(text, text) to authenticated;
grant execute on function public.partner_quests() to authenticated;
grant execute on function public.partner_create_quest(text, text, text, text, text, text, text, int, int, date, date,
                                                      double precision, double precision) to authenticated;
grant execute on function public.partner_cancel_quest(bigint) to authenticated;
grant execute on function public.partner_report() to authenticated;
grant execute on function public.partner_claims() to authenticated;
grant execute on function public.partner_review_claim(bigint, boolean, text) to authenticated;
grant execute on function public.save_consent(jsonb, text) to authenticated;
grant execute on function public.my_consent() to authenticated;
grant execute on function public.set_mark(bigint, text) to authenticated;
grant execute on function public.my_notices() to authenticated;
grant execute on function public.answer_notice(bigint, text) to authenticated;
grant execute on function public.flag_report(bigint, text) to authenticated;
grant execute on function public.flag_avatar(uuid, text) to authenticated;
grant execute on function public.set_title(text) to authenticated;
grant execute on function public.claim_feat(text) to authenticated;
