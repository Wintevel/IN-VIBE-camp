-- 줍퀘스트 서버 로직: 승격·포인트·인증 판정은 전부 여기서 결정

-- ─────────────────────────────────────────────
-- 공통 도우미 (외부 호출 불가)
-- ─────────────────────────────────────────────
create or replace function public.kst_today_start()
returns timestamptz language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul'
$$;

create or replace function public.dist_label(d double precision)
returns text language sql immutable set search_path = '' as $$
  select case when d is null then null
              when d < 1000 then round(d)::int || 'm'
              else to_char(d / 1000.0, 'FM990.0') || 'km' end
$$;

create or replace function public.report_point_value(p_heart_count int)
returns int language sql stable security definer set search_path = '' as $$
  select least(p_heart_count * s.points_per_heart, s.report_points_cap) from public.app_settings s
$$;

-- 포인트 적립 (원장 + 합계 캐시 + 크루 점수)
create or replace function public.credit_points(
  p_user uuid, p_amount int, p_reason text,
  p_quest bigint default null, p_report bigint default null, p_crew_score int default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_crew bigint;
begin
  if p_user is null then return; end if;
  select crew_id into v_crew from public.crew_members where user_id = p_user;
  insert into public.point_ledger (user_id, amount, crew_id, crew_score, reason, quest_id, report_id)
  values (p_user, p_amount, v_crew,
          case when v_crew is null then 0 else coalesce(p_crew_score, greatest(p_amount, 0)) end,
          p_reason, p_quest, p_report);
  update public.profiles
    set points = points + p_amount,
        total_earned = total_earned + greatest(p_amount, 0)
    where id = p_user;
end $$;

-- ─────────────────────────────────────────────
-- 하트 → 자동 승격 + 제보자 포인트 (하트당 5점, 제보 1건 100점 상한)
-- ─────────────────────────────────────────────
create or replace function public.on_heart_added()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.reports; s public.app_settings; v_target int; v_pay int; v_nick text;
begin
  select * into s from public.app_settings;
  update public.reports set heart_count = heart_count + 1 where id = new.report_id returning * into r;

  if r.status = 'open' and r.heart_count >= s.promote_heart_threshold then
    update public.reports set status = 'promoted', promoted_at = now() where id = r.id returning * into r;
    select nickname into v_nick from public.profiles where id = r.author_id;
    insert into public.quests (kind, report_id, requester_id, title, description, org_name,
                               lat, lng, address, est_minutes, reward_text)
    values ('report', r.id, r.author_id, r.title, r.description, coalesce(v_nick, '이웃주민'),
            r.lat, r.lng, r.address, r.est_minutes, null);
  end if;

  -- 포인트는 승격된 제보에만
  if r.status = 'promoted' and r.author_id is not null then
    v_target := least(r.heart_count * s.points_per_heart, s.report_points_cap);
    v_pay := v_target - r.author_points_paid;
    if v_pay > 0 then
      perform public.credit_points(r.author_id, v_pay,
        case when r.promoted_at >= now() - interval '1 second' and r.author_points_paid = 0
             then 'report_promoted' else 'report_heart' end,
        null, r.id);
      update public.reports set author_points_paid = author_points_paid + v_pay where id = r.id;
    end if;
  end if;
  return new;
end $$;

create or replace function public.on_heart_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- 이미 지급한 포인트는 회수하지 않음. 다시 누르면 상한까지만 차액 지급되므로 중복 지급 없음.
  update public.reports set heart_count = greatest(heart_count - 1, 0) where id = old.report_id;
  return old;
end $$;

create trigger report_heart_added after insert on public.report_hearts
  for each row execute function public.on_heart_added();
create trigger report_heart_removed after delete on public.report_hearts
  for each row execute function public.on_heart_removed();

-- 크루 의뢰 등록 시 표시값 채우기
create or replace function public.on_crew_quest_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'crew' then
    select name into new.org_name from public.crews where id = new.crew_id;
    new.reward_points := 0;
    new.reward_text := coalesce(new.reward_text, '크루 점수 +' || (select crew_quest_score from public.app_settings));
    new.expires_at := coalesce(new.expires_at, coalesce(new.starts_at, now()) + interval '1 day');
    if new.required_members < 2 then new.required_members := 2; end if;
  end if;
  return new;
end $$;

create trigger quests_before_insert before insert on public.quests
  for each row execute function public.on_crew_quest_insert();

-- ─────────────────────────────────────────────
-- 만료 정리 (5분마다)
-- ─────────────────────────────────────────────
create or replace function public.expire_stale()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quest_claims c set status = 'expired'
    where c.status = 'accepted'
      and c.accepted_at + (select claim_time_limit from public.app_settings) < now();
  update public.quests set status = 'expired'
    where status = 'open' and expires_at is not null and expires_at < now();
end $$;

select cron.schedule('jubquest-expire-stale', '*/5 * * * *', $$select public.expire_stale()$$);

-- ─────────────────────────────────────────────
-- 의뢰판
-- ─────────────────────────────────────────────

-- 의뢰 목록 (제휴 / 내 크루 의뢰 / 승격된 주민 제보). 가까운 순.
create or replace function public.quests_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500, p_kind text default null
) returns table (
  id bigint, code text, kind text, label text, title text, org text, description text,
  goal text, tools text, time_label text, point int, reward text, hot boolean,
  lat double precision, lng double precision, address text,
  distance_m int, dist text, near boolean,
  required_members int, current_members int,
  hearts int, hearted boolean,
  my_status text, cleared boolean, status text, expires_at timestamptz
) language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt,
           (select crew_id from public.crew_members where user_id = (select auth.uid())) as my_crew
  ), q as (
    select q.*, rp.heart_count,
           case when q.location is null then null else extensions.st_distance(q.location, me.pt) end as d,
           exists (select 1 from public.quest_claims c
                   where c.quest_id = q.id and c.user_id = (select auth.uid()) and c.status = 'approved') as cleared_by_me
    from public.quests q
    cross join me
    left join public.reports rp on rp.id = q.report_id
    where (p_kind is null or q.kind = p_kind)
      and (q.kind <> 'crew' or q.crew_id = me.my_crew)
      and (q.location is null or extensions.st_dwithin(q.location, me.pt, p_radius_m))
  )
  select q.id,
         'Q-' || lpad(q.id::text, 4, '0'),
         q.kind,
         case q.kind when 'partner' then '제휴 의뢰' when 'crew' then '크루 의뢰' else '주민 제보' end,
         q.title, q.org_name, q.description, q.goal, q.tools,
         coalesce(q.time_label, '약 ' || coalesce(q.est_minutes, 15) || '분'),
         case when q.kind = 'report' then public.report_point_value(q.heart_count) else q.reward_points end,
         coalesce(q.reward_text,
                  '에코포인트 ' || case when q.kind = 'report' then public.report_point_value(q.heart_count) else q.reward_points end),
         q.hot or coalesce(q.heart_count, 0) >= 10,
         q.lat, q.lng, q.address,
         round(q.d)::int, public.dist_label(q.d), coalesce(q.d <= 500, false),
         q.required_members,
         (select count(*)::int from public.quest_claims c where c.quest_id = q.id and c.status in ('accepted','approved')),
         q.heart_count,
         case when q.report_id is null then null
              else exists (select 1 from public.report_hearts h where h.report_id = q.report_id and h.user_id = (select auth.uid())) end,
         (select c.status from public.quest_claims c
           where c.quest_id = q.id and c.user_id = (select auth.uid())
           order by c.created_at desc limit 1),
         q.cleared_by_me, q.status, q.expires_at
  from q
  where q.status = 'open' or q.cleared_by_me
  order by q.d nulls last, q.created_at desc
$$;

-- 주민 제보 목록 (아직 승격 안 된 제보). 승격 여부·기준은 노출하지 않음.
create or replace function public.reports_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500
) returns table (
  id bigint, code text, title text, author text, description text, category text, photo_url text,
  lat double precision, lng double precision, address text,
  distance_m int, dist text, near boolean, time_label text,
  hearts int, point int, hearted boolean, mine boolean, created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt
  )
  select r.id, 'R-' || lpad(r.id::text, 4, '0'), r.title, coalesce(p.nickname, '이웃주민'),
         r.description, r.category, r.photo_url, r.lat, r.lng, r.address,
         round(extensions.st_distance(r.location, me.pt))::int,
         public.dist_label(extensions.st_distance(r.location, me.pt)),
         extensions.st_distance(r.location, me.pt) <= 500,
         '약 ' || r.est_minutes || '분',
         r.heart_count, public.report_point_value(r.heart_count),
         exists (select 1 from public.report_hearts h where h.report_id = r.id and h.user_id = (select auth.uid())),
         coalesce(r.author_id = (select auth.uid()), false),
         r.created_at
  from public.reports r
  cross join me
  left join public.profiles p on p.id = r.author_id
  where r.status = 'open'
    and extensions.st_dwithin(r.location, me.pt, p_radius_m)
  order by extensions.st_distance(r.location, me.pt)
$$;

-- 상단 띠: 오늘 이 동네 의뢰 N건 · 완료 N건 · 새 제보 N건
create or replace function public.area_stats(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500
) returns json language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt
  ), s as (
    select
      (select count(*) from public.quests q, me
        where q.status = 'open' and q.kind <> 'crew'
          and q.location is not null and extensions.st_dwithin(q.location, me.pt, p_radius_m)) as open_quests,
      (select count(*) from public.quest_claims c join public.quests q on q.id = c.quest_id, me
        where c.status = 'approved' and c.approved_at >= public.kst_today_start()
          and (q.location is null or extensions.st_dwithin(q.location, me.pt, p_radius_m))) as done_today,
      (select count(*) from public.reports r, me
        where r.created_at >= public.kst_today_start()
          and extensions.st_dwithin(r.location, me.pt, p_radius_m)) as new_reports
  )
  select json_build_object(
    'open_quests', open_quests, 'done_today', done_today, 'new_reports', new_reports,
    'ticker', '오늘 이 동네 의뢰 ' || open_quests || '건 · 완료 ' || done_today || '건 · 새 제보 ' || new_reports || '건')
  from s
$$;

-- ─────────────────────────────────────────────
-- 수락 / 취소 / 인증 승인
-- ─────────────────────────────────────────────
create or replace function public.accept_quest(p_quest_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); q public.quests; v_claim bigint; v_deadline timestamptz;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.expire_stale();
  select * into q from public.quests where id = p_quest_id;
  if not found then raise exception 'QUEST_NOT_FOUND'; end if;
  if q.status <> 'open' then raise exception 'QUEST_CLOSED'; end if;
  if q.kind = 'report' and exists (select 1 from public.reports r where r.id = q.report_id and r.author_id = v_uid) then
    raise exception 'OWN_REPORT';
  end if;
  if q.kind = 'crew' and not exists (select 1 from public.crew_members m where m.crew_id = q.crew_id and m.user_id = v_uid) then
    raise exception 'NOT_CREW_MEMBER';
  end if;
  if exists (select 1 from public.quest_claims where quest_id = p_quest_id and user_id = v_uid and status = 'approved') then
    raise exception 'ALREADY_CLEARED';
  end if;
  if exists (select 1 from public.quest_claims where quest_id = p_quest_id and user_id = v_uid and status = 'accepted') then
    raise exception 'ALREADY_ACCEPTED';
  end if;

  insert into public.quest_claims (quest_id, user_id) values (p_quest_id, v_uid)
    returning id, accepted_at + (select claim_time_limit from public.app_settings) into v_claim, v_deadline;
  return json_build_object('claim_id', v_claim, 'deadline_at', v_deadline,
                           'daily_remaining', public.my_daily_remaining());
end $$;

create or replace function public.cancel_claim(p_claim_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quest_claims set status = 'cancelled'
    where id = p_claim_id and user_id = auth.uid() and status = 'accepted';
  if not found then raise exception 'CLAIM_NOT_ACTIVE'; end if;
end $$;

create or replace function public.my_daily_remaining()
returns int language sql stable security definer set search_path = '' as $$
  select greatest(0, s.daily_claim_limit - (
    select count(*)::int from public.quest_claims c
    where c.user_id = auth.uid() and c.status = 'approved' and c.approved_at >= public.kst_today_start()))
  from public.app_settings s
$$;

-- 인증 제출 + 판정 + 포인트 지급 (검증 통과 시 자동 승인)
create or replace function public.approve_claim(
  p_claim_id bigint,
  p_before_photo_url text, p_before_lat double precision, p_before_lng double precision,
  p_before_accuracy_m real, p_before_taken_at timestamptz, p_before_photo_hash text,
  p_after_photo_url text, p_after_lat double precision, p_after_lng double precision,
  p_after_accuracy_m real, p_after_taken_at timestamptz, p_after_photo_hash text,
  p_mocked boolean default false
) returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.app_settings; c public.quest_claims; q public.quests;
  v_before extensions.geography; v_after extensions.geography;
  v_points int := 0; v_crew_score int := 0; v_old_level int; v_new_level int; v_total int; v_balance int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
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

  -- 악용 방지 1: 하루 3개 상한 (KST)
  if public.my_daily_remaining() <= 0 then raise exception 'DAILY_LIMIT'; end if;

  -- 악용 방지 2: 모의 위치, 사진/위치 누락
  if coalesce(p_mocked, false) then raise exception 'MOCK_LOCATION'; end if;
  if p_before_photo_url is null or p_after_photo_url is null
     or p_before_lat is null or p_after_lat is null
     or p_before_taken_at is null or p_after_taken_at is null
     or p_before_photo_hash is null or p_after_photo_hash is null then
    raise exception 'MISSING_PROOF';
  end if;

  -- 촬영 시각: 수락 이후, 전 → 후 순서, 미래 시각 불가
  if p_before_taken_at < c.accepted_at - interval '5 minutes'
     or p_after_taken_at < p_before_taken_at
     or p_after_taken_at > now() + interval '5 minutes' then
    raise exception 'INVALID_TIME';
  end if;

  -- 촬영 위치: 의뢰 위치 반경 안 + 전/후 위치가 서로 가까워야 함
  v_before := extensions.st_setsrid(extensions.st_makepoint(p_before_lng, p_before_lat), 4326)::extensions.geography;
  v_after  := extensions.st_setsrid(extensions.st_makepoint(p_after_lng,  p_after_lat),  4326)::extensions.geography;
  if q.location is not null and (
       extensions.st_distance(q.location, v_before) > s.claim_radius_m
       or extensions.st_distance(q.location, v_after) > s.claim_radius_m) then
    raise exception 'TOO_FAR';
  end if;
  if extensions.st_distance(v_before, v_after) > s.claim_radius_m then
    raise exception 'PHOTOS_TOO_FAR_APART';
  end if;

  -- 악용 방지 3: 사진 해시 중복
  if p_before_photo_hash = p_after_photo_hash
     or exists (select 1 from public.quest_claims x
                where x.id <> c.id
                  and (x.before_photo_hash in (p_before_photo_hash, p_after_photo_hash)
                       or x.after_photo_hash in (p_before_photo_hash, p_after_photo_hash))) then
    raise exception 'DUPLICATE_PHOTO';
  end if;

  -- 보상 계산
  if q.kind = 'report' then
    select public.report_point_value(r.heart_count) into v_points from public.reports r where r.id = q.report_id;
  elsif q.kind = 'partner' then
    v_points := q.reward_points;
  else
    v_points := 0;
    v_crew_score := s.crew_quest_score;
  end if;

  select total_earned / s.points_per_level + 1 into v_old_level from public.profiles where id = v_uid;

  update public.quest_claims set
    status = 'approved', approved_at = now(),
    before_photo_url = p_before_photo_url, before_lat = p_before_lat, before_lng = p_before_lng,
    before_accuracy_m = p_before_accuracy_m, before_taken_at = p_before_taken_at, before_photo_hash = p_before_photo_hash,
    after_photo_url = p_after_photo_url, after_lat = p_after_lat, after_lng = p_after_lng,
    after_accuracy_m = p_after_accuracy_m, after_taken_at = p_after_taken_at, after_photo_hash = p_after_photo_hash,
    points_awarded = v_points, crew_score_awarded = v_crew_score
  where id = c.id;

  perform public.credit_points(v_uid, v_points,
    case when q.kind = 'crew' then 'crew_quest' else 'quest_approved' end,
    q.id, q.report_id, case when q.kind = 'crew' then v_crew_score else null end);

  -- 주민 제보 의뢰는 한 번 치우면 끝
  if q.kind = 'report' then
    update public.quests set status = 'done' where id = q.id;
    update public.quest_claims set status = 'cancelled'
      where quest_id = q.id and status = 'accepted' and id <> c.id;
  end if;

  select points, total_earned into v_balance, v_total from public.profiles where id = v_uid;
  v_new_level := v_total / s.points_per_level + 1;
  return json_build_object(
    'points_awarded', v_points, 'crew_score_awarded', v_crew_score,
    'points', v_balance, 'level', v_new_level, 'leveled_up', v_new_level > v_old_level,
    'daily_remaining', public.my_daily_remaining());
end $$;

-- 진행 중인 내 의뢰
create or replace function public.my_claims()
returns table (claim_id bigint, quest_id bigint, title text, status text, accepted_at timestamptz,
               deadline_at timestamptz, lat double precision, lng double precision, address text)
language sql stable security definer set search_path = '' as $$
  select c.id, q.id, q.title, c.status, c.accepted_at,
         c.accepted_at + (select claim_time_limit from public.app_settings),
         q.lat, q.lng, q.address
  from public.quest_claims c join public.quests q on q.id = c.quest_id
  where c.user_id = auth.uid() and c.status = 'accepted'
  order by c.accepted_at desc
$$;

-- ─────────────────────────────────────────────
-- 내 탭
-- ─────────────────────────────────────────────
create or replace function public.my_profile()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); p public.profiles; s public.app_settings;
  v_level int; v_in_level int; v_completed int; v_dawn boolean; v_crew text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  select * into s from public.app_settings;
  v_level := p.total_earned / s.points_per_level + 1;
  v_in_level := p.total_earned % s.points_per_level;
  select count(*) into v_completed from public.quest_claims where user_id = v_uid and status = 'approved';
  select exists (select 1 from public.quest_claims where user_id = v_uid and status = 'approved'
                 and extract(hour from approved_at at time zone 'Asia/Seoul') < 7) into v_dawn;
  select c.name into v_crew from public.crew_members m join public.crews c on c.id = m.crew_id where m.user_id = v_uid;

  return json_build_object(
    'id', p.id, 'nickname', p.nickname, 'initial', left(p.nickname, 1),
    'avatar_url', p.avatar_url, 'home_area', p.home_area,
    'joined_days', ((now() at time zone 'Asia/Seoul')::date - (p.created_at at time zone 'Asia/Seoul')::date) + 1,
    'level', v_level,
    'level_label', case when v_level >= 10 then '클린 히어로' when v_level >= 6 then '동네 정화러'
                        when v_level >= 3 then '골목 지킴이' else '새싹 줍줍러' end,
    'level_progress', round(v_in_level::numeric / s.points_per_level, 2),
    'next_level_points', s.points_per_level - v_in_level,
    'points', p.points, 'total_earned', p.total_earned,
    'crew', v_crew,
    'daily_remaining', public.my_daily_remaining(),
    'badges', json_build_array(
      json_build_object('name', '첫줍', 'desc', '첫 의뢰', 'on', v_completed >= 1),
      json_build_object('name', '열줍', 'desc', '의뢰 10건', 'on', v_completed >= 10),
      json_build_object('name', '새벽', 'desc', '오전 7시 전', 'on', v_dawn),
      json_build_object('name', '???', 'desc', '비 오는 날', 'on', false)),
    'records', json_build_array(
      json_build_array('완료한 의뢰', v_completed || '건'),
      json_build_array('올린 제보', (select count(*) from public.reports where author_id = v_uid) || '건'),
      json_build_array('누적 포인트', p.total_earned || '점')));
end $$;

-- ─────────────────────────────────────────────
-- 크루
-- ─────────────────────────────────────────────
create or replace function public.current_season()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', id, 'label', label, 'period', period, 'note', note,
    'title', '시즌 종료까지 ' || greatest(0, ((ends_at at time zone 'Asia/Seoul')::date - (now() at time zone 'Asia/Seoul')::date)) || '일',
    'starts_at', starts_at, 'ends_at', ends_at)
  from public.seasons where now() between starts_at and ends_at
  order by starts_at desc limit 1
$$;

create or replace function public.crew_ranking()
returns table (rank int, crew_id bigint, name text, meta text, score int, mine boolean)
language sql stable security definer set search_path = '' as $$
  with season as (
    select starts_at, ends_at from public.seasons where now() between starts_at and ends_at
    order by starts_at desc limit 1
  ), scores as (
    select c.id, c.name, c.area,
           (select count(*) from public.crew_members m where m.crew_id = c.id) as members,
           coalesce((select sum(l.crew_score) from public.point_ledger l, season
                     where l.crew_id = c.id and l.created_at between season.starts_at and season.ends_at), 0) as score
    from public.crews c
  )
  select (rank() over (order by score desc))::int, id, name,
         coalesce(area, '') || ' · ' || members || '명', score::int,
         exists (select 1 from public.crew_members m where m.crew_id = scores.id and m.user_id = auth.uid())
  from scores
  order by score desc, name
$$;

create or replace function public.my_crew()
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_crew public.crews; v_rank record; v_top int; v_members int; v_active int; v_week int;
begin
  select c.* into v_crew from public.crew_members m join public.crews c on c.id = m.crew_id
    where m.user_id = auth.uid();
  if not found then return null; end if;
  select * into v_rank from public.crew_ranking() r where r.crew_id = v_crew.id;
  select max(score) into v_top from public.crew_ranking();
  select count(*) into v_members from public.crew_members where crew_id = v_crew.id;
  select count(distinct c.user_id) into v_active from public.quest_claims c
    join public.crew_members m on m.user_id = c.user_id and m.crew_id = v_crew.id
    where c.status = 'approved' and c.approved_at >= public.kst_today_start();
  select count(*) into v_week from public.quest_claims c
    join public.crew_members m on m.user_id = c.user_id and m.crew_id = v_crew.id
    where c.status = 'approved'
      and c.approved_at >= (date_trunc('week', now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul';
  return json_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'rank', v_rank.rank, 'score', v_rank.score,
    'stats', json_build_array(
      json_build_array('이번 주 함께 완료한 의뢰', v_week || '건'),
      json_build_array('1위까지 남은 점수', greatest(0, v_top - v_rank.score) || '점'),
      json_build_array('오늘 활동한 크루원', v_members || '명 중 ' || v_active || '명')));
end $$;

create or replace function public.crews_to_join()
returns table (id bigint, name text, meta text)
language sql stable security definer set search_path = '' as $$
  select r.crew_id, r.name, r.meta || case when r.rank = 1 and r.score > 0 then ' · 이번 시즌 1위' else '' end
  from public.crew_ranking() r
  where not r.mine
  order by r.rank
$$;

-- ─────────────────────────────────────────────
-- 동네 지도
-- ─────────────────────────────────────────────
create or replace function public.map_overview(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500
) returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_my_crew bigint; v_done int; v_open int; v_crew_spots int; v_new int;
begin
  select crew_id into v_my_crew from public.crew_members where user_id = auth.uid();

  select count(*) into v_done from public.quest_claims c join public.quests q on q.id = c.quest_id
    where c.status = 'approved' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m);
  select count(*) into v_open from public.quests q
    where q.status = 'open' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m);
  select count(*) into v_crew_spots from public.quest_claims c
    join public.quests q on q.id = c.quest_id
    join public.crew_members m on m.user_id = c.user_id
    where c.status = 'approved' and m.crew_id = v_my_crew
      and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m);
  select count(*) into v_new from public.reports r
    where r.status = 'open' and r.created_at >= now() - interval '7 days'
      and extensions.st_dwithin(r.location, v_pt, p_radius_m);

  return json_build_object(
    'stats', json_build_array(
      json_build_array(case when v_done + v_open = 0 then 0 else round(100.0 * v_done / (v_done + v_open)) end || '%', '우리 동네 정화율'),
      json_build_array(v_crew_spots::text, '우리 크루 구역'),
      json_build_array(v_new::text, '새 제보')),
    -- 지도에 칠할 점들: cleared(치운 곳, 크루 구분) / quest(의뢰 있음) / hot_report(제보 많음)
    'points', coalesce((
      select json_agg(x) from (
        select 'cleared' as type, q.lat, q.lng,
               case when m.crew_id is null then 'none' when m.crew_id = v_my_crew then 'mine' else 'other' end as crew
        from public.quest_claims c join public.quests q on q.id = c.quest_id
        left join public.crew_members m on m.user_id = c.user_id
        where c.status = 'approved' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m)
        union all
        select 'quest', q.lat, q.lng, null from public.quests q
        where q.status = 'open' and q.location is not null and extensions.st_dwithin(q.location, v_pt, p_radius_m)
        union all
        select 'hot_report', r.lat, r.lng, null from public.reports r
        where r.status = 'open' and r.heart_count >= 3 and extensions.st_dwithin(r.location, v_pt, p_radius_m)
      ) x), '[]'::json));
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
grant execute on function public.accept_quest(bigint) to authenticated;
grant execute on function public.cancel_claim(bigint) to authenticated;
grant execute on function public.my_daily_remaining() to authenticated;
grant execute on function public.approve_claim(bigint, text, double precision, double precision, real, timestamptz, text,
                                               text, double precision, double precision, real, timestamptz, text, boolean) to authenticated;
grant execute on function public.my_claims() to authenticated;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.my_crew() to authenticated;

-- 앞으로 만드는 함수도 기본으로 막기 (필요한 것만 위처럼 grant)
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
