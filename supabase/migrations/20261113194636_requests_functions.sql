-- 백엔드 요청(docs/backend-requests.md) 반영: 서버 함수·트리거
-- 판정(하트 상한, 승격, 포인트·XP, 인원, 인증 검사)은 전부 여기서 합니다.

-- ─────────────────────────────────────────────
-- 공통 도우미 (외부 호출 불가)
-- ─────────────────────────────────────────────

-- 장소 유형별 XP (1-5)
create or replace function public.category_xp(p_category text)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((s.xp_by_category ->> p_category)::int, (s.xp_by_category ->> '기타')::int, 0)
  from public.app_settings s
$$;

create or replace function public.level_of(p_xp int)
returns int language sql stable security definer set search_path = '' as $$
  select p_xp / s.xp_per_level + 1 from public.app_settings s
$$;

-- 연속 활동 주 (월요일 시작, KST). 이번 주에 아직 안 했으면 지난주부터 셉니다. (2-7)
create or replace function public.streak_weeks(p_user uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare v_week date; v_n int := 0;
begin
  v_week := date_trunc('week', now() at time zone 'Asia/Seoul')::date;
  if not exists (select 1 from public.quest_claims where user_id = p_user and status = 'approved'
                 and date_trunc('week', approved_at at time zone 'Asia/Seoul')::date = v_week) then
    v_week := v_week - 7;
  end if;
  while exists (select 1 from public.quest_claims where user_id = p_user and status = 'approved'
                and date_trunc('week', approved_at at time zone 'Asia/Seoul')::date = v_week) loop
    v_n := v_n + 1;
    v_week := v_week - 7;
  end loop;
  return v_n;
end $$;

-- 착용 중인 꾸미기 → { frame: {id, style, colors}, name_color } (2-10). 목록에서 빠진 품목이면 기본값.
create or replace function public.look_of(p_frame text, p_name text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'frame', (select json_build_object('id', c.id, 'style', c.style, 'colors', c.colors)
              from public.cosmetics c where c.id in (p_frame, 'frame-tape') and c.kind = 'frame'
              order by (c.id = p_frame) desc limit 1),
    'name_color', (select c.colors[1] from public.cosmetics c
                   where c.id in (p_name, 'name-white') and c.kind = 'name'
                   order by (c.id = p_name) desc limit 1))
$$;

-- 두 사진 미리보기(32×32 RGB, base64)의 평균 밝기 차이. 형식이 다르면 null (3-6)
create or replace function public.thumb_diff(p_a text, p_b text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare a bytea; b bytea; n int; s bigint := 0;
begin
  if p_a is null or p_b is null then return null; end if;
  begin
    a := decode(p_a, 'base64'); b := decode(p_b, 'base64');
  exception when others then return null;
  end;
  n := length(a);
  if n = 0 or n <> length(b) or n > 65536 then return null; end if;
  for i in 0 .. n - 1 loop
    s := s + abs(get_byte(a, i) - get_byte(b, i));
  end loop;
  return s::numeric / n;
end $$;

-- 포인트·XP 적립 (원장 + 합계 캐시). 크루원이면 크루 XP 도 원장에 남깁니다.
-- p_amount 는 음수일 수 있습니다(상점·꾸미기 사용). total_earned 와 xp 는 줄지 않습니다.
drop function if exists public.credit_points(uuid, int, text, bigint, bigint, int);
create or replace function public.credit_points(
  p_user uuid, p_amount int, p_xp int, p_crew_xp int, p_reason text,
  p_quest bigint default null, p_report bigint default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_crew bigint;
begin
  if p_user is null then return null; end if;
  select crew_id into v_crew from public.crew_members where user_id = p_user;
  insert into public.point_ledger (user_id, amount, xp, crew_id, crew_score, reason, quest_id, report_id)
  values (p_user, p_amount, greatest(p_xp, 0), v_crew,
          case when v_crew is null then 0 else greatest(p_crew_xp, 0) end,
          p_reason, p_quest, p_report);
  update public.profiles
    set points = points + p_amount,
        total_earned = total_earned + greatest(p_amount, 0),
        xp = xp + greatest(p_xp, 0)
    where id = p_user;
  return v_crew;
end $$;

-- 크루 활동 알림 남기기 (2-3)
create or replace function public.crew_event(
  p_crew bigint, p_type text, p_user uuid,
  p_quest bigint default null, p_title text default null,
  p_crew_xp int default 0, p_points int default 0, p_is_crew_quest boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_crew is null or not exists (select 1 from public.crews where id = p_crew) then return; end if;
  insert into public.crew_events (crew_id, type, user_id, nickname, quest_id, title, crew_xp, points, is_crew_quest)
  values (p_crew, p_type, p_user,
          coalesce((select nickname from public.profiles where id = p_user), ''),
          p_quest, p_title, coalesce(p_crew_xp, 0), coalesce(p_points, 0), p_is_crew_quest);
end $$;

-- 업로드된 사진이 본인 폴더의 실제 파일인지 (3-2). 맞으면 업로드 시각을 돌려줍니다.
create or replace function public.own_upload_at(p_bucket text, p_path text, p_user uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select o.created_at from storage.objects o
  where o.bucket_id = p_bucket and o.name = p_path
    and split_part(o.name, '/', 1) = p_user::text
  limit 1
$$;

-- ─────────────────────────────────────────────
-- 제보: 공개 시각, 사진 확인 (3-7, 3-2)
-- ─────────────────────────────────────────────
create or replace function public.on_report_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  new.visible_at := now() + (select report_publish_delay from public.app_settings);
  if v_uid is not null and new.photo_url is not null
     and public.own_upload_at('report-photos', new.photo_url, v_uid) is null then
    raise exception 'INVALID_PHOTO';
  end if;
  return new;
end $$;

create trigger reports_before_insert before insert on public.reports
  for each row execute function public.on_report_insert();

-- ─────────────────────────────────────────────
-- 하트 (1-1 ~ 1-4)
-- ─────────────────────────────────────────────

-- 누르기 전 검사: 공개 전 제보 불가, 하루 10개 (KST). 사용자 단위 잠금으로 동시 요청도 막습니다.
create or replace function public.on_heart_before()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.reports; v_today int;
begin
  perform pg_advisory_xact_lock(hashtext('heart:' || new.user_id::text));
  select * into r from public.reports where id = new.report_id;
  if not found or r.status = 'rejected' then raise exception 'REPORT_NOT_OPEN'; end if;
  if r.author_id = new.user_id then raise exception 'CANNOT_LIKE_OWN_REPORT'; end if;
  if r.visible_at is not null and r.visible_at > now() then raise exception 'REPORT_PENDING'; end if;
  select count(*) into v_today from public.report_hearts
    where user_id = new.user_id and created_at >= public.kst_today_start();
  if v_today >= (select heart_daily_limit from public.app_settings) then
    raise exception 'HEART_DAILY_LIMIT';
  end if;
  return new;
end $$;

-- 누른 뒤: 하트 수 증가, 기준을 넘으면 자동 승격, 누른 사람에게 소량 포인트.
-- 제보자에게는 포인트를 주지 않습니다(1-1). 해결자 보상은 approve_claim 에서 하트 수 × 값(상한).
create or replace function public.on_heart_added()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.reports; s public.app_settings; v_nick text;
begin
  select * into s from public.app_settings;
  update public.reports set heart_count = heart_count + 1 where id = new.report_id returning * into r;

  if r.status = 'open' and r.heart_count >= s.promote_heart_threshold then
    update public.reports set status = 'promoted', promoted_at = now() where id = r.id returning * into r;
    select nickname into v_nick from public.profiles where id = r.author_id;
    insert into public.quests (kind, report_id, requester_id, title, description, org_name,
                               lat, lng, address, est_minutes, category, issue_type, required_members, is_demo)
    values ('report', r.id, r.author_id, r.title, r.description, coalesce(v_nick, '이웃주민'),
            r.lat, r.lng, r.address, r.est_minutes, r.category, r.issue_type, r.required_members, r.is_demo);
  end if;

  -- 같은 제보에는 한 번만 (하트는 취소가 없어 사실상 1회지만 원장으로 한 번 더 확인)
  if s.heart_giver_points > 0 and not exists (
       select 1 from public.point_ledger
       where user_id = new.user_id and report_id = new.report_id and reason = 'heart_given') then
    perform public.credit_points(new.user_id, s.heart_giver_points, 0, 0, 'heart_given', null, new.report_id);
  end if;
  return new;
end $$;

drop trigger if exists report_heart_removed on public.report_hearts;
drop function if exists public.on_heart_removed();

create trigger report_heart_before before insert on public.report_hearts
  for each row execute function public.on_heart_before();

-- 하트 누르기 RPC (테이블 insert 와 같은 동작 + 결과 반환)
create or replace function public.give_heart(p_report_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); r public.reports; s public.app_settings; v_today int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.report_hearts where report_id = p_report_id and user_id = v_uid) then
    raise exception 'HEART_FINAL';
  end if;
  insert into public.report_hearts (report_id, user_id) values (p_report_id, v_uid);
  select * into r from public.reports where id = p_report_id;
  select * into s from public.app_settings;
  select count(*) into v_today from public.report_hearts
    where user_id = v_uid and created_at >= public.kst_today_start();
  return json_build_object(
    'liked', true, 'like_count', r.heart_count,
    'points_gained', s.heart_giver_points,
    'hearts_today', v_today, 'hearts_left', greatest(0, s.heart_daily_limit - v_today));
end $$;

-- ─────────────────────────────────────────────
-- 크루 의뢰 등록 (1-6, 2-3)
-- ─────────────────────────────────────────────
create or replace function public.on_crew_quest_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_points int;
begin
  if new.kind = 'crew' then
    v_points := (select crew_quest_points from public.app_settings);
    select name into new.org_name from public.crews where id = new.crew_id;
    new.reward_points := v_points;
    new.reward_text := coalesce(new.reward_text, '에코포인트 ' || v_points || ' + 크루 XP');
    new.expires_at := coalesce(new.expires_at, coalesce(new.starts_at, now()) + interval '1 day');
    if new.required_members < 2 then new.required_members := 2; end if;
  end if;
  return new;
end $$;

create or replace function public.on_crew_quest_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'crew' and new.requester_id is not null then
    perform public.crew_event(new.crew_id, 'quest', new.requester_id, new.id, new.title, 0, 0, true);
  end if;
  return new;
end $$;

create trigger quests_after_insert after insert on public.quests
  for each row execute function public.on_crew_quest_added();

-- ─────────────────────────────────────────────
-- 크루 가입·탈퇴 기록, 크루장 넘기기 (2-2, 2-3)
-- ─────────────────────────────────────────────
create or replace function public.on_crew_member_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.crew_event(new.crew_id, case when new.role = 'owner' then 'create' else 'join' end, new.user_id);
  return new;
end $$;

-- 크루장이 나가면 가장 먼저 들어온 크루원이 크루장이 되고, 마지막 크루원이 나가면 크루가 사라집니다.
create or replace function public.on_crew_member_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_next uuid;
begin
  if not exists (select 1 from public.crews where id = old.crew_id) then return old; end if;
  if not exists (select 1 from public.crew_members where crew_id = old.crew_id) then
    delete from public.crews where id = old.crew_id;
    return old;
  end if;
  if old.role = 'owner' then
    select user_id into v_next from public.crew_members where crew_id = old.crew_id order by joined_at limit 1;
    update public.crew_members set role = 'owner' where crew_id = old.crew_id and user_id = v_next;
    update public.crews set owner_id = v_next where id = old.crew_id;
  end if;
  perform public.crew_event(old.crew_id, 'leave', old.user_id);
  return old;
end $$;

create trigger crew_members_after_insert after insert on public.crew_members
  for each row execute function public.on_crew_member_added();
create trigger crew_members_after_delete after delete on public.crew_members
  for each row execute function public.on_crew_member_removed();

create or replace function public.create_crew(p_name text, p_area text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text := btrim(coalesce(p_name, '')); v_id bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(v_name) not between 1 and 30 then raise exception 'INVALID_NAME'; end if;
  if exists (select 1 from public.crew_members where user_id = v_uid) then raise exception 'ALREADY_IN_CREW'; end if;
  if exists (select 1 from public.crews where lower(name) = lower(v_name)) then raise exception 'CREW_NAME_TAKEN'; end if;
  insert into public.crews (name, area, owner_id) values (v_name, nullif(btrim(coalesce(p_area, '')), ''), v_uid)
    returning id into v_id;
  insert into public.crew_members (crew_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

create or replace function public.join_crew(p_crew_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.crew_members where user_id = v_uid) then raise exception 'ALREADY_IN_CREW'; end if;
  if not exists (select 1 from public.crews where id = p_crew_id) then raise exception 'CREW_NOT_FOUND'; end if;
  insert into public.crew_members (crew_id, user_id, role) values (p_crew_id, v_uid, 'member');
end $$;

create or replace function public.leave_crew()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.crew_members where user_id = auth.uid();
  if not found then raise exception 'NOT_IN_CREW'; end if;
end $$;

-- ─────────────────────────────────────────────
-- 의뢰판
-- ─────────────────────────────────────────────

-- 의뢰 목록 (제휴 / 내 크루 의뢰 / 승격된 주민 제보). 가까운 순.
drop function if exists public.quests_nearby(double precision, double precision, int, text);
create or replace function public.quests_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500, p_kind text default null
) returns table (
  id bigint, code text, kind text, label text, title text, org text, description text,
  goal text, tools text, time_label text, point int, reward text, hot boolean,
  lat double precision, lng double precision, address text,
  distance_m int, dist text, near boolean,
  required_members int, current_members int,
  hearts int, hearted boolean,
  my_status text, my_claim_id bigint, cleared boolean, status text, expires_at timestamptz,
  report_id bigint, photo_url text, category text, issue_type text, is_mine boolean,
  proof_mode text, proof_label text, reward_label text, reward_value text, reward_unit text,
  reward_xp int, reward_crew_xp int, is_demo boolean
) language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt,
           (select crew_id from public.crew_members where user_id = (select auth.uid())) as my_crew,
           (select crew_quest_xp_multiplier from public.app_settings) as mult
  ), q as (
    select q.*, rp.heart_count, rp.photo_url as report_photo, rp.author_id, rp.visible_at,
           case when q.location is null then null else extensions.st_distance(q.location, me.pt) end as d,
           exists (select 1 from public.quest_claims c
                   where c.quest_id = q.id and c.user_id = (select auth.uid()) and c.status = 'approved') as cleared_by_me,
           public.category_xp(q.category) as xp,
           me.my_crew, me.mult
    from public.quests q
    cross join me
    left join public.reports rp on rp.id = q.report_id
    where (p_kind is null or q.kind = p_kind)
      and (q.kind <> 'crew' or q.crew_id = me.my_crew)
      and (q.location is null or extensions.st_dwithin(q.location, me.pt, p_radius_m))
      and (rp.id is null or rp.visible_at is null or rp.visible_at <= now() or rp.author_id = (select auth.uid()))
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
         (select c.id from public.quest_claims c
           where c.quest_id = q.id and c.user_id = (select auth.uid()) and c.status = 'accepted'
           order by c.created_at desc limit 1),
         q.cleared_by_me, q.status, q.expires_at,
         q.report_id, q.report_photo, q.category, q.issue_type,
         coalesce(q.author_id = (select auth.uid()), false),
         q.proof_mode, q.proof_label, q.reward_label, q.reward_value, q.reward_unit,
         q.xp,
         case when q.my_crew is null then 0
              when q.kind = 'crew' or q.required_members > 1 then q.xp * q.mult else q.xp end,
         q.is_demo
  from q
  where q.status = 'open' or q.cleared_by_me
  order by q.d nulls last, q.created_at desc
$$;

-- 주민 제보 목록 (아직 승격 안 된 제보). 공개된 것과 내 것만. 승격 여부·기준은 노출하지 않음.
drop function if exists public.reports_nearby(double precision, double precision, int);
create or replace function public.reports_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500
) returns table (
  id bigint, code text, title text, author text, description text, category text, issue_type text, photo_url text,
  lat double precision, lng double precision, address text,
  distance_m int, dist text, near boolean, time_label text,
  hearts int, point int, reward_xp int, required_members int,
  hearted boolean, mine boolean, pending_until timestamptz, is_demo boolean, created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt
  )
  select r.id, 'R-' || lpad(r.id::text, 4, '0'), r.title, coalesce(p.nickname, '이웃주민'),
         r.description, r.category, r.issue_type, r.photo_url, r.lat, r.lng, r.address,
         round(extensions.st_distance(r.location, me.pt))::int,
         public.dist_label(extensions.st_distance(r.location, me.pt)),
         extensions.st_distance(r.location, me.pt) <= 500,
         '약 ' || r.est_minutes || '분',
         r.heart_count, public.report_point_value(r.heart_count), public.category_xp(r.category), r.required_members,
         exists (select 1 from public.report_hearts h where h.report_id = r.id and h.user_id = (select auth.uid())),
         coalesce(r.author_id = (select auth.uid()), false),
         case when r.visible_at > now() then r.visible_at end,
         r.is_demo,
         r.created_at
  from public.reports r
  cross join me
  left join public.profiles p on p.id = r.author_id
  where r.status = 'open'
    and (r.visible_at is null or r.visible_at <= now() or r.author_id = (select auth.uid()))
    and extensions.st_dwithin(r.location, me.pt, p_radius_m)
  order by extensions.st_distance(r.location, me.pt)
$$;

-- ─────────────────────────────────────────────
-- 수락
-- ─────────────────────────────────────────────
create or replace function public.accept_quest(p_quest_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); q public.quests; r public.reports; v_claim bigint; v_deadline timestamptz; v_count int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.expire_stale();
  select * into q from public.quests where id = p_quest_id for update; -- 인원 판정 경합 방지
  if not found then raise exception 'QUEST_NOT_FOUND'; end if;
  if q.status <> 'open' then raise exception 'QUEST_CLOSED'; end if;
  if q.kind = 'report' then
    select * into r from public.reports where id = q.report_id;
    if r.visible_at is not null and r.visible_at > now() then raise exception 'REPORT_PENDING'; end if;
    -- 내 제보는 내가 해결할 수 없음. 여럿이 하는 의뢰는 올린 사람도 참여 (3-7)
    if r.author_id = v_uid and q.required_members <= 1 then raise exception 'OWN_REPORT'; end if;
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
  -- 필요 인원이 찼으면 추가 수락 거절 (2-8). 제휴 의뢰는 각자 한 번씩이라 인원 제한 없음.
  if q.kind in ('report','crew') then
    select count(*) into v_count from public.quest_claims where quest_id = q.id and status in ('accepted','approved');
    if v_count >= q.required_members then raise exception 'REPORT_FULL'; end if;
  end if;

  insert into public.quest_claims (quest_id, user_id) values (p_quest_id, v_uid)
    returning id, accepted_at + (select claim_time_limit from public.app_settings) into v_claim, v_deadline;
  select count(*) into v_count from public.quest_claims where quest_id = q.id and status in ('accepted','approved');
  return json_build_object('claim_id', v_claim, 'deadline_at', v_deadline,
                           'current_members', v_count, 'required_members', q.required_members,
                           'status', case when q.kind in ('report','crew') and v_count >= q.required_members
                                          then 'in_progress' else 'open' end,
                           'daily_remaining', public.my_daily_remaining());
end $$;

-- ─────────────────────────────────────────────
-- 인증 제출 + 판정 + 보상 (검증 통과 시 자동 승인)
-- ─────────────────────────────────────────────
drop function if exists public.approve_claim(bigint, text, double precision, double precision, real, timestamptz, text,
                                             text, double precision, double precision, real, timestamptz, text, boolean);
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
  v_count int; v_approved int; v_diff numeric;
  v_points int := 0; v_xp int; v_crew_xp int := 0; v_crew bigint; v_crewish boolean;
  v_old_level int; v_new_level int; p public.profiles;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  -- 3-1: 같은 사용자의 인증은 한 번에 하나씩 (하루 3개 상한 경합 방지)
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

  -- 하루 3개 상한 (KST)
  if public.my_daily_remaining() <= 0 then raise exception 'DAILY_LIMIT'; end if;

  -- 2-8: 필요 인원이 다 모여야 인증 가능
  if q.kind in ('report','crew') and q.required_members > 1 then
    select count(*) into v_count from public.quest_claims where quest_id = q.id and status in ('accepted','approved');
    if v_count < q.required_members then raise exception 'REPORT_NOT_IN_PROGRESS'; end if;
  end if;

  -- 모의 위치, 사진/위치 누락 (2-4: 한 장 인증은 before_* 만 사용)
  if coalesce(p_mocked, false) then raise exception 'MOCK_LOCATION'; end if;
  if p_before_photo_url is null or p_before_lat is null or p_before_lng is null
     or p_before_taken_at is null or p_before_photo_hash is null then
    raise exception 'MISSING_PROOF';
  end if;
  if not v_single and (p_after_photo_url is null or p_after_lat is null or p_after_lng is null
                       or p_after_taken_at is null or p_after_photo_hash is null) then
    raise exception 'MISSING_PROOF';
  end if;

  -- 3-2: 사진은 본인 폴더에 실제로 올라간 파일이어야 함
  v_before_up := public.own_upload_at('claim-photos', p_before_photo_url, v_uid);
  if v_before_up is null then raise exception 'INVALID_PHOTO'; end if;
  if not v_single then
    v_after_up := public.own_upload_at('claim-photos', p_after_photo_url, v_uid);
    if v_after_up is null then raise exception 'INVALID_PHOTO'; end if;
  end if;

  -- 촬영 시각: 수락 이후, 전 → 후 순서, 미래 시각 불가. 업로드 시각도 수락 이후여야 함.
  if p_before_taken_at < c.accepted_at - interval '5 minutes'
     or v_before_up < c.accepted_at
     or p_before_taken_at > now() + interval '5 minutes'
     or (not v_single and (p_after_taken_at < p_before_taken_at or p_after_taken_at > now() + interval '5 minutes')) then
    raise exception 'INVALID_TIME';
  end if;

  -- 3-6: 찍고 바로 완료 막기. 업로드 시각(서버 기록)과 촬영 시각 모두 최소 간격 이상
  if not v_single and (v_after_up - v_before_up < s.proof_min_gap
                       or p_after_taken_at - p_before_taken_at < s.proof_min_gap) then
    raise exception 'TOO_FAST';
  end if;

  -- 촬영 위치: 의뢰 위치 반경 안 + 전/후 위치가 서로 가까워야 함
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

  -- 사진 해시 중복
  if (not v_single and p_before_photo_hash = p_after_photo_hash)
     or exists (select 1 from public.quest_claims x
                where x.id <> c.id
                  and (x.before_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash))
                       or x.after_photo_hash in (p_before_photo_hash, coalesce(p_after_photo_hash, p_before_photo_hash)))) then
    raise exception 'DUPLICATE_PHOTO';
  end if;

  -- 3-6: 거의 같은 장면 (앱이 보낸 32×32 미리보기 기준, 없으면 건너뜀)
  if not v_single then
    v_diff := public.thumb_diff(p_before_thumb, p_after_thumb);
    if v_diff is not null and v_diff < 4 then raise exception 'NO_CHANGE'; end if;
  end if;

  -- 보상: 포인트 + XP(장소 유형) + 크루원이면 크루 XP(크루 의뢰·여럿 의뢰는 배수)
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

  select public.level_of(xp) into v_old_level from public.profiles where id = v_uid;

  update public.quest_claims set
    status = 'approved', approved_at = now(),
    before_photo_url = p_before_photo_url, before_lat = p_before_lat, before_lng = p_before_lng,
    before_accuracy_m = p_before_accuracy_m, before_taken_at = p_before_taken_at, before_photo_hash = p_before_photo_hash,
    after_photo_url = p_after_photo_url, after_lat = p_after_lat, after_lng = p_after_lng,
    after_accuracy_m = p_after_accuracy_m, after_taken_at = p_after_taken_at, after_photo_hash = p_after_photo_hash,
    points_awarded = v_points, xp_awarded = v_xp, crew_xp_awarded = v_crew_xp,
    reward_label = q.reward_label
  where id = c.id;

  perform public.credit_points(v_uid, v_points, v_xp, v_crew_xp,
    case when q.kind = 'crew' then 'crew_quest' else 'quest_approved' end, q.id, q.report_id);

  if v_crew is not null then
    perform public.crew_event(v_crew, 'complete', v_uid, q.id, q.title, v_crew_xp, v_points, v_crewish);
  end if;

  -- 마감: 주민 제보·크루 의뢰는 필요 인원만큼 완료되면 끝. 제휴 의뢰는 마감일까지 각자 한 번씩.
  if q.kind in ('report','crew') then
    select count(*) into v_approved from public.quest_claims where quest_id = q.id and status = 'approved';
    if v_approved >= q.required_members then
      update public.quests set status = 'done' where id = q.id;
      update public.quest_claims set status = 'cancelled'
        where quest_id = q.id and status = 'accepted';
    end if;
  end if;

  select * into p from public.profiles where id = v_uid;
  v_new_level := public.level_of(p.xp);
  return json_build_object(
    'title', q.title,
    'points_awarded', v_points, 'points_gained', v_points,
    'xp_gained', v_xp, 'crew_xp_gained', v_crew_xp,
    'reward_label', q.reward_label,
    'points', p.points, 'xp', p.xp, 'level', v_new_level, 'leveled_up', v_new_level > v_old_level,
    'streak_weeks', public.streak_weeks(v_uid),
    'daily_remaining', public.my_daily_remaining());
end $$;

-- ─────────────────────────────────────────────
-- 내 탭
-- ─────────────────────────────────────────────
create or replace function public.my_profile()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); p public.profiles; s public.app_settings;
  v_level int; v_completed int; v_hearts int; v_dones int; v_crew text; v_look json;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  select * into s from public.app_settings;
  v_level := public.level_of(p.xp);
  select count(*) into v_completed from public.quest_claims where user_id = v_uid and status = 'approved';
  select count(*) into v_dones from public.quest_claims
    where user_id = v_uid and status = 'approved' and approved_at >= public.kst_today_start();
  select count(*) into v_hearts from public.report_hearts
    where user_id = v_uid and created_at >= public.kst_today_start();
  select c.name into v_crew from public.crew_members m join public.crews c on c.id = m.crew_id where m.user_id = v_uid;
  v_look := public.look_of(p.frame_id, p.name_color_id);

  return json_build_object(
    'id', p.id, 'nickname', p.nickname, 'initial', left(p.nickname, 1),
    'avatar_url', p.avatar_url, 'home_area', p.home_area,
    'frame', v_look -> 'frame', 'name_color', v_look ->> 'name_color',
    'joined_days', ((now() at time zone 'Asia/Seoul')::date - (p.created_at at time zone 'Asia/Seoul')::date) + 1,
    -- 1-5 포인트(쓰면 줄어듦)와 XP(쌓이기만 함) 분리, 레벨은 XP 로
    'points', p.points, 'total_earned', p.total_earned,
    'xp', p.xp, 'level', v_level,
    'xp_in_level', p.xp % s.xp_per_level, 'xp_for_next_level', s.xp_per_level,
    'crew', v_crew,
    -- 1-4 오늘 쓴 하트·완료 수와 상한
    'hearts_today', v_hearts, 'hearts_limit', s.heart_daily_limit,
    'completes_today', v_dones, 'completes_limit', s.daily_claim_limit,
    'daily_remaining', greatest(0, s.daily_claim_limit - v_dones),
    -- 2-7 내가 치운 곳 (최근 10건), 연속 활동 주
    'completed_count', v_completed,
    'streak_weeks', public.streak_weeks(v_uid),
    'active_this_week', exists (select 1 from public.quest_claims where user_id = v_uid and status = 'approved'
                                and approved_at >= date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'cleaned', coalesce((select json_agg(x) from (
        select q.id, c.approved_at as at, q.title, q.category as place_label, q.issue_type
        from public.quest_claims c join public.quests q on q.id = c.quest_id
        where c.user_id = v_uid and c.status = 'approved'
        order by c.approved_at desc limit 10) x), '[]'::json),
    -- 2-5 받은 제휴 보상
    'rewards', coalesce((select json_agg(x) from (
        select c.reward_label as label, q.org_name as "from", c.approved_at as at
        from public.quest_claims c join public.quests q on q.id = c.quest_id
        where c.user_id = v_uid and c.status = 'approved' and c.reward_label is not null
        order by c.approved_at desc) x), '[]'::json),
    -- 2-6 내 쿠폰
    'coupons', coalesce((select json_agg(x) from (
        select name, code, created_at as at from public.coupons where user_id = v_uid order by created_at desc) x), '[]'::json),
    'records', json_build_array(
      json_build_array('완료한 의뢰', v_completed || '건'),
      json_build_array('올린 제보', (select count(*) from public.reports where author_id = v_uid) || '건'),
      json_build_array('누적 포인트', p.total_earned || '점')));
end $$;

-- 내가 치운 곳 전체 기록 (최근 순, 2-7)
create or replace function public.my_cleaned(p_limit int default 10, p_before timestamptz default null)
returns table (id bigint, at timestamptz, title text, place_label text, issue_type text, kind text,
               points int, xp int, lat double precision, lng double precision, address text)
language sql stable security definer set search_path = '' as $$
  select q.id, c.approved_at, q.title, q.category, q.issue_type, q.kind,
         c.points_awarded, c.xp_awarded, q.lat, q.lng, q.address
  from public.quest_claims c join public.quests q on q.id = c.quest_id
  where c.user_id = auth.uid() and c.status = 'approved'
    and (p_before is null or c.approved_at < p_before)
  order by c.approved_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

-- ─────────────────────────────────────────────
-- 크루 (1-6, 2-3)
-- 크루 XP = 원장의 crew_score 합. 크루 레벨은 전체 누적, 시즌 랭킹은 시즌 기간 합.
-- ─────────────────────────────────────────────
drop function if exists public.crews_to_join();
drop function if exists public.crew_ranking();
create or replace function public.crew_ranking()
returns table (rank int, crew_id bigint, name text, area text, meta text, member_count int, score int,
               level int, xp_in_level int, xp_for_next_level int, mine boolean, is_demo boolean)
language sql stable security definer set search_path = '' as $$
  with season as (
    select starts_at, ends_at from public.seasons where now() between starts_at and ends_at
    order by starts_at desc limit 1
  ), s as (select crew_xp_per_level as per from public.app_settings),
  scores as (
    select c.id, c.name, c.area, c.is_demo,
           (select count(*) from public.crew_members m where m.crew_id = c.id)::int as members,
           coalesce((select sum(l.crew_score) from public.point_ledger l, season
                     where l.crew_id = c.id and l.created_at between season.starts_at and season.ends_at), 0)::int as score,
           coalesce((select sum(l.crew_score) from public.point_ledger l where l.crew_id = c.id), 0)::int as total
    from public.crews c
  )
  select (rank() over (order by score desc))::int, scores.id, scores.name, scores.area,
         coalesce(scores.area, '') || ' · ' || members || '명', members, score,
         total / s.per + 1, total % s.per, s.per,
         exists (select 1 from public.crew_members m where m.crew_id = scores.id and m.user_id = auth.uid()),
         scores.is_demo
  from scores cross join s
  order by score desc, scores.name
$$;

create or replace function public.crews_to_join()
returns table (id bigint, name text, meta text)
language sql stable security definer set search_path = '' as $$
  select r.crew_id, r.name, r.meta || case when r.rank = 1 and r.score > 0 then ' · 이번 시즌 1위' else '' end
  from public.crew_ranking() r
  where not r.mine
  order by r.rank
$$;

create or replace function public.my_crew()
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_crew public.crews; v_rank record; v_top int; v_members int; v_active int; v_week int;
begin
  select c.* into v_crew from public.crew_members m join public.crews c on c.id = m.crew_id
    where m.user_id = v_uid;
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
    'id', v_crew.id, 'name', v_crew.name, 'area', v_crew.area,
    'rank', v_rank.rank, 'score', v_rank.score, 'member_count', v_members,
    'level', v_rank.level, 'xp_in_level', v_rank.xp_in_level, 'xp_for_next_level', v_rank.xp_for_next_level,
    'is_owner', v_crew.owner_id = v_uid,
    'stats', json_build_array(
      json_build_array('이번 주 함께 완료한 의뢰', v_week || '건'),
      json_build_array('1위까지 남은 점수', greatest(0, v_top - v_rank.score) || '점'),
      json_build_array('오늘 활동한 크루원', v_members || '명 중 ' || v_active || '명')),
    -- 2-3 크루원별 기여 XP (이 크루에서 쌓은 크루 XP 합)
    'members', coalesce((select json_agg(x order by x.contribution desc, x.joined_at) from (
        select m.user_id as id, p.nickname, m.joined_at,
               coalesce((select sum(l.crew_score) from public.point_ledger l
                         where l.user_id = m.user_id and l.crew_id = v_crew.id), 0)::int as contribution,
               m.user_id = v_uid as is_me, m.role = 'owner' as is_owner,
               public.look_of(p.frame_id, p.name_color_id) -> 'frame' as frame,
               public.look_of(p.frame_id, p.name_color_id) ->> 'name_color' as name_color
        from public.crew_members m join public.profiles p on p.id = m.user_id
        where m.crew_id = v_crew.id) x), '[]'::json),
    -- 2-3 최근 활동 알림 30개
    'feed', coalesce((select json_agg(x) from (
        select e.id, e.type, e.nickname as "user", e.title, e.crew_xp, e.points, e.is_crew_quest, e.created_at as at
        from public.crew_events e where e.crew_id = v_crew.id
        order by e.created_at desc, e.id desc limit 30) x), '[]'::json));
end $$;

-- ─────────────────────────────────────────────
-- 2-6 포인트 교환 상점
-- ─────────────────────────────────────────────
create or replace function public.redeem_item(p_item_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); i public.shop_items; v_points int; v_code text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into i from public.shop_items where id = p_item_id and active;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  select points into v_points from public.profiles where id = v_uid for update;
  if v_points < i.cost then raise exception 'NOT_ENOUGH_POINTS'; end if;
  loop
    v_code := 'JQ-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from public.coupons where code = v_code);
  end loop;
  insert into public.coupons (user_id, item_id, name, cost, code) values (v_uid, i.id, i.name, i.cost, v_code);
  perform public.credit_points(v_uid, -i.cost, 0, 0, 'shop_redeem');
  select points into v_points from public.profiles where id = v_uid;
  return json_build_object('coupon_code', v_code, 'item', i.name, 'points', v_points);
end $$;

-- ─────────────────────────────────────────────
-- 2-10 프로필 꾸미기
-- cost > 0: 포인트로 사서 보유. cost = 0: 레벨이 되면 보유(살 수 없음).
-- ─────────────────────────────────────────────
create or replace function public.cosmetics_list()
returns table (id text, kind text, name text, style text, colors text[], cost int, level int,
               owned boolean, locked boolean, equipped boolean)
language sql stable security definer set search_path = '' as $$
  with me as (
    select p.id as uid, public.level_of(p.xp) as lv, p.frame_id, p.name_color_id
    from public.profiles p where p.id = auth.uid()
  )
  select c.id, c.kind, c.name, c.style, c.colors, c.cost, c.level,
         case when c.cost = 0 then coalesce(me.lv, 1) >= c.level
              else exists (select 1 from public.user_cosmetics u where u.user_id = me.uid and u.cosmetic_id = c.id) end,
         coalesce(me.lv, 1) < c.level,
         coalesce(case c.kind when 'frame' then me.frame_id = c.id else me.name_color_id = c.id end, false)
  from public.cosmetics c left join me on true
  order by c.kind, c.sort, c.id
$$;

create or replace function public.equip_cosmetic(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cosmetics; v_level int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into c from public.cosmetics where id = p_id;
  if not found then raise exception 'COSMETIC_NOT_FOUND'; end if;
  select public.level_of(xp) into v_level from public.profiles where id = v_uid;
  if v_level < c.level
     or (c.cost > 0 and not exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = c.id)) then
    raise exception 'LEVEL_TOO_LOW';
  end if;
  if c.kind = 'frame' then
    update public.profiles set frame_id = c.id where id = v_uid;
  else
    update public.profiles set name_color_id = c.id where id = v_uid;
  end if;
end $$;

-- 사면 바로 착용합니다. 이미 가진 품목이면 착용만 합니다.
create or replace function public.buy_cosmetic(p_id text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cosmetics; p public.profiles;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into c from public.cosmetics where id = p_id;
  if not found then raise exception 'COSMETIC_NOT_FOUND'; end if;
  select * into p from public.profiles where id = v_uid for update;
  if public.level_of(p.xp) < c.level then raise exception 'LEVEL_TOO_LOW'; end if;
  if c.cost > 0 and not exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = c.id) then
    if p.points < c.cost then raise exception 'NOT_ENOUGH_POINTS'; end if;
    insert into public.user_cosmetics (user_id, cosmetic_id) values (v_uid, c.id);
    perform public.credit_points(v_uid, -c.cost, 0, 0, 'cosmetic_buy');
  end if;
  perform public.equip_cosmetic(c.id);
  select * into p from public.profiles where id = v_uid;
  return json_build_object('points', p.points, 'frame', public.look_of(p.frame_id, p.name_color_id) -> 'frame',
                           'name_color', public.look_of(p.frame_id, p.name_color_id) ->> 'name_color');
end $$;

-- ─────────────────────────────────────────────
-- 3-5 시즌 자동 생성: 지금 시즌이 7일 안에 끝나면 다음 달 시즌을 미리 만듭니다 (매일 실행)
-- ─────────────────────────────────────────────
create or replace function public.ensure_next_season()
returns void language plpgsql security definer set search_path = '' as $$
declare v_last public.seasons; v_start timestamptz; v_end timestamptz; v_no int; v_area text;
begin
  loop
    select * into v_last from public.seasons order by ends_at desc limit 1;
    if not found or v_last.ends_at > now() + interval '7 days' then exit; end if;
    v_start := v_last.ends_at;
    v_end := (date_trunc('month', v_start at time zone 'Asia/Seoul') + interval '1 month') at time zone 'Asia/Seoul';
    if v_end <= v_start then v_end := v_start + interval '1 month'; end if;
    v_no := coalesce(nullif(regexp_replace(v_last.label, '\D', '', 'g'), '')::int, 0) + 1;
    v_area := split_part(v_last.period, ' · ', 1);
    insert into public.seasons (label, period, note, starts_at, ends_at)
    values ('SEASON ' || v_no,
            v_area || ' · ' || extract(month from v_start at time zone 'Asia/Seoul')::int || '월 시즌',
            v_last.note, v_start, v_end);
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 실행 권한 (기본은 막혀 있고 필요한 것만 엽니다)
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
grant execute on function public.my_crew() to authenticated;
grant execute on function public.give_heart(bigint) to authenticated;
grant execute on function public.create_crew(text, text) to authenticated;
grant execute on function public.join_crew(bigint) to authenticated;
grant execute on function public.leave_crew() to authenticated;
grant execute on function public.redeem_item(bigint) to authenticated;
grant execute on function public.buy_cosmetic(text) to authenticated;
grant execute on function public.equip_cosmetic(text) to authenticated;
