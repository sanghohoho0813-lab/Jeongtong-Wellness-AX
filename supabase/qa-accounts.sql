-- =========================================================
-- 권한 검증용 계정 (임시)
-- =========================================================
--
-- qa-setup.sql 을 실행한 **뒤에** 돌린다. 거기서 만든 것에 두 개를 더한다.
--
--   qa-worker@jeongtong-ax.test      STAFF  — 관리자 화면이 막히는지 보려고
--   qa-customer-b@jeongtong-ax.test  고객 B — A 와 서로 안 보이는지 보려고
--
-- 이미 있는 것 (qa-setup.sql)
--   qa-staff@jeongtong-ax.test       ADMIN (owner)
--   qa-customer@jeongtong-ax.test    고객 A (김웰니스)
--   qa-other@jeongtong-ax.test       로그인만 되고 아무 고객과도 안 이어진 계정
--
-- 비밀번호는 모두  JeongtongQA!2026
-- 검증이 끝나면 맨 아래 정리용 SQL 로 지운다. 실제 운영 계정이 아니다.
-- =========================================================

do $$
declare
  v_worker_uid uuid := '00000000-0000-4000-8000-0000000000a4';
  v_custb_uid  uuid := '00000000-0000-4000-8000-0000000000a5';
  r record;
begin
  for r in
    select * from (values
      (v_worker_uid, 'qa-worker@jeongtong-ax.test'),
      (v_custb_uid,  'qa-customer-b@jeongtong-ax.test')
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
      raise notice 'identities 표 구조가 달라 건너뜀: %', sqlerrm;
    end;
  end loop;
end $$;

-- ---------- STAFF 직원 ----------
-- role 이 'staff' 다. 이 계정으로는 대시보드·설정·분석이 열리면 안 된다.
insert into staff (id, branch_id, name, role, active, auth_user_id)
values (
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000002',
  'QA 직원', 'staff', true,
  '00000000-0000-4000-8000-0000000000a4'
)
on conflict (id) do update
  set role = 'staff', active = true,
      auth_user_id = '00000000-0000-4000-8000-0000000000a4';

-- ---------- 고객 B ----------
-- 박비교(…0011) 에 잇는다. 고객 A(김웰니스, …0010) 와 서로 안 보여야 한다.
insert into customer_accounts (auth_user_id, customer_id, branch_id, active)
values (
  '00000000-0000-4000-8000-0000000000a5',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000002',
  true
)
on conflict (auth_user_id) do update
  set customer_id = excluded.customer_id, active = true;


-- =========================================================
-- 확인 — 실제 세션을 흉내 내어 물어본다
-- =========================================================

-- 1) STAFF 는 관리자가 아니다
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}';

select
  case when is_admin() then 'FAIL' else 'PASS' end as s1_STAFF는_관리자아님,
  case when current_branch_id() = '00000000-0000-4000-8000-000000000002'
       then 'PASS' else 'FAIL' end as s2_STAFF_지점_인식;

-- 2) STAFF 가 보는 연락처는 가려져 있다
select
  case when count(*) > 0 and bool_and(phone like '%*%')
       then 'PASS' else 'FAIL' end as s3_STAFF_연락처_가림,
  min(phone) as 예시
from customers_view;

reset role;

-- 3) ADMIN 은 원문을 본다
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

select
  case when is_admin() then 'PASS' else 'FAIL' end as a1_ADMIN_판정,
  case when count(*) > 0 and bool_and(phone not like '%*%')
       then 'PASS' else 'FAIL' end as a2_ADMIN_연락처_원문
from customers_view;

reset role;

-- 4) 고객 A 는 자기 한 행만, 자기 번호는 원문으로
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

select
  case when count(*) = 1 then 'PASS' else 'FAIL' end as ca1_본인_한행만,
  case when bool_and(id = '00000000-0000-4000-8000-000000000010')
       then 'PASS' else 'FAIL' end as ca2_그_한행이_본인,
  case when bool_and(phone not like '%*%') then 'PASS' else 'FAIL' end as ca3_본인번호는_원문
from customers_view;

reset role;

-- 5) 고객 B 도 자기 한 행만 — 그리고 그 행은 A 가 아니다
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}';

select
  case when count(*) = 1 then 'PASS' else 'FAIL' end as cb1_본인_한행만,
  case when bool_and(id = '00000000-0000-4000-8000-000000000011')
       then 'PASS' else 'FAIL' end as cb2_그_한행이_본인,
  case when count(*) filter (where id = '00000000-0000-4000-8000-000000000010') = 0
       then 'PASS' else 'FAIL' end as cb3_고객A는_안보임
from customers_view;

reset role;


-- =========================================================
-- 정리용 (검증 끝난 뒤)
-- =========================================================
-- delete from customer_accounts
--  where auth_user_id in ('00000000-0000-4000-8000-0000000000a5');
-- update staff set auth_user_id = null
--  where id = '00000000-0000-4000-8000-000000000005';
-- delete from auth.users where email in (
--   'qa-worker@jeongtong-ax.test', 'qa-customer-b@jeongtong-ax.test');
