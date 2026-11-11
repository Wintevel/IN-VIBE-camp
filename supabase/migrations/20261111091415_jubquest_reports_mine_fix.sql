-- reports_nearby: 시드 제보(작성자 없음)에서 mine 이 null 대신 false 로 나오도록
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
