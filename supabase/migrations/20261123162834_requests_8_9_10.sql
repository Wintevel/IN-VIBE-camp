-- 백엔드 요청 8-1, 9-3, 9-4, 9-5, 10-1, 10-3 (2026-11-21 ~ 11-23 한재준 요청)

-- ─────────────────────────────────────────────
-- 10-1 크루 만들기 레벨 제한 해제 (값은 이미 1, 기본값도 맞춤)
-- ─────────────────────────────────────────────
update public.app_settings set crew_create_level = 1;
alter table public.app_settings alter column crew_create_level set default 1;

-- ─────────────────────────────────────────────
-- 10-3 가입 시 첫 닉네임 = 앱이 보낸 nickname(아이디), 없으면 예전 방식
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(left(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nickname', '')), ''), 20),
                           '줍퀘러' || substr(replace(new.id::text, '-', ''), 1, 4)))
  on conflict (id) do nothing;
  return new;
end $$;

-- ─────────────────────────────────────────────
-- 8-1 제보 선택지 넓히기 + 직접 적은 말
-- ─────────────────────────────────────────────
alter table public.reports drop constraint reports_issue_type_check;
alter table public.reports add constraint reports_issue_type_check
  check (issue_type in ('litter','butt','dumping','bulky','bin','drain','graffiti','etc'));
alter table public.quests drop constraint quests_issue_type_check;
alter table public.quests add constraint quests_issue_type_check
  check (issue_type in ('litter','butt','dumping','bulky','bin','drain','graffiti','etc'));
alter table public.self_cleans drop constraint self_cleans_issue_type_check;
alter table public.self_cleans add constraint self_cleans_issue_type_check
  check (issue_type in ('litter','butt','dumping','bulky','bin','drain','graffiti','etc'));

alter table public.reports drop constraint reports_category_check;
alter table public.reports add constraint reports_category_check
  check (category in ('빗물받이','버스정류장','공원','골목·거리','학교 앞','주차장','하천·산책로','기타'));
alter table public.quests drop constraint quests_category_check;
alter table public.quests add constraint quests_category_check
  check (category in ('빗물받이','버스정류장','공원','골목·거리','학교 앞','주차장','하천·산책로','기타'));
alter table public.self_cleans drop constraint self_cleans_category_check;
alter table public.self_cleans add constraint self_cleans_category_check
  check (category in ('빗물받이','버스정류장','공원','골목·거리','학교 앞','주차장','하천·산책로','기타'));

alter table public.reports
  add column issue_note text check (char_length(issue_note) <= 20),
  add column category_note text check (char_length(category_note) <= 20);
alter table public.quests
  add column issue_note text check (char_length(issue_note) <= 20),
  add column category_note text check (char_length(category_note) <= 20);
alter table public.self_cleans
  add column issue_note text check (char_length(issue_note) <= 20),
  add column category_note text check (char_length(category_note) <= 20);
grant insert (issue_note, category_note) on public.reports to authenticated;

-- 새 장소 XP (임시): 학교 앞·주차장은 골목·거리와 같게, 하천·산책로는 공원과 같게
update public.app_settings
  set xp_by_category = xp_by_category || '{"학교 앞": 80, "주차장": 80, "하천·산책로": 150}'::jsonb;

create or replace function public.category_place(p_category text)
returns text language sql immutable set search_path = '' as $$
  select case p_category when '공원' then 'park' when '골목·거리' then 'street' when '빗물받이' then 'drain'
                         when '버스정류장' then 'bus_stop' when '학교 앞' then 'school' when '주차장' then 'parking'
                         when '하천·산책로' then 'river' else 'etc' end
$$;
create or replace function public.place_category(p_place text)
returns text language sql immutable set search_path = '' as $$
  select case p_place when 'park' then '공원' when 'street' then '골목·거리' when 'drain' then '빗물받이'
                      when 'bus_stop' then '버스정류장' when 'school' then '학교 앞' when 'parking' then '주차장'
                      when 'river' then '하천·산책로' else '기타' end
$$;

create or replace function public.promote_report(p_report bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports; v_nick text;
begin
  update public.reports set status = 'promoted', promoted_at = now()
    where id = p_report and status = 'open' returning * into r;
  if r.id is null then return; end if;
  select nickname into v_nick from public.profiles where id = r.author_id;
  insert into public.quests (kind, report_id, requester_id, title, description, org_name,
                             lat, lng, address, spot, est_minutes, category, issue_type, required_members, is_demo,
                             issue_note, category_note)
  values ('report', r.id, r.author_id, r.title, r.description, coalesce(v_nick, '이웃주민'),
          r.lat, r.lng, r.address, r.spot, r.est_minutes, r.category, r.issue_type, r.required_members, r.is_demo,
          r.issue_note, r.category_note);
end $$;

drop function if exists public.quick_clean(text, text, text, text, double precision, double precision, real, timestamptz, text,
                                           text, double precision, double precision, real, timestamptz, text, boolean, text, text);

create or replace function public.quick_clean(
  p_category text, p_issue_type text, p_title text,
  p_before_photo_url text, p_before_lat double precision, p_before_lng double precision,
  p_before_accuracy_m real, p_before_taken_at timestamptz, p_before_photo_hash text,
  p_after_photo_url text, p_after_lat double precision, p_after_lng double precision,
  p_after_accuracy_m real, p_after_taken_at timestamptz, p_after_photo_hash text,
  p_mocked boolean default false, p_before_thumb text default null, p_after_thumb text default null,
  p_issue_note text default null, p_category_note text default null
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
  v_cat := case when p_category in ('빗물받이','버스정류장','공원','골목·거리','학교 앞','주차장','하천·산책로','기타') then p_category else '기타' end;
  v_issue := case when p_issue_type in ('litter','butt','dumping','bulky','bin','drain','graffiti','etc') then p_issue_type else 'litter' end;
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
    xp_awarded, crew_xp_awarded, issue_note, category_note)
  values (v_uid, v_title, v_cat, v_issue,
    p_before_photo_url, p_before_lat, p_before_lng, p_before_accuracy_m, p_before_taken_at, p_before_photo_hash,
    p_after_photo_url, p_after_lat, p_after_lng, p_after_accuracy_m, p_after_taken_at, p_after_photo_hash,
    v_xp, v_crew_xp,
    left(nullif(btrim(coalesce(p_issue_note, '')), ''), 20), left(nullif(btrim(coalesce(p_category_note, '')), ''), 20))
  returning id into v_id;
  perform public.credit_points(v_uid, 0, v_xp, v_crew_xp, 'quick_clean');
  if v_crew is not null then
    perform public.crew_event(v_crew, 'complete', v_uid, null, v_title, v_crew_xp, 0, false);
  end if;
  select public.level_of(xp) into v_new from public.profiles where id = v_uid;
  return json_build_object('id', v_id, 'title', v_title, 'xp_gained', v_xp, 'crew_xp_gained', v_crew_xp,
                           'level', v_new, 'leveled_up', v_new > v_old, 'daily_remaining', public.my_daily_remaining());
end $$;

drop function if exists public.my_cleaned(int, timestamptz);
create or replace function public.my_cleaned(p_limit int default 10, p_before timestamptz default null)
returns table (id text, at timestamptz, title text, place_label text, issue_type text, kind text, self boolean,
               points int, xp int, lat double precision, lng double precision, address text,
               issue_note text, category_note text)
language sql stable security definer set search_path = '' as $$
  select * from (
    select q.id::text, c.approved_at, q.title, q.category, q.issue_type, q.kind, false,
           c.points_awarded, c.xp_awarded, q.lat, q.lng, q.address, q.issue_note, q.category_note
    from public.quest_claims c join public.quests q on q.id = c.quest_id
    where c.user_id = auth.uid() and c.status = 'approved'
    union all
    select 'self-' || sc.id, sc.created_at, sc.title, sc.category, sc.issue_type, 'self', true,
           0, sc.xp_awarded, sc.after_lat, sc.after_lng, null, sc.issue_note, sc.category_note
    from public.self_cleans sc where sc.user_id = auth.uid() and sc.hidden_at is null
  ) u
  where p_before is null or u.approved_at < p_before
  order by u.approved_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

drop function if exists public.quests_nearby(double precision, double precision, int, text);
create or replace function public.quests_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500, p_kind text default null
) returns table (
  id bigint, code text, kind text, label text, title text, org text, description text,
  goal text, tools text, time_label text, point int, reward text, hot boolean,
  lat double precision, lng double precision, address text, spot text,
  distance_m int, dist text, near boolean,
  required_members int, current_members int,
  hearts int, hearted boolean, marks json, my_mark text,
  my_status text, my_claim_id bigint, cleared boolean, status text, expires_at timestamptz,
  report_id bigint, photo_url text, category text, issue_type text, is_mine boolean,
  proof_mode text, proof_label text, reward_label text, reward_value text, reward_unit text,
  reward_xp int, reward_crew_xp int, is_demo boolean,
  issue_note text, category_note text
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
      and (rp.id is null or rp.hidden_at is null)
      and (rp.id is null or not exists (select 1 from public.report_flags f
                                        where f.report_id = rp.id and f.user_id = (select auth.uid())))
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
         q.lat, q.lng, q.address, q.spot,
         round(q.d)::int, public.dist_label(q.d), coalesce(q.d <= 500, false),
         q.required_members,
         (select count(*)::int from public.quest_claims c where c.quest_id = q.id and c.status in ('accepted','submitted','staff_review','approved')),
         q.heart_count,
         case when q.report_id is null then null
              else exists (select 1 from public.report_hearts h where h.report_id = q.report_id and h.user_id = (select auth.uid())) end,
         case when q.report_id is null then null else public.report_marks_json(q.report_id) end,
         case when q.report_id is null then null
              else (select m.mark from public.report_marks m where m.report_id = q.report_id and m.user_id = (select auth.uid())) end,
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
         q.is_demo, q.issue_note, q.category_note
  from q
  where q.status = 'open' or q.cleared_by_me
  order by q.d nulls last, q.created_at desc
$$;

drop function if exists public.reports_nearby(double precision, double precision, int);
create or replace function public.reports_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1500
) returns table (
  id bigint, code text, title text, author text, description text, category text, issue_type text, photo_url text,
  lat double precision, lng double precision, address text, spot text,
  distance_m int, dist text, near boolean, time_label text,
  hearts int, point int, reward_xp int, required_members int,
  hearted boolean, marks json, my_mark text, mine boolean, pending_until timestamptz, is_demo boolean, created_at timestamptz,
  issue_note text, category_note text
) language sql stable security definer set search_path = '' as $$
  with me as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt
  )
  select r.id, 'R-' || lpad(r.id::text, 4, '0'), r.title, coalesce(p.nickname, '이웃주민'),
         r.description, r.category, r.issue_type, r.photo_url, r.lat, r.lng, r.address, r.spot,
         round(extensions.st_distance(r.location, me.pt))::int,
         public.dist_label(extensions.st_distance(r.location, me.pt)),
         extensions.st_distance(r.location, me.pt) <= 500,
         '약 ' || r.est_minutes || '분',
         r.heart_count, public.report_point_value(r.heart_count), public.category_xp(r.category), r.required_members,
         exists (select 1 from public.report_hearts h where h.report_id = r.id and h.user_id = (select auth.uid())),
         public.report_marks_json(r.id),
         (select m.mark from public.report_marks m where m.report_id = r.id and m.user_id = (select auth.uid())),
         coalesce(r.author_id = (select auth.uid()), false),
         case when r.visible_at > now() then r.visible_at end,
         r.is_demo,
         r.created_at, r.issue_note, r.category_note
  from public.reports r
  cross join me
  left join public.profiles p on p.id = r.author_id
  where r.status = 'open'
    and r.hidden_at is null
    and (r.visible_at is null or r.visible_at <= now() or r.author_id = (select auth.uid()))
    and not exists (select 1 from public.report_flags f where f.report_id = r.id and f.user_id = (select auth.uid()))
    and extensions.st_dwithin(r.location, me.pt, p_radius_m)
  order by extensions.st_distance(r.location, me.pt)
$$;

-- ─────────────────────────────────────────────
-- 9-4 크루 포인트 (개인, 크루 상점 전용)
-- ─────────────────────────────────────────────
alter table public.app_settings add column crew_point_rate numeric not null default 1;
alter table public.profiles add column crew_points int not null default 0 check (crew_points >= 0);
alter table public.point_ledger add column crew_points int not null default 0;

alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in (
  'report_promoted','report_heart','heart_given','quest_approved','crew_quest',
  'shop_redeem','cosmetic_buy','feat_reward','seed',
  'claim_disputed','verify_answer','quick_clean','staff_adjust','crew_shop_buy'));

-- 크루 경험치를 얻을 때 같은 양(× crew_point_rate)의 크루 포인트를 개인에게 쌓음
create or replace function public.credit_points(p_user uuid, p_amount integer, p_xp integer, p_crew_xp integer, p_reason text,
                                                p_quest bigint default null, p_report bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_crew bigint; v_cp int := 0;
begin
  if p_user is null then return null; end if;
  select crew_id into v_crew from public.crew_members where user_id = p_user;
  if v_crew is not null and coalesce(p_crew_xp, 0) > 0 then
    v_cp := floor(p_crew_xp * (select crew_point_rate from public.app_settings))::int;
  end if;
  insert into public.point_ledger (user_id, amount, xp, crew_id, crew_score, crew_points, reason, quest_id, report_id)
  values (p_user, p_amount, greatest(p_xp, 0), v_crew,
          case when v_crew is null then 0 else greatest(p_crew_xp, 0) end, v_cp,
          p_reason, p_quest, p_report);
  update public.profiles
    set points = points + p_amount,
        total_earned = total_earned + greatest(p_amount, 0),
        xp = xp + greatest(p_xp, 0),
        crew_points = crew_points + v_cp
    where id = p_user;
  return v_crew;
end $$;

-- ─────────────────────────────────────────────
-- 9-3, 9-5 꾸미기 품목: 시즌 보상 테두리, 크루 상점
-- ─────────────────────────────────────────────
alter table public.cosmetics
  add column season int,
  add column rank int,
  add column shop text check (shop in ('crew')),
  add column crew_cost int check (crew_cost >= 0),
  add column crew_level int check (crew_level >= 1);

insert into public.cosmetics (id, kind, name, style, colors, cost, level, sort, season, rank) values
  ('frame-s1-1', 'frame', 'Season Beta · 버터', 'crest', array['#FFF7DC','#F6DE9A','#B8934F','#F3B9B4'], 0, 1, 20, 1, 1),
  ('frame-s1-2', 'frame', 'Season Beta · 라일락', 'crest', array['#F5F1FF','#D8CEF6','#8A7FB5','#B9E2F5'], 0, 1, 21, 1, 2),
  ('frame-s1-3', 'frame', 'Season Beta · 피치', 'crest', array['#FFF1EA','#F6CDBD','#B5806C','#BFE5CF'], 0, 1, 22, 1, 3);

insert into public.cosmetics (id, kind, name, style, colors, cost, level, sort, shop, crew_cost, crew_level) values
  ('crew-name-violet', 'name', '단체복 보라', null, array['#C9A7FF'], 0, 1, 30, 'crew', 200, 1),
  ('crew-frame-read', 'frame', '단톡방 공지 읽음', 'neon', array['#A97CFF','#E3D1FF','#A97CFF'], 0, 1, 31, 'crew', 300, 1),
  ('crew-name-lime', 'name', '형광 조끼 연두', null, array['#C6FF3D'], 0, 1, 32, 'crew', 400, 2),
  ('crew-frame-vest', 'frame', '형광 조끼 단체 착용', 'spin', array['#C6FF3D','#3DD68C','#FFD43B','#C6FF3D'], 0, 1, 33, 'crew', 500, 2),
  ('crew-name-dusk', 'name', '뒤풀이 노을', null, array['#FF9F68'], 0, 1, 34, 'crew', 700, 3),
  ('crew-frame-party', 'frame', '회식 장소는 분리수거장', 'stars', array['#FF9F68','#A97CFF','#FF7EB6','#FF9F68'], 0, 1, 35, 'crew', 900, 3),
  ('crew-frame-flag', 'frame', '집게 원정대 깃발', 'royal', array['#E3D1FF','#A97CFF','#6B3FE0','#A97CFF'], 0, 1, 36, 'crew', 1500, 5),
  ('crew-name-aurora', 'name', '원정대 오로라', null, array['#7DF9FF'], 0, 1, 37, 'crew', 1200, 5),
  ('crew-frame-legend', 'frame', '우리 크루 전설로 남다', 'legend', array['#A97CFF','#7DF9FF','#C6FF3D','#FFD43B','#FF7EB6','#A97CFF'], 0, 1, 38, 'crew', 2500, 7);

-- 가져야만 쓸 수 있는 품목: 포인트 품목·도전과제 품목·시즌 보상·크루 상점
create or replace function public.cosmetic_needs_owning(c public.cosmetics)
returns boolean language sql immutable set search_path = '' as $$
  select c.cost > 0 or c.feat is not null or c.season is not null or c.shop is not null
$$;

create or replace function public.look_of(p_frame text, p_name text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'frame', (select json_build_object('id', c.id, 'style', c.style, 'colors', c.colors, 'rank', c.rank)
              from public.cosmetics c where c.id in (p_frame, 'frame-tape') and c.kind = 'frame'
              order by (c.id = p_frame) desc limit 1),
    'name_color', (select c.colors[1] from public.cosmetics c
                   where c.id in (p_name, 'name-white') and c.kind = 'name'
                   order by (c.id = p_name) desc limit 1))
$$;

drop function if exists public.cosmetics_list();
create or replace function public.cosmetics_list()
returns table (id text, kind text, name text, style text, colors text[], cost int, level int,
               owned boolean, locked boolean, equipped boolean, feat text,
               season int, rank int, shop text, crew_cost int, crew_level int)
language sql stable security definer set search_path = '' as $$
  with me as (
    select p.id as uid, public.level_of(p.xp) as lv, p.frame_id, p.name_color_id
    from public.profiles p where p.id = auth.uid()
  )
  select c.id, c.kind, c.name, c.style, c.colors, c.cost, c.level,
         case when public.cosmetic_needs_owning(c)
              then exists (select 1 from public.user_cosmetics u where u.user_id = me.uid and u.cosmetic_id = c.id)
              else coalesce(me.lv, 1) >= c.level end,
         coalesce(me.lv, 1) < c.level
           or ((c.feat is not null or c.season is not null or c.shop is not null)
               and not exists (select 1 from public.user_cosmetics u where u.user_id = me.uid and u.cosmetic_id = c.id)),
         coalesce(case c.kind when 'frame' then me.frame_id = c.id else me.name_color_id = c.id end, false),
         c.feat, c.season, c.rank, c.shop, c.crew_cost, c.crew_level
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
     or (public.cosmetic_needs_owning(c)
         and not exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = c.id)) then
    raise exception 'LEVEL_TOO_LOW';
  end if;
  if c.kind = 'frame' then
    update public.profiles set frame_id = c.id where id = v_uid;
  else
    update public.profiles set name_color_id = c.id where id = v_uid;
  end if;
end $$;

-- 포인트 상점: 시즌 보상·크루 상점 품목은 포인트로 살 수 없음(가졌으면 착용만)
create or replace function public.buy_cosmetic(p_id text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cosmetics; p public.profiles;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into c from public.cosmetics where id = p_id;
  if not found then raise exception 'COSMETIC_NOT_FOUND'; end if;
  select * into p from public.profiles where id = v_uid for update;
  if public.level_of(p.xp) < c.level
     or ((c.feat is not null or c.season is not null or c.shop is not null)
         and not exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = c.id)) then
    raise exception 'LEVEL_TOO_LOW';
  end if;
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

-- 크루 레벨 = 크루 전체 누적 크루 경험치 기준 (crew_ranking.level 과 같은 식)
create or replace function public.crew_level_of(p_crew bigint)
returns int language sql stable security definer set search_path = '' as $$
  select case when p_crew is null then 0
              else coalesce((select sum(l.crew_score) from public.point_ledger l where l.crew_id = p_crew), 0)::int
                   / (select crew_xp_per_level from public.app_settings) + 1 end
$$;

create or replace function public.crew_shop()
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); p public.profiles; v_crew bigint; v_level int;
begin
  select * into p from public.profiles where id = v_uid;
  select crew_id into v_crew from public.crew_members where user_id = v_uid;
  v_level := public.crew_level_of(v_crew);
  return json_build_object(
    'crew_points', coalesce(p.crew_points, 0),
    'crew_level', v_level,
    'in_crew', v_crew is not null,
    'items', coalesce((select json_agg(json_build_object(
        'id', c.id, 'kind', c.kind, 'name', c.name, 'style', c.style, 'colors', c.colors,
        'crew_cost', c.crew_cost, 'crew_level', c.crew_level,
        'owned', exists (select 1 from public.user_cosmetics u where u.user_id = v_uid and u.cosmetic_id = c.id),
        'locked', v_level < c.crew_level,
        'equipped', coalesce(case c.kind when 'frame' then p.frame_id = c.id else p.name_color_id = c.id end, false))
      order by c.crew_level, c.sort, c.id)
      from public.cosmetics c where c.shop = 'crew'), '[]'::json));
end $$;

create or replace function public.buy_crew_item(p_id text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cosmetics; p public.profiles; v_crew bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform public.require_member();
  select * into c from public.cosmetics where id = p_id and shop = 'crew';
  if not found then raise exception 'COSMETIC_NOT_FOUND'; end if;
  select crew_id into v_crew from public.crew_members where user_id = v_uid;
  if v_crew is null then raise exception 'NOT_IN_CREW'; end if;
  if public.crew_level_of(v_crew) < c.crew_level then raise exception 'CREW_LEVEL_TOO_LOW_FOR_ITEM'; end if;
  select * into p from public.profiles where id = v_uid for update;
  if not exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = c.id) then
    if p.crew_points < c.crew_cost then raise exception 'NOT_ENOUGH_CREW_POINTS'; end if;
    insert into public.user_cosmetics (user_id, cosmetic_id) values (v_uid, c.id);
    update public.profiles set crew_points = crew_points - c.crew_cost where id = v_uid;
    insert into public.point_ledger (user_id, amount, xp, crew_id, crew_score, crew_points, reason)
    values (v_uid, 0, 0, v_crew, 0, -c.crew_cost, 'crew_shop_buy');
  end if;
  perform public.equip_cosmetic(c.id);
  return json_build_object('crew_points', (select crew_points from public.profiles where id = v_uid));
end $$;

-- ─────────────────────────────────────────────
-- 9-3 시즌 정산: 1·2·3위 크루의 그 시점 크루원 전원에게 보상 테두리
-- ─────────────────────────────────────────────
alter table public.seasons add column settled_at timestamptz;

create table public.season_results (
  season_id bigint not null references public.seasons(id) on delete cascade,
  rank int not null,
  crew_id bigint references public.crews(id) on delete set null,
  crew_name text not null,
  score int not null,
  members int not null,
  created_at timestamptz not null default now(),
  primary key (season_id, rank)
);
create table public.season_rewards (
  season_id bigint not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null,
  crew_id bigint,
  cosmetic_id text references public.cosmetics(id),
  created_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
alter table public.season_results enable row level security;
alter table public.season_rewards enable row level security;
revoke all on public.season_results, public.season_rewards from anon, authenticated;

create or replace function public.settle_season(p_season bigint)
returns int language plpgsql security definer set search_path = '' as $$
declare s public.seasons; r record; v_rank int := 0; v_item text; v_n int := 0;
begin
  select * into s from public.seasons where id = p_season for update;
  if s.id is null or s.settled_at is not null or s.ends_at > now() then return 0; end if;
  for r in
    select c.id, c.name, sum(l.crew_score)::int as score, max(l.created_at) as last_at,
           (select count(*) from public.crew_members m where m.crew_id = c.id)::int as members
    from public.point_ledger l join public.crews c on c.id = l.crew_id
    where l.created_at between s.starts_at and s.ends_at and not c.is_demo
    group by c.id, c.name
    having sum(l.crew_score) > 0
    order by sum(l.crew_score) desc, max(l.created_at) asc, c.id
    limit 3
  loop
    v_rank := v_rank + 1;
    insert into public.season_results (season_id, rank, crew_id, crew_name, score, members)
    values (s.id, v_rank, r.id, r.name, r.score, r.members);
    select id into v_item from public.cosmetics where season = s.id and rank = v_rank and kind = 'frame' limit 1;
    insert into public.season_rewards (season_id, user_id, rank, crew_id, cosmetic_id)
    select s.id, m.user_id, v_rank, r.id, v_item from public.crew_members m where m.crew_id = r.id
    on conflict do nothing;
    if v_item is not null then
      insert into public.user_cosmetics (user_id, cosmetic_id)
      select m.user_id, v_item from public.crew_members m where m.crew_id = r.id
      on conflict do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  update public.seasons set settled_at = now() where id = s.id;
  return v_n;
end $$;

-- 매일 00:05(KST) cron: 끝난 시즌 정산 → 다음 시즌 만들기
create or replace function public.ensure_next_season()
returns void language plpgsql security definer set search_path = '' as $$
declare v_last public.seasons; v_start timestamptz; v_end timestamptz; v_no int; v_area text; v_s bigint;
begin
  for v_s in select id from public.seasons where ends_at <= now() and settled_at is null order by ends_at loop
    perform public.settle_season(v_s);
  end loop;
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

-- current_season 에 지난 시즌 결과(last) 추가
create or replace function public.current_season()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', s.id, 'label', s.label, 'period', s.period, 'note', s.note,
    'title', '시즌 종료까지 ' || greatest(0, ((s.ends_at at time zone 'Asia/Seoul')::date - (now() at time zone 'Asia/Seoul')::date)) || '일',
    'starts_at', s.starts_at, 'ends_at', s.ends_at,
    'last', (select json_build_object(
               'no', l.id, 'label', l.label,
               'my_rank', w.rank,
               'reward', (select c.name from public.cosmetics c where c.id = w.cosmetic_id),
               'top', coalesce((select json_agg(x.crew_name order by x.rank) from public.season_results x where x.season_id = l.id), '[]'::json))
             from public.seasons l
             left join public.season_rewards w on w.season_id = l.id and w.user_id = auth.uid()
             where l.settled_at is not null
             order by l.ends_at desc limit 1))
  from public.seasons s where now() between s.starts_at and s.ends_at
  order by s.starts_at desc limit 1
$$;

-- 9-4 이의로 회수할 때 크루 포인트도 회수
create or replace function public.dispute_claim(p_claim bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.quest_claims; v_crew bigint; v_pts int; v_xp int; v_cp int;
begin
  select * into c from public.quest_claims where id = p_claim for update;
  if c.status <> 'approved' or c.dispute_until is null or c.disputed_at is not null then return; end if;
  update public.quest_claims set status = 'staff_review', disputed_at = now() where id = c.id;
  select crew_id into v_crew from public.point_ledger
    where user_id = c.user_id and quest_id = c.quest_id and reason in ('quest_approved','crew_quest')
    order by id desc limit 1;
  select least(points, c.points_awarded), least(xp, c.xp_awarded) into v_pts, v_xp
    from public.profiles where id = c.user_id for update;
  -- 9-4: 그 인증으로 쌓인 크루 포인트도 회수(잔액만큼)
  select least(p.crew_points, coalesce((select sum(l.crew_points) from public.point_ledger l
                                         where l.user_id = c.user_id and l.quest_id = c.quest_id
                                           and l.reason in ('quest_approved','crew_quest')), 0))::int
    into v_cp from public.profiles p where p.id = c.user_id;
  update public.profiles
    set points = points - v_pts, xp = xp - v_xp, total_earned = greatest(0, total_earned - c.points_awarded),
        crew_points = crew_points - greatest(v_cp, 0)
    where id = c.user_id;
  insert into public.point_ledger (user_id, amount, xp, crew_id, crew_score, crew_points, reason, quest_id)
  values (c.user_id, -v_pts, -v_xp, v_crew, case when v_crew is null then 0 else -c.crew_xp_awarded end,
          -greatest(v_cp, 0), 'claim_disputed', c.quest_id);
  perform public.notify_staff(format('[집게표] 해결 이의 · 인증 #%s 지급 회수 후 운영진 검토', c.id));
end $$;

-- 9-4 my_profile 에 crew_points
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
    'points', p.points, 'total_earned', p.total_earned, 'crew_points', p.crew_points,
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
-- 실행 권한: 새로 만들었거나 다시 만든 함수만 (다른 함수의 권한은 그대로)
-- ─────────────────────────────────────────────
revoke execute on function
  public.cosmetic_needs_owning(public.cosmetics), public.crew_level_of(bigint), public.settle_season(bigint),
  public.crew_shop(), public.buy_crew_item(text), public.cosmetics_list(),
  public.quests_nearby(double precision, double precision, int, text),
  public.reports_nearby(double precision, double precision, int),
  public.my_cleaned(int, timestamptz),
  public.quick_clean(text, text, text, text, double precision, double precision, real, timestamptz, text,
                     text, double precision, double precision, real, timestamptz, text, boolean, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.quests_nearby(double precision, double precision, int, text) to anon, authenticated;
grant execute on function public.reports_nearby(double precision, double precision, int) to anon, authenticated;
grant execute on function public.cosmetics_list() to anon, authenticated;
grant execute on function public.my_cleaned(int, timestamptz) to authenticated;
grant execute on function public.quick_clean(text, text, text, text, double precision, double precision, real, timestamptz, text,
                                            text, double precision, double precision, real, timestamptz, text, boolean, text, text,
                                            text, text) to authenticated;
grant execute on function public.crew_shop() to authenticated;
grant execute on function public.buy_crew_item(text) to authenticated;
