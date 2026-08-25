-- =========================================================
-- 3단계 · 권한과 개인정보 잠그기
-- =========================================================
--
-- 이 파일은 schema.sql · portal.sql 을 실행한 **뒤에** 한 번 돌린다.
-- 두 번 돌려도 안전하다 (create or replace / revoke·grant 만 쓴다).
--
-- 무엇을 고치는가
-- ---------------
-- 1) 연락처가 실제로는 안 가려지고 있었다
--    customers_view 의 마스킹 정규식이 '01012345678' 처럼 붙여 쓴 번호만
--    다룬다. 그런데 이 매장 자료는 '010-1234-5678' 로 하이픈이 들어 있어
--    정규식이 아예 안 맞고, regexp_replace 는 안 맞으면 **원문을 그대로**
--    돌려준다. 즉 직원에게 마스킹된 척하며 원문이 나가고 있었다.
--
-- 2) 뷰를 만들어 놓고 아무도 쓰지 않았다
--    앱은 customers 테이블을 직접 읽었고, 테이블에는 전 컬럼 select 권한이
--    열려 있었다. 화면에서만 가리고 API 로는 원문이 나가는 상태였다.
--
-- 3) 고객은 자기 연락처도 못 봤다
--    뷰가 current_branch_id() 로만 좁혀져 있어 고객 세션에는 0행이었다.
--
-- 어떻게 고치는가
-- ---------------
--   · customers.phone 의 **읽기 권한 자체를 회수**한다 (컬럼 단위 GRANT).
--     이제 누가 API 로 select phone 을 하든 42501 이다.
--   · 읽기는 customers_view 로만 한다. 뷰가 마스킹과 범위를 함께 책임진다.
--   · 쓰기(insert/update)는 그대로 둔다 — 직원이 새 고객 연락처를 적는 일은
--     막지 않는다. 앱은 자기가 '가려진 값' 을 들고 있을 때는 그 칸을 아예
--     보내지 않아, 서버의 원문을 덮어쓰지 않는다.
-- =========================================================


-- ---------------------------------------------------------
-- 1. 연락처 가리기 — 안 맞으면 원문을 흘리지 않는 방식으로
--
-- regexp_replace 는 패턴이 안 맞으면 원문을 그대로 준다. 마스킹 함수가
-- "모르는 모양이면 통과" 로 동작하면 그건 마스킹이 아니다.
-- 그래서 숫자만 뽑아 뒤 네 자리만 남기는 방식으로 다시 쓴다.
-- ---------------------------------------------------------
create or replace function mask_phone(p text) returns text
language plpgsql immutable as $$
declare
  d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if length(d) < 4 then
    -- 번호라고 볼 수 없는 값 — 어떤 경우에도 원문을 내보내지 않는다
    return '***-****-****';
  end if;
  if length(d) >= 10 then
    return left(d, 3) || '-****-' || right(d, 4);
  end if;
  return '***-****-' || right(d, 4);
end $$;


-- ---------------------------------------------------------
-- 2. 읽기 창구 — customers_view
--
-- security_invoker = false (기본) 로 둔다. 즉 뷰는 소유자 권한으로 돌고,
-- 범위는 뷰 안의 where 가 직접 정한다. 그래야 "phone 은 못 읽지만
-- 뷰를 통해서는 가려진 값을 읽을 수 있다" 가 성립한다.
--
-- 범위를 뷰가 지므로 where 절이 곧 RLS 다. 두 갈래뿐이다.
--   · 직원 : 자기 지점의 고객            (current_branch_id())
--   · 고객 : 자기 자신 한 행             (current_customer_id())
-- 둘 다 auth.uid() 에서만 나온다. 클라이언트가 끼어들 자리가 없다.
-- ---------------------------------------------------------
drop view if exists customers_view;

create view customers_view as
select
  c.id, c.branch_id, c.name,
  case
    when is_admin() then c.phone
    when current_customer_id() = c.id then c.phone   -- 고객은 본인 번호를 본다
    else mask_phone(c.phone)
  end as phone,
  (not (is_admin() or current_customer_id() = c.id)) as phone_masked,
  c.age_group, c.gender, c.birth_year, c.registered_at, c.assigned_staff_id,
  c.consultation_note,
  c.memo, c.focus_body_parts, c.next_manage_date, c.next_manage_time,
  c.last_contact_date,
  c.tags, c.created_at
from customers c
where
  (current_branch_id() is not null and c.branch_id = current_branch_id())
  or (current_customer_id() = c.id);

alter view customers_view owner to postgres;


-- ---------------------------------------------------------
-- 3. 컬럼 단위 권한 — phone 은 읽을 수 없다
--
-- 테이블 전체 select 를 회수하고, phone 을 뺀 나머지만 다시 준다.
-- insert / update / delete 는 그대로다 (쓰기는 막지 않는다).
--
-- 주의: 새 컬럼을 추가하면 여기에도 적어야 한다. 안 적으면 앱이
-- "그 컬럼이 없다" 가 아니라 "권한이 없다" 로 실패한다.
-- ---------------------------------------------------------
revoke select on customers from authenticated;

grant select (
  id, branch_id, name,
  age_group, gender, birth_year, registered_at, assigned_staff_id,
  consultation_note, memo, focus_body_parts,
  next_manage_date, next_manage_time, last_contact_date,
  tags, created_at
) on customers to authenticated;

grant select on customers_view to authenticated;


-- ---------------------------------------------------------
-- 4. 확인 — 여기서 바로 결과를 본다
--
-- 아래 네 줄이 모두 PASS 여야 한다.
-- ---------------------------------------------------------
select
  case when mask_phone('010-1234-5678') = '010-****-5678'
       then 'PASS' else 'FAIL' end as t1_하이픈_번호_가림,
  mask_phone('010-1234-5678') as 결과;

select
  case when mask_phone('01012345678') = '010-****-5678'
       then 'PASS' else 'FAIL' end as t2_붙여쓴_번호_가림,
  mask_phone('01012345678') as 결과;

select
  case when mask_phone('없음') = '***-****-****'
       then 'PASS' else 'FAIL' end as t3_모르는_모양은_통째로_가림,
  mask_phone('없음') as 결과;

select
  case when has_column_privilege('authenticated', 'customers', 'phone', 'select')
       then 'FAIL' else 'PASS' end as t4_연락처_컬럼_읽기_차단;


-- ---------------------------------------------------------
-- 5. 직원 계정 잇기 (ADMIN 전용)
--
-- 이메일로 만들어진 Auth 계정을 우리 지점 직원 한 명에 잇는다.
-- 계정 자체를 여기서 만들지는 않는다 — 사용자 생성은 service_role 이
-- 필요한 일이고, 그 키는 브라우저에 두지 않는다는 원칙이 먼저다.
-- (계정은 Supabase 대시보드의 Auth → Invite user 로 만든다)
--
-- security definer 인 이유: authenticated 는 auth.users 를 못 읽는다.
-- 대신 함수 첫 줄에서 is_admin() 을 직접 확인하고, 우리 지점 직원이
-- 아니면 갱신 자체가 0행이 되게 막는다.
-- ---------------------------------------------------------
create or replace function link_staff_account(p_staff_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  if not is_admin() then
    raise exception '관리자만 계정을 연결할 수 있습니다.';
  end if;

  select id into v_uid
    from auth.users
   where lower(email) = lower(btrim(p_email))
   limit 1;

  if v_uid is null then
    raise exception '그 이메일로 만들어진 계정이 없습니다. 먼저 계정을 만들어 주세요.';
  end if;

  if exists (
    select 1 from staff
     where auth_user_id = v_uid and id <> p_staff_id
  ) then
    raise exception '이미 다른 직원에게 연결된 계정입니다.';
  end if;

  update staff
     set auth_user_id = v_uid
   where id = p_staff_id
     and branch_id = current_branch_id();

  if not found then
    raise exception '우리 지점 직원이 아닙니다.';
  end if;

  return '연결했습니다.';
end $$;

revoke all on function link_staff_account(uuid, text) from public, anon;
grant execute on function link_staff_account(uuid, text) to authenticated;

-- 연결 해제 — 퇴사·기기 분실 때 즉시 끊는다
create or replace function unlink_staff_account(p_staff_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '관리자만 계정 연결을 해제할 수 있습니다.';
  end if;
  update staff set auth_user_id = null
   where id = p_staff_id and branch_id = current_branch_id();
  if not found then
    raise exception '우리 지점 직원이 아닙니다.';
  end if;
  return '연결을 해제했습니다.';
end $$;

revoke all on function unlink_staff_account(uuid) from public, anon;
grant execute on function unlink_staff_account(uuid) to authenticated;
