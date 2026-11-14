-- 2-17: 설명을 비워 둔 의뢰도 등록되게 (quests.description 은 not null)
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
  values ('partner', v_partner.id, v_uid, 'review', btrim(p_title), btrim(coalesce(p_description, '')),
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
