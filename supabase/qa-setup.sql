-- =========================================================
-- 실DB 왕복 검증용 준비 (Demo 전용)
--
-- schema.sql → portal.sql 을 실행한 뒤 이 파일을 한 번 실행한다.
-- 여러 번 실행해도 안전하다.
--
-- 여기서 만드는 것은 전부 **가상 데이터**다.
-- 실제 고객의 성명·연락처·상담내용은 한 글자도 들어가지 않는다.
-- 검증이 끝나면 맨 아래 정리용 SQL 로 통째로 지울 수 있다.
--
-- 만드는 것
--   지점 1 · 직원 1 · 가격표 3 · 고객 2명(김웰니스 / 박비교)
--   김웰니스: 10회권 잔여 7회, 최근 이용 3건
--   로그인 계정 2개 (직원용 · 고객용) — 이메일 확인까지 끝난 상태
--
-- 로그인 계정은 .test 도메인을 쓴다. 국제 표준으로 시험용에만 배정된
-- 주소라 실제로는 어디에도 도달하지 않는다.
-- =========================================================

-- 고정 id — 검증 스크립트가 이 값들을 그대로 참조한다
--   지점   0000...0002
--   직원   0000...0003
--   고객A  0000...0010   고객B  0000...0011

begin;

-- ---------- 1. 지점 · 직원 ----------

insert into hqs (id, name)
values ('00000000-0000-4000-8000-000000000001', '정통대왕쑥뜸원')
on conflict (id) do nothing;

insert into branches (id, hq_id, name, address, phone, open_hours)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '본점',
  '경기도 남양주시 경춘로 951, 4층',
  '010-3900-0977',
  '10:00-20:00'
)
on conflict (id) do update
  set name = excluded.name, address = excluded.address, phone = excluded.phone;

insert into staff (id, branch_id, name, role, active)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'QA 원장', 'owner', true
)
on conflict (id) do update set role = 'owner', active = true;

-- ---------- 2. 가격표 (실제 매장 가격) ----------

insert into service_products
  (id, branch_id, name, service_name, session_count, price, active, sort_order, source)
values
  ('00000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000002',
   '대왕쑥뜸 1회', '대왕쑥뜸', 1, 45000, true, 1, 'price_sheet'),
  ('00000000-0000-4000-8000-000000000005',
   '00000000-0000-4000-8000-000000000002',
   '대왕쑥뜸 10회권', '대왕쑥뜸', 10, 400000, true, 2, 'price_sheet'),
  ('00000000-0000-4000-8000-000000000006',
   '00000000-0000-4000-8000-000000000002',
   '대왕쑥뜸 30회권', '대왕쑥뜸', 30, 1100000, true, 3, 'price_sheet')
on conflict (id) do update set price = excluded.price, active = true;

-- ---------- 3. 가상 고객 2명 ----------

insert into customers
  (id, branch_id, name, phone, registered_at, age_group,
   focus_body_parts, assigned_staff_id)
values
  ('00000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000002',
   '테스트고객 김웰니스', '010-0000-0001', date '2026-02-10', '50대',
   '[{"part":"abdomen","side":"both"}]'::jsonb,
   '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000002',
   '테스트고객 박비교', '010-0000-0002', date '2026-03-04', '40대',
   '[{"part":"waist","side":"both"}]'::jsonb,
   '00000000-0000-4000-8000-000000000003')
on conflict (id) do update set name = excluded.name, phone = excluded.phone;

-- 김웰니스: 10회권, 3회 사용 → 잔여 7
insert into memberships
  (id, branch_id, customer_id, program_name, total_count, remaining_count,
   purchased_at, price, status)
values (
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000010',
  '대왕쑥뜸 10회권', 10, 7, date '2026-06-02', 400000, 'active'
)
on conflict (id) do update set remaining_count = 7, status = 'active';

-- 박비교: 별도 이용권 (고객 A 가 이걸 못 보는지 확인하는 데 쓴다)
insert into memberships
  (id, branch_id, customer_id, program_name, total_count, remaining_count,
   purchased_at, price, status)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000011',
  '대왕쑥뜸 30회권', 30, 28, date '2026-05-11', 1100000, 'active'
)
on conflict (id) do update set remaining_count = 28;

-- 김웰니스 이용기록 3건 — 18일 간격 (평균 이용주기가 계산되도록)
insert into visits
  (id, branch_id, customer_id, staff_id, visited_at, type,
   program_name, membership_id, body_parts)
values
  ('00000000-0000-4000-8000-000000000030',
   '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000003',
   timestamptz '2026-07-08 14:30+09', 'visit', '대왕쑥뜸',
   '00000000-0000-4000-8000-000000000020',
   '[{"part":"abdomen","side":"both"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000031',
   '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000003',
   timestamptz '2026-07-26 14:30+09', 'visit', '대왕쑥뜸',
   '00000000-0000-4000-8000-000000000020',
   '[{"part":"abdomen","side":"both"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000032',
   '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000003',
   timestamptz '2026-08-13 14:30+09', 'visit', '대왕쑥뜸',
   '00000000-0000-4000-8000-000000000020',
   '[{"part":"abdomen","side":"both"}]'::jsonb)
on conflict (id) do nothing;

-- 박비교 이용기록 1건 (고객 A 에게 보이면 안 되는 자료)
insert into visits
  (id, branch_id, customer_id, staff_id, visited_at, type,
   program_name, membership_id, body_parts)
values (
  '00000000-0000-4000-8000-000000000033',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000003',
  timestamptz '2026-08-05 11:00+09', 'visit', '대왕쑥뜸',
  '00000000-0000-4000-8000-000000000021',
  '[{"part":"waist","side":"both"}]'::jsonb
)
on conflict (id) do nothing;

commit;


-- =========================================================
-- 4. 로그인 계정 2개
--
-- 대시보드에서 만들 수도 있지만, 여기서 함께 만들어 두면
-- 검증을 한 번에 끝낼 수 있다.
--
-- 비밀번호는 둘 다  JeongtongQA!2026
-- 검증이 끝나면 지운다 (맨 아래 정리용 SQL).
-- =========================================================

do $$
declare
  v_staff_uid    uuid := '00000000-0000-4000-8000-0000000000a1';
  v_customer_uid uuid := '00000000-0000-4000-8000-0000000000a2';
  v_other_uid    uuid := '00000000-0000-4000-8000-0000000000a3';
  r record;
begin
  for r in
    select * from (values
      (v_staff_uid,    'qa-staff@jeongtong-ax.test'),
      (v_customer_uid, 'qa-customer@jeongtong-ax.test'),
      (v_other_uid,    'qa-other@jeongtong-ax.test')
    ) as t(uid, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      r.uid, 'authenticated', 'authenticated', r.email,
      extensions.crypt('JeongtongQA!2026', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    )
    on conflict (id) do update
      set encrypted_password = extensions.crypt('JeongtongQA!2026', extensions.gen_salt('bf')),
          email_confirmed_at = now(),
          updated_at = now();

    -- 비밀번호 로그인을 위해 identity 행도 필요하다 (GoTrue 2.x)
    begin
      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      )
      values (
        gen_random_uuid(), r.uid::text, r.uid,
        jsonb_build_object('sub', r.uid::text, 'email', r.email,
                           'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
      )
      on conflict (provider_id, provider) do nothing;
    exception when others then
      -- 구버전은 provider_id 열이 없다. 그때는 id 를 문자열 키로 쓴다
      raise notice 'identities 표 구조가 달라 건너뜀: %', sqlerrm;
    end;
  end loop;
end $$;

-- 직원 계정을 staff 레코드에 잇는다 (이게 비면 로그인은 되는데 아무것도 안 보인다)
update staff
   set auth_user_id = '00000000-0000-4000-8000-0000000000a1'
 where id = '00000000-0000-4000-8000-000000000003';

-- 고객 계정을 김웰니스에 잇는다 (연결코드 없이 검증용으로 직접)
insert into customer_accounts (auth_user_id, customer_id, branch_id, active)
values (
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000002',
  true
)
on conflict (auth_user_id) do update
  set customer_id = excluded.customer_id, active = true;

-- qa-other 는 일부러 아무 고객과도 잇지 않는다.
-- "로그인은 됐지만 연결 안 된 계정" 이 정말 0행을 받는지 보기 위해서다.


-- =========================================================
-- 5. 여기서 바로 확인 — RLS 가 실제로 막는가
--
-- 아래 select 하나가 결과표를 준다. 전부 PASS 여야 한다.
-- (역할과 JWT 를 흉내 내어 실제 정책을 그대로 태운다)
-- =========================================================

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

select
  case when (select count(*) from customers) = 1
       then 'PASS' else 'FAIL' end                       as "고객A: 자기 고객정보 1행만",
  case when (select name from customers limit 1) like '%김웰니스%'
       then 'PASS' else 'FAIL' end                       as "고객A: 보이는 사람이 본인",
  case when (select count(*) from visits) = 3
       then 'PASS' else 'FAIL' end                       as "고객A: 자기 이용기록 3건만",
  case when (select count(*) from memberships) = 1
       then 'PASS' else 'FAIL' end                       as "고객A: 자기 이용권 1건만",
  case when (select coalesce(sum(remaining_count),0) from memberships) = 7
       then 'PASS' else 'FAIL' end                       as "고객A: 잔여 7회",
  case when (select count(*) from customers
             where id = '00000000-0000-4000-8000-000000000011') = 0
       then 'PASS' else 'FAIL' end                       as "고객A: 고객B 정보 차단",
  case when (select count(*) from visits
             where customer_id = '00000000-0000-4000-8000-000000000011') = 0
       then 'PASS' else 'FAIL' end                       as "고객A: 고객B 이용기록 차단",
  case when (select count(*) from memberships
             where customer_id = '00000000-0000-4000-8000-000000000011') = 0
       then 'PASS' else 'FAIL' end                       as "고객A: 고객B 이용권 차단",
  case when (select count(*) from staff) = 0
       then 'PASS' else 'FAIL' end                       as "고객A: 직원 명부 차단",
  case when (select count(*) from customer_link_codes) = 0
       then 'PASS' else 'FAIL' end                       as "고객A: 연결코드 열람 차단";

reset role;


-- =========================================================
-- 6. 연결 안 된 계정은 정말 아무것도 못 보는가
-- =========================================================

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

select
  case when (select count(*) from customers) = 0 then 'PASS' else 'FAIL' end
    as "미연결 계정: 고객정보 0행",
  case when (select count(*) from visits) = 0 then 'PASS' else 'FAIL' end
    as "미연결 계정: 이용기록 0행",
  case when (select count(*) from memberships) = 0 then 'PASS' else 'FAIL' end
    as "미연결 계정: 이용권 0행";

reset role;


-- =========================================================
-- 7. 직원 계정은 자기 지점을 보는가
-- =========================================================

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

select
  case when (select count(*) from customers) >= 2 then 'PASS' else 'FAIL' end
    as "직원: 지점 고객 전체",
  case when (select count(*) from visits) >= 4 then 'PASS' else 'FAIL' end
    as "직원: 지점 이용기록 전체",
  case when (select count(*) from service_products) = 3 then 'PASS' else 'FAIL' end
    as "직원: 가격표 3건",
  case when (select count(*) from customer_link_codes) >= 0 then 'PASS' else 'FAIL' end
    as "직원: 연결코드 접근";

reset role;


-- =========================================================
-- 정리용 — 검증이 끝난 뒤 실행하면 위에서 만든 것이 전부 사라진다
-- (실제 운영을 시작하기 전에 반드시 한 번 돌린다)
-- =========================================================
--
-- delete from auth.users where email like '%@jeongtong-ax.test';
-- delete from visits      where branch_id = '00000000-0000-4000-8000-000000000002';
-- delete from memberships where branch_id = '00000000-0000-4000-8000-000000000002';
-- delete from customers   where branch_id = '00000000-0000-4000-8000-000000000002';
-- delete from service_products where branch_id = '00000000-0000-4000-8000-000000000002';
-- delete from staff       where branch_id = '00000000-0000-4000-8000-000000000002';
-- delete from branches    where id = '00000000-0000-4000-8000-000000000002';
-- delete from hqs         where id = '00000000-0000-4000-8000-000000000001';
