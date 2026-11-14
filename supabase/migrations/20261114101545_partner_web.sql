-- 2-17 제휴업체 웹(web/) 서버 연결
-- 업체 계정·권한, 의뢰 검토(review → open / rejected), 운영진 디스코드 알림, 활동 집계·리포트

create extension if not exists pg_net;

-- ─────────────────────────────────────────────
-- 업체와 담당자 계정
-- ─────────────────────────────────────────────
alter table public.partners
  add column manager_name text,
  add column created_at timestamptz not null default now();
alter table public.partners drop constraint if exists partners_kind_check;
alter table public.partners add constraint partners_kind_check check (kind in ('brand','gov','shop','org'));
-- 담당자 이름은 공개하지 않습니다(본인은 partner_me 로 확인).
revoke select on public.partners from anon, authenticated;
grant select (id, name, logo_url, kind, is_demo, created_at) on public.partners to anon, authenticated;

-- 로그인한 계정 하나가 업체 하나에 속합니다.
create table public.partner_members (
  partner_id bigint not null references public.partners(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);
alter table public.partner_members enable row level security;
revoke insert, update, delete, truncate on public.partner_members from anon, authenticated;
create policy "own read" on public.partner_members for select to authenticated using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- 의뢰: 검토 상태와 업체 입력값
-- review(검토 중) → scheduled(승인, 시작일 전) → open(모집 중) → done/expired(종료)
--                 → rejected(반려)
-- 앱 목록(quests_nearby)은 open 만 보여 주므로 검토 중·반려·시작 전 의뢰는 앱에 나오지 않습니다.
-- ─────────────────────────────────────────────
alter table public.quests drop constraint quests_status_check;
alter table public.quests add constraint quests_status_check
  check (status in ('review','scheduled','open','done','expired','rejected'));
alter table public.quests
  add column place_name text,                                   -- 업체가 적은 장소 이름
  add column reward_type text check (reward_type in ('voucher','coupon','point')),
  add column reward_amount int check (reward_amount >= 0),      -- 1인 보상 (원 또는 포인트)
  add column capacity int check (capacity between 1 and 500),   -- 모집 인원 (인증 완료 기준)
  add column reject_reason text,
  add column reviewed_at timestamptz,
  add column created_by uuid references auth.users(id) on delete set null;

-- 검토 중·반려 의뢰는 그 업체 담당자만 테이블에서 볼 수 있게 합니다.
drop policy "public read" on public.quests;
create policy "public read" on public.quests for select to anon, authenticated
  using (status not in ('review','rejected')
         or exists (select 1 from public.partner_members m
                    where m.partner_id = quests.partner_id and m.user_id = (select auth.uid())));

-- 운영진 알림에 쓰는 디스코드 웹훅 주소는 Vault 에 'discord_webhook_url' 이름으로 넣습니다(커밋하지 않음).
-- 없으면 알림만 건너뜁니다.
create or replace function public.notify_staff(p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'discord_webhook_url' limit 1;
  if v_url is null or v_url = '' then return; end if;
  perform net.http_post(url := v_url,
                        body := jsonb_build_object('content', left(p_text, 1900)),
                        headers := '{"Content-Type":"application/json"}'::jsonb);
exception when others then
  return; -- 알림 실패가 의뢰 등록을 막지 않게
end $$;

-- 웹 장소 값 ↔ 서버 장소 유형
create or replace function public.place_category(p_place text)
returns text language sql immutable set search_path = '' as $$
  select case p_place when 'park' then '공원' when 'street' then '골목·거리' when 'drain' then '빗물받이'
                      when 'bus_stop' then '버스정류장' else '기타' end
$$;
create or replace function public.category_place(p_category text)
returns text language sql immutable set search_path = '' as $$
  select case p_category when '공원' then 'park' when '골목·거리' then 'street' when '빗물받이' then 'drain'
                         when '버스정류장' then 'bus_stop' else 'etc' end
$$;

-- 웹에 보여 줄 상태 (scheduled 는 '모집 중', expired 는 '종료')
create or replace function public.partner_status(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case p_status when 'scheduled' then 'open' when 'expired' then 'done' else p_status end
$$;

-- 내 업체 id (없으면 null)
create or replace function public.my_partner_id()
returns bigint language sql stable security definer set search_path = '' as $$
  select partner_id from public.partner_members where user_id = auth.uid()
$$;

-- ─────────────────────────────────────────────
-- 만료 정리: 시작일이 된 승인 의뢰를 열고, 기간이 끝난 의뢰를 닫습니다 (5분마다 + 수락 시)
-- ─────────────────────────────────────────────
create or replace function public.expire_stale()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quest_claims c set status = 'expired'
    where c.status = 'accepted'
      and c.accepted_at + (select claim_time_limit from public.app_settings) < now();
  update public.quests set status = 'open'
    where status = 'scheduled' and (starts_at is null or starts_at <= now());
  update public.quests set status = 'expired'
    where status in ('open','scheduled') and expires_at is not null and expires_at < now();
end $$;

-- 제휴 의뢰 모집 인원: 다 차면 추가 수락 거절 (accept_quest 가 의뢰 행을 잠근 뒤 insert 하므로 경합 없음)
create or replace function public.on_claim_before()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q public.quests;
begin
  select * into q from public.quests where id = new.quest_id;
  if q.kind = 'partner' and q.capacity is not null
     and (select count(*) from public.quest_claims where quest_id = q.id and status in ('accepted','approved')) >= q.capacity then
    raise exception 'REPORT_FULL';
  end if;
  return new;
end $$;
create trigger quest_claims_before_insert before insert on public.quest_claims
  for each row execute function public.on_claim_before();

-- 제휴 의뢰 인증 완료가 모집 인원에 닿으면 종료
create or replace function public.on_claim_approved()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q public.quests;
begin
  if new.status = 'approved' and old.status <> 'approved' then
    select * into q from public.quests where id = new.quest_id;
    if q.kind = 'partner' and q.capacity is not null
       and (select count(*) from public.quest_claims where quest_id = q.id and status = 'approved') >= q.capacity then
      update public.quests set status = 'done' where id = q.id;
      update public.quest_claims set status = 'cancelled' where quest_id = q.id and status = 'accepted';
    end if;
  end if;
  return new;
end $$;
create trigger quest_claims_after_update after update of status on public.quest_claims
  for each row execute function public.on_claim_approved();

-- 검토 요청이 들어오면 운영진 알림
create or replace function public.on_partner_quest_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'partner' and new.status = 'review' then
    perform public.notify_staff(format('[집게표] 제휴 의뢰 검토 요청 #%s · %s · %s (%s명 × %s원)',
      new.id, new.org_name, new.title, new.capacity, new.reward_amount));
  end if;
  return new;
end $$;
create trigger quests_partner_after_insert after insert on public.quests
  for each row execute function public.on_partner_quest_added();

-- ─────────────────────────────────────────────
-- 업체 웹 RPC (web/src/api.js 의 함수와 1:1)
-- ─────────────────────────────────────────────

-- api.partner(): { id, name, manager, joined_at } 또는 null
create or replace function public.partner_me()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('id', p.id, 'name', p.name, 'manager', p.manager_name, 'joined_at', m.created_at)
  from public.partner_members m join public.partners p on p.id = m.partner_id
  where m.user_id = auth.uid()
$$;

-- api.start(name, manager): 업체 등록. 이미 등록돼 있으면 그 업체를 돌려줍니다.
create or replace function public.partner_register(p_name text, p_manager text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text := btrim(coalesce(p_name, '')); v_id bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.partner_members where user_id = v_uid) then return public.partner_me(); end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'INVALID_NAME'; end if;
  insert into public.partners (name, kind, manager_name)
  values (v_name, 'org', nullif(btrim(coalesce(p_manager, '')), '')) returning id into v_id;
  insert into public.partner_members (partner_id, user_id, role) values (v_id, v_uid, 'owner');
  perform public.notify_staff(format('[집게표] 새 제휴업체 등록 #%s · %s', v_id, v_name));
  return public.partner_me();
end $$;

-- 업체 의뢰 한 건을 웹 모양으로
create or replace function public.partner_quest_json(p_id bigint)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', q.id, 'title', q.title, 'description', q.description,
    'place_type', public.category_place(q.category), 'place_name', q.place_name, 'address', q.address,
    'proof_mode', q.proof_mode, 'reward_type', q.reward_type, 'reward_amount', q.reward_amount,
    'capacity', q.capacity,
    'starts_on', (q.starts_at at time zone 'Asia/Seoul')::date,
    'ends_on', ((q.expires_at at time zone 'Asia/Seoul') - interval '1 day')::date,
    'status', public.partner_status(q.status), 'reject_reason', q.reject_reason,
    'created_at', q.created_at,
    'joined', (select count(distinct c.user_id) from public.quest_claims c
               where c.quest_id = q.id and c.status in ('accepted','approved','expired')),
    'completed', (select count(*) from public.quest_claims c where c.quest_id = q.id and c.status = 'approved'),
    -- 이번 주(월~일, KST) 요일별 인증 완료 수
    'daily', (select json_agg(coalesce(x.n, 0) order by d.i) from generate_series(0, 6) d(i)
              left join (select (extract(isodow from c.approved_at at time zone 'Asia/Seoul')::int - 1) as i, count(*) as n
                         from public.quest_claims c
                         where c.quest_id = q.id and c.status = 'approved'
                           and c.approved_at >= (date_trunc('week', now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul'
                         group by 1) x on x.i = d.i),
    'sample', q.is_demo)
  from public.quests q where q.id = p_id
$$;

-- api.quests(): 내 업체 의뢰 (최근 순)
create or replace function public.partner_quests()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(public.partner_quest_json(q.id) order by q.id desc), '[]'::json)
  from public.quests q
  where q.kind = 'partner' and q.partner_id = public.my_partner_id()
$$;

-- api.create(input): 검토 요청. 운영진이 승인해야 앱에 올라갑니다.
create or replace function public.partner_create_quest(
  p_title text, p_description text, p_place_type text, p_place_name text, p_address text,
  p_proof_mode text, p_reward_type text, p_reward_amount int, p_capacity int,
  p_starts_on date, p_ends_on date,
  p_lat double precision default null, p_lng double precision default null
) returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_partner public.partners; v_id bigint; v_label text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select p.* into v_partner from public.partners p where p.id = public.my_partner_id();
  if not found then raise exception 'NOT_PARTNER'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 60
     or char_length(btrim(coalesce(p_place_name, ''))) not between 1 and 30 then
    raise exception 'INVALID_INPUT';
  end if;
  if coalesce(p_reward_amount, 0) < 1000 or coalesce(p_capacity, 0) not between 1 and 500
     or p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on
     or p_ends_on < (now() at time zone 'Asia/Seoul')::date
     or coalesce(p_proof_mode, '') not in ('before_after','single')
     or coalesce(p_reward_type, '') not in ('voucher','coupon','point') then
    raise exception 'INVALID_INPUT';
  end if;
  v_label := case p_reward_type when 'voucher' then '지역 상품권 ' when 'coupon' then '매장 쿠폰 ' end
             || to_char(p_reward_amount, 'FM999,999,999') || '원';
  insert into public.quests (kind, partner_id, created_by, status, title, description, org_name,
                             category, place_name, address, lat, lng,
                             proof_mode, reward_type, reward_amount, capacity,
                             reward_points, reward_text, reward_label, reward_value, reward_unit,
                             starts_at, expires_at)
  values ('partner', v_partner.id, v_uid, 'review', btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
          v_partner.name, public.place_category(p_place_type), btrim(p_place_name),
          nullif(btrim(coalesce(p_address, '')), ''), p_lat, p_lng,
          p_proof_mode, p_reward_type, p_reward_amount, p_capacity,
          case when p_reward_type = 'point' then p_reward_amount else 0 end,
          case when p_reward_type = 'point' then '에코포인트 ' || p_reward_amount else v_label end,
          case when p_reward_type = 'point' then null else v_label end,
          case when p_reward_type = 'point' then null else to_char(p_reward_amount, 'FM999,999,999') || '원' end,
          case p_reward_type when 'voucher' then '상품권' when 'coupon' then '쿠폰' end,
          p_starts_on::timestamp at time zone 'Asia/Seoul',
          (p_ends_on + 1)::timestamp at time zone 'Asia/Seoul')
  returning id into v_id;
  return public.partner_quest_json(v_id);
end $$;

-- api.cancel(id): 검토 중인 의뢰만 취소(삭제)
create or replace function public.partner_cancel_quest(p_quest_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.quests
  where id = p_quest_id and kind = 'partner' and status = 'review' and partner_id = public.my_partner_id();
  if not found then raise exception 'CANNOT_CANCEL'; end if;
end $$;

-- api.report(): 활동 리포트 (모집 중·종료 의뢰 기준)
create or replace function public.partner_report()
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_partner bigint := public.my_partner_id(); v_rows json;
begin
  if v_partner is null then raise exception 'NOT_PARTNER'; end if;
  select coalesce(json_agg(public.partner_quest_json(q.id) order by q.id desc), '[]'::json) into v_rows
  from public.quests q
  where q.kind = 'partner' and q.partner_id = v_partner and q.status in ('scheduled','open','done','expired');

  return (
    with rows as (select r from json_array_elements(v_rows) r),
    agg as (
      select count(*)::int as quests,
             coalesce(sum((r->>'joined')::int), 0)::int as joined,
             coalesce(sum((r->>'completed')::int), 0)::int as completed,
             coalesce(sum((r->>'completed')::int * coalesce((r->>'reward_amount')::int, 0)), 0)::int as paid
      from rows
    )
    select json_build_object(
      'quests', agg.quests, 'joined', agg.joined, 'completed', agg.completed, 'paid', agg.paid,
      'daily', (select json_agg(coalesce((select sum((r->'daily'->>d.i)::int) from rows), 0) order by d.i)
                from generate_series(0, 6) d(i)),
      'byPlace', (select coalesce(json_agg(json_build_array(x.place, x.n) order by x.n desc), '[]'::json)
                  from (select r->>'place_type' as place, sum((r->>'completed')::int) as n
                        from rows group by 1 having sum((r->>'completed')::int) > 0) x),
      'rows', v_rows,
      -- 리포트용 전후 사진 (최근 50건). 경로는 claim-photos 버킷의 공개 경로
      'photos', (select coalesce(json_agg(p order by p.at desc), '[]'::json) from (
          select c.quest_id, q.title, c.before_photo_url as before, c.after_photo_url as after, c.approved_at as at
          from public.quest_claims c join public.quests q on q.id = c.quest_id
          where q.partner_id = v_partner and q.kind = 'partner' and c.status = 'approved'
          order by c.approved_at desc limit 50) p))
    from agg);
end $$;

-- ─────────────────────────────────────────────
-- 운영진 검토 (앱·웹에서는 호출 불가. Supabase 대시보드 SQL 에디터에서 실행)
--   select * from public.partner_review_queue;
--   select public.staff_review_quest(12, true);
--   select public.staff_review_quest(12, false, '장소가 불분명해요');
-- ─────────────────────────────────────────────
create or replace view public.partner_review_queue with (security_invoker = true) as
  select q.id, q.org_name, q.title, q.place_name, q.address, q.reward_type, q.reward_amount, q.capacity,
         (q.starts_at at time zone 'Asia/Seoul')::date as starts_on,
         ((q.expires_at at time zone 'Asia/Seoul') - interval '1 day')::date as ends_on,
         q.created_at
  from public.quests q where q.kind = 'partner' and q.status = 'review'
  order by q.created_at;
revoke all on public.partner_review_queue from anon, authenticated;

create or replace function public.staff_review_quest(p_quest_id bigint, p_approve boolean, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  update public.quests
    set status = case when not p_approve then 'rejected'
                      when starts_at is null or starts_at <= now() then 'open' else 'scheduled' end,
        reject_reason = case when p_approve then null else p_reason end,
        reviewed_at = now()
  where id = p_quest_id and kind = 'partner' and status = 'review'
  returning status into v_status;
  if v_status is null then raise exception 'NOT_IN_REVIEW'; end if;
  return v_status;
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
grant execute on function public.my_crew() to authenticated;
grant execute on function public.give_heart(bigint) to authenticated;
grant execute on function public.create_crew(text, text) to authenticated;
grant execute on function public.join_crew(bigint) to authenticated;
grant execute on function public.leave_crew() to authenticated;
grant execute on function public.redeem_item(bigint) to authenticated;
grant execute on function public.buy_cosmetic(text) to authenticated;
grant execute on function public.equip_cosmetic(text) to authenticated;
-- 업체 웹
grant execute on function public.partner_me() to authenticated;
grant execute on function public.partner_register(text, text) to authenticated;
grant execute on function public.partner_quests() to authenticated;
grant execute on function public.partner_create_quest(text, text, text, text, text, text, text, int, int, date, date,
                                                      double precision, double precision) to authenticated;
grant execute on function public.partner_cancel_quest(bigint) to authenticated;
grant execute on function public.partner_report() to authenticated;
