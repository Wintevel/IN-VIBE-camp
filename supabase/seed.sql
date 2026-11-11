-- 시연용 시드 데이터 (frontend/src/data/mock.js 의 값을 옮김). 위치: 인천 미추홀구 용현동 / 인하대 주변
-- 로컬: supabase db reset 시 자동 실행. 원격: SQL Editor 에서 한 번 실행.

insert into public.partners (name, kind) values
  ('미추홀구청 청소행정과', 'gov'),
  ('아웃도어 브랜드 제휴', 'brand'),
  ('지역 상점가 제휴', 'shop');

insert into public.crews (name, area) values
  ('초록발자국', '남구'),
  ('인하런앤줍', '용현동'),
  ('주안클린워커', '주안동'),
  ('학익동 아침산책', '학익동'),
  ('미추홀 줍줍단', '숭의동');

insert into public.seasons (label, period, note, starts_at, ends_at) values
  ('SEASON 11', '미추홀구 · 11월 시즌', '1위 크루는 제휴사 클린팩 20개와 시즌 배지를 받아요',
   '2026-11-01 00:00:00+09', '2026-12-01 00:00:00+09');

-- 시즌 시작 크루 점수 (시안 랭킹 값)
insert into public.point_ledger (user_id, amount, crew_id, crew_score, reason, created_at)
select null, 0, c.id, v.score, 'seed', '2026-11-01 00:00:01+09'
from (values ('초록발자국', 2140), ('인하런앤줍', 1830), ('주안클린워커', 1610),
             ('학익동 아침산책', 1220), ('미추홀 줍줍단', 980)) v(name, score)
join public.crews c on c.name = v.name;

-- 제휴 의뢰
insert into public.quests (kind, partner_id, requester_id, title, description, org_name, lat, lng, address,
                           est_minutes, goal, tools, reward_points, reward_text, hot)
select 'partner', p.id, null, v.title, v.description, p.name, v.lat, v.lng, v.address,
       v.est_minutes, v.goal, v.tools, v.reward_points, v.reward_text, v.hot
from (values
  ('미추홀구청 청소행정과', '인하대 후문 골목 담배꽁초 수거',
   '후문 편의점부터 버스정류장까지 약 150m 구간이에요. 주민 제보가 이번 주 9건 들어왔어요.',
   37.45120, 126.65660, '인천 미추홀구 인하대 후문 골목', 20, '꽁초 200개 이상', '집게·봉투는 정류장 옆 수거함에 있어요',
   120, '에코포인트 120 + 크루 점수', true),
  ('아웃도어 브랜드 제휴', '용현동 공원 산책로 줍깅',
   '공원 한 바퀴(1.2km)를 걸으며 쓰레기를 주워요. 완료하면 제휴 매장에서 클린팩을 받을 수 있어요.',
   37.45480, 126.65190, '인천 미추홀구 용현동 공원 산책로', 40, '산책로 1바퀴', '개인 장갑 권장',
   200, '클린팩 1개 + 200점', false),
  ('지역 상점가 제휴', '제물포역 앞 전단 수거',
   '역 앞 계단과 난간에 붙은 전단을 떼어 수거해요.',
   37.46690, 126.65690, '인천 미추홀구 제물포역 앞', 25, '계단 2곳', '목장갑 권장',
   150, '상점가 음료 쿠폰 + 150점', false)
) v(partner, title, description, lat, lng, address, est_minutes, goal, tools, reward_points, reward_text, hot)
join public.partners p on p.name = v.partner;

-- 크루 의뢰 (인하런앤줍 크루원에게만 보임)
insert into public.quests (kind, crew_id, requester_id, title, description, lat, lng, address,
                           time_label, starts_at, goal, tools, required_members)
select 'crew', c.id, null, '토요일 오전 크루 합동 줍깅',
       '크루원 4명 이상 모여서 인하대 정문부터 함께 치워요.',
       37.45000, 126.65350, '인하대 정문', '토 09:00 · 1시간', '2026-11-14 09:00:00+09',
       '4명 이상 함께', '모임 장소: 인하대 정문', 4
from public.crews c where c.name = '인하런앤줍';

-- 주민 제보 (하트 1개만 더 받으면 승격되는 제보 포함 → 시연용)
insert into public.reports (author_id, title, description, category, lat, lng, address, heart_count, est_minutes) values
  (null, '인하대 후문 빗물받이 꽁초', '비 오면 물이 안 빠져요. 빗물받이 틈에 꽁초가 가득해요.', '빗물받이',
   37.45150, 126.65610, '인천 미추홀구 인하대 후문 앞', 4, 10),
  (null, '주안역 3번 출구 화단 정리', '화단 사이에 컵과 전단이 쌓여 있다는 제보예요.', '기타',
   37.46490, 126.68020, '인천 미추홀구 주안역 3번 출구', 3, 15),
  (null, '학익동 버스정류장 뒤 쓰레기', '정류장 뒤편 공터에 봉지째 버려진 쓰레기가 있어요.', '버스정류장',
   37.44090, 126.66550, '인천 미추홀구 학익동 버스정류장', 1, 20);
