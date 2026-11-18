-- requests_7 보완: 연결 판정에서 지금 제출 중인 인증 자신은 빼기
drop function if exists public.users_linked(uuid, uuid);
create or replace function public.users_linked(p_a uuid, p_b uuid, p_exclude_claim bigint default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.report_hearts h join public.reports r on r.id = h.report_id
                 where h.created_at > now() - interval '30 days'
                   and ((h.user_id = p_a and r.author_id = p_b) or (h.user_id = p_b and r.author_id = p_a)))
      or exists (select 1 from public.quest_claims c join public.quests q on q.id = c.quest_id
                 left join public.reports r on r.id = q.report_id
                 where c.id is distinct from p_exclude_claim
                   and c.status in ('submitted','staff_review','approved')
                   and coalesce(c.submitted_at, c.approved_at) > now() - interval '30 days'
                   and ((c.user_id = p_a and coalesce(r.author_id, q.requester_id) = p_b)
                     or (c.user_id = p_b and coalesce(r.author_id, q.requester_id) = p_a)))
$$;
revoke execute on function public.users_linked(uuid, uuid, bigint) from public, anon, authenticated;

create or replace function public.claim_needs_sample(p_claim bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare c public.quest_claims; q public.quests; s public.app_settings; v_author uuid;
begin
  select * into c from public.quest_claims where id = p_claim;
  select * into q from public.quests where id = c.quest_id;
  select * into s from public.app_settings;
  if (select count(*) from public.quest_claims where user_id = c.user_id and status = 'approved') < s.verify_trust_after then
    return true;
  end if;
  if exists (select 1 from public.quest_claims x where x.user_id = c.user_id
             and ((x.status = 'rejected' and x.decided_at > now() - interval '30 days')
                  or x.disputed_at > now() - interval '30 days')) then
    return true;
  end if;
  if q.kind = 'report' then
    select author_id into v_author from public.reports where id = q.report_id;
  else
    v_author := q.requester_id;
  end if;
  if v_author is not null and v_author <> c.user_id and public.users_linked(c.user_id, v_author, c.id) then
    return true;
  end if;
  return random() < s.verify_sample_rate;
end $$;
revoke execute on function public.claim_needs_sample(bigint) from public, anon, authenticated;
