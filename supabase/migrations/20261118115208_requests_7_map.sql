-- requests_7 보완: map_overview 는 바로 치움 점만 더하고 기존 hot_report 점·새 제보 수는 그대로 둠
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
    where r.status = 'open' and r.created_at >= now() - interval '7 days'
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
        union all
        select 'hot_report', r.lat, r.lng, null from public.reports r
        where r.status = 'open' and r.heart_count >= 3 and extensions.st_dwithin(r.location, v_pt, p_radius_m)
      ) x), '[]'::json));
end $$;
