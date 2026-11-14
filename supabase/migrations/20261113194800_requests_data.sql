-- 백엔드 요청(docs/backend-requests.md) 반영: 데이터·예약 작업

-- ─────────────────────────────────────────────
-- 3-4 시연용 시드 데이터 표시 (지우지 않고 is_demo 로 구분)
-- 이 시점의 원격 DB 에는 실제 사용자가 없어서 작성자 없는 행이 모두 seed.sql 에서 온 것입니다.
-- ─────────────────────────────────────────────
update public.partners set is_demo = true;
update public.crews set is_demo = true where owner_id is null;
update public.reports set is_demo = true where author_id is null;
update public.quests set is_demo = true where requester_id is null;

-- 시드 의뢰의 장소 유형 (XP 기준, 1-5)
update public.quests set category = '골목·거리' where title in ('인하대 후문 골목 담배꽁초 수거', '토요일 오전 크루 합동 줍깅');
update public.quests set category = '공원' where title = '용현동 공원 산책로 줍깅';

-- 2-4, 2-5 사진 한 장 인증 + 제휴 보상 예시 (frontend/src/api/local.js 의 PARTNER 와 같은 내용)
insert into public.partners (name, kind, is_demo) values ('충주시 제휴', 'gov', true);
insert into public.quests (kind, partner_id, requester_id, title, description, org_name, lat, lng, address,
                           est_minutes, category, proof_mode, proof_label, reward_points, reward_text,
                           reward_label, reward_value, reward_unit, is_demo)
select 'partner', p.id, null, '망가진 공원 벤치 사진 찍기',
       '공원에서 부서지거나 망가진 벤치를 찾아 사진으로 알려 주세요. 확인되면 충주사랑상품권을 드려요.',
       p.name, 37.45480, 126.65190, '인천 미추홀구 용현동 공원', 10, '공원', 'single', '벤치 사진', 0,
       '충주사랑상품권 5,000원', '충주사랑상품권 5,000원', '5,000원', '상품권', true
from public.partners p where p.name = '충주시 제휴';

-- ─────────────────────────────────────────────
-- 2-6 상점 상품 (local.js 의 SHOP, 가격 임시)
-- ─────────────────────────────────────────────
insert into public.shop_items (name, cost, sort) values
  ('종량제 봉투 10L 5장', 50, 1),
  ('편의점 1,000원 쿠폰', 100, 2),
  ('카페 아메리카노', 300, 3),
  ('충주사랑상품권 5,000원', 500, 4);

-- ─────────────────────────────────────────────
-- 2-10 꾸미기 품목 (local.js 의 COSMETICS, 가격·레벨 임시)
-- ─────────────────────────────────────────────
insert into public.cosmetics (id, kind, name, style, colors, cost, level, sort) values
  ('frame-tape',   'frame', '노란 테이프',        'plain',  array['#FFD43B'], 0, 1, 1),
  ('frame-neon',   'frame', '편의점 네온사인',    'neon',   array['#3182F6','#7DF9FF','#3182F6'], 30, 1, 2),
  ('frame-aurora', 'frame', '새벽 청소차 오로라', 'spin',   array['#3DD68C','#7DF9FF','#A97CFF','#3DD68C'], 60, 1, 3),
  ('frame-galaxy', 'frame', '분리수거 은하수',    'stars',  array['#A97CFF','#FF7EB6','#3182F6','#A97CFF'], 120, 1, 4),
  ('frame-gold',   'frame', '황금 집게',          'royal',  array['#FFF3B0','#FFD43B','#FF9F1A','#FFD43B'], 0, 3, 5),
  ('frame-legend', 'frame', '전설의 줍줍러',      'legend', array['#FF7EB6','#FFD43B','#3DD68C','#7DF9FF','#A97CFF','#FF7EB6'], 0, 6, 6),
  ('name-white',   'name',  '기본 닉네임 색',     null,     array['#F2F4F6'], 0, 1, 1),
  ('name-tape',    'name',  '노란 닉네임',        null,     array['#FFD43B'], 80, 1, 2),
  ('name-mint',    'name',  '민트 닉네임',        null,     array['#7DF9FF'], 0, 4, 3);

alter table public.profiles
  add constraint profiles_frame_fk foreign key (frame_id) references public.cosmetics(id) on delete set default,
  add constraint profiles_name_color_fk foreign key (name_color_id) references public.cosmetics(id) on delete set default;

-- ─────────────────────────────────────────────
-- 3-5 시즌 자동 생성: 매일 00:05 (KST) 에 확인
-- ─────────────────────────────────────────────
select cron.schedule('jubquest-next-season', '5 15 * * *', $$select public.ensure_next_season()$$);
select public.ensure_next_season();
