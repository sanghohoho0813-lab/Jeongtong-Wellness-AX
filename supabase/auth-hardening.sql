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
-- 4. 직원 계정 잇기 (ADMIN 전용)
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


-- =========================================================
-- 5. 실제 서버에 붙여 보고 나서 고친 것 넷
--    (여러 번 돌려도 안전하다)
-- =========================================================

-- ---------------------------------------------------------
-- 5-1. phone_masked 가 true 가 아니라 null 로 나갔다
--
-- 직원 세션에서는 current_customer_id() 가 null 이다.
--   null = c.id            → null
--   false or null          → null
--   not null               → null
-- 그래서 "가려진 값이다" 라는 표시가 null 로 나갔고, 앱은 그것을
-- "안 가려졌다" 로 읽는다. 그 상태로 저장하면 별표가 원본 번호를 덮는다.
-- 세 값 논리를 coalesce 로 닫는다.
-- ---------------------------------------------------------
create or replace view customers_view as
select
  c.id, c.branch_id, c.name,
  case
    when is_admin() then c.phone
    when current_customer_id() = c.id then c.phone
    else mask_phone(c.phone)
  end as phone,
  not coalesce(is_admin() or current_customer_id() = c.id, false) as phone_masked,
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
grant select on customers_view to authenticated;


-- ---------------------------------------------------------
-- 5-2. 고객 저장 통로 — upsert 가 막혀서 함수로 바꾼다
--
-- 컬럼 단위로 권한을 준 뒤부터 PostgREST 의 upsert(on conflict) 가
-- 테이블 전체 select 를 요구하며 42501 로 막힌다. 실제로 확인했다.
--   · select id            → 된다
--   · update / insert      → 된다
--   · upsert(on conflict)  → 42501
--
-- 그래서 고객 저장만 이 함수로 모은다. 한 번에 통째로 넘기므로 요청 수도
-- 그대로다. 함수가 security definer 라 클라이언트에게 테이블 select 권한을
-- 되돌려 줄 필요가 없다.
--
-- 연락처 규칙 — 여기서 정한다
--   보낸 값이 null 이면 "나는 이 번호를 모른다" 는 뜻이고, 그때는
--   서버에 있는 값을 그대로 둔다. 직원 화면은 가려진 값을 들고 있으므로
--   null 을 보내고, 원본은 건드려지지 않는다.
--   새 고객은 보낸 값을 그대로 넣는다 (직원도 새 고객 번호는 적는다).
--
-- 범위 — id 는 클라이언트가 보내는 값이라 믿지 않는다.
--   넣을 때는 지점을 서버 값으로 덮고, 고칠 때는 우리 지점 행만 고친다.
-- ---------------------------------------------------------
create or replace function save_customers(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid := current_branch_id();
  n integer := 0;
begin
  if v_branch is null then
    raise exception '직원 계정이 아닙니다.';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  insert into customers as c (
    id, branch_id, name, phone, gender, birth_year, age_group,
    consultation_note, registered_at, assigned_staff_id, memo,
    focus_body_parts, next_manage_date, next_manage_time,
    last_contact_date, tags
  )
  select
    r.id,
    v_branch,                                  -- 지점은 서버가 정한다
    r.name,
    coalesce(r.phone, ''),                     -- 새 고객인데 모르면 빈 값
    r.gender, r.birth_year, r.age_group,
    r.consultation_note,
    coalesce(r.registered_at, current_date),
    r.assigned_staff_id, r.memo,
    coalesce(r.focus_body_parts, '[]'::jsonb),
    r.next_manage_date, r.next_manage_time,
    r.last_contact_date,
    coalesce(r.tags, '{}')
  from jsonb_to_recordset(p_rows) as r(
    id uuid, name text, phone text,
    gender text, birth_year int, age_group text, consultation_note text,
    registered_at date, assigned_staff_id uuid, memo text,
    focus_body_parts jsonb, next_manage_date date, next_manage_time time,
    last_contact_date date, tags text[]
  )
  on conflict (id) do update set
    name              = excluded.name,
    -- null 이면 "모른다" — 서버 값을 지킨다
    phone             = coalesce(nullif(excluded.phone, ''), c.phone),
    gender            = excluded.gender,
    birth_year        = excluded.birth_year,
    age_group         = excluded.age_group,
    consultation_note = excluded.consultation_note,
    registered_at     = excluded.registered_at,
    assigned_staff_id = excluded.assigned_staff_id,
    memo              = excluded.memo,
    focus_body_parts  = excluded.focus_body_parts,
    next_manage_date  = excluded.next_manage_date,
    next_manage_time  = excluded.next_manage_time,
    last_contact_date = excluded.last_contact_date,
    tags              = excluded.tags
  where c.branch_id = v_branch;                -- 남의 지점 행은 안 고친다

  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function save_customers(jsonb) from public, anon;
grant execute on function save_customers(jsonb) to authenticated;


-- ---------------------------------------------------------
-- 5-3. 한 계정이 직원이면서 동시에 고객일 수는 없다
--
-- 검증 중에 실제로 만들어 본 상태다. 직원 계정을 고객으로도 이어 두면
-- RLS 두 갈래가 OR 로 합쳐져, 고객 화면에서 지점 전체가 보인다.
-- (customers_view 의 where 도 "직원이거나 본인" 이라 마찬가지다)
--
-- 연결코드를 넣는 문 앞에서 막는다. 이미 어긋난 자료가 있으면 아래
-- 확인 질의가 알려 준다.
-- ---------------------------------------------------------
create or replace function redeem_customer_link_code(p_code text)
returns table (customer_id uuid, customer_name text, branch_id uuid)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_row customer_link_codes%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  -- 직원 계정은 고객으로 이을 수 없다 (권한 두 개가 겹치면 범위가 넓어진다)
  if exists (select 1 from staff where auth_user_id = v_uid and active) then
    raise exception '직원 계정으로는 고객 화면을 연결할 수 없습니다. 개인 이메일로 다시 시도해 주세요.'
      using errcode = 'P0001';
  end if;

  -- 이미 연결된 계정이면 그대로 돌려준다 (코드를 두 번 넣어도 탈 없이)
  select ca.customer_id into v_row.customer_id
  from customer_accounts ca where ca.auth_user_id = v_uid and ca.active;
  if found then
    return query
      select c.id, c.name, c.branch_id from customers c where c.id = v_row.customer_id;
    return;
  end if;

  select * into v_row from customer_link_codes
  where code = upper(btrim(p_code))
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception '연결코드가 맞지 않거나 사용 기한이 지났습니다. 매장에 다시 요청해 주세요.'
      using errcode = 'P0002';
  end if;

  update customer_link_codes
     set used_at = now(), used_by_auth_user_id = v_uid
   where code = v_row.code;

  insert into customer_accounts (auth_user_id, customer_id, branch_id)
  values (v_uid, v_row.customer_id, v_row.branch_id)
  on conflict (auth_user_id) do update
    set customer_id = excluded.customer_id,
        branch_id   = excluded.branch_id,
        active      = true,
        linked_at   = now();

  return query
    select c.id, c.name, c.branch_id from customers c where c.id = v_row.customer_id;
end $$;

revoke all on function redeem_customer_link_code(text) from public, anon;
grant execute on function redeem_customer_link_code(text) to authenticated;


-- =========================================================
-- 확인 — 한 판에 모아서 본다
--
-- SQL Editor 는 여러 문장을 실행하면 **마지막 결과만** 보여 준다.
-- 그래서 확인을 여러 개로 나눠 두면 앞의 것들이 화면에서 사라진다.
-- 한 질의로 합쳐 일곱 줄이 함께 나오게 한다.
--
-- 일곱 줄이 모두 PASS 여야 한다.
-- =========================================================
select * from (
  select 1 as 순, 't1 하이픈 번호 가림' as 항목,
         case when mask_phone('010-1234-5678') = '010-****-5678'
              then 'PASS' else 'FAIL' end as 결과,
         mask_phone('010-1234-5678') as 값
  union all
  select 2, 't2 붙여쓴 번호 가림',
         case when mask_phone('01012345678') = '010-****-5678'
              then 'PASS' else 'FAIL' end,
         mask_phone('01012345678')
  union all
  select 3, 't3 모르는 모양은 통째로 가림',
         case when mask_phone('없음') = '***-****-****'
              then 'PASS' else 'FAIL' end,
         mask_phone('없음')
  union all
  select 4, 't4 연락처 컬럼 읽기 차단',
         case when has_column_privilege('authenticated','customers','phone','select')
              then 'FAIL' else 'PASS' end,
         '직접 select 하면 42501'
  union all
  select 5, 't5 가림표시가 null 이 아님',
         case when (select bool_and(phone_masked is not null)
                      from customers_view) is not false
              then 'PASS' else 'FAIL' end,
         '직원 세션에서 true 로 와야 한다'
  union all
  select 6, 't6 고객저장 함수 있음',
         case when to_regprocedure('public.save_customers(jsonb)') is not null
              then 'PASS' else 'FAIL' end,
         coalesce(to_regprocedure('public.save_customers(jsonb)')::text, '(없음)')
  union all
  select 7, 't7 직원·고객 겹친 계정 없음',
         case when (select count(*) from customer_accounts ca
                     join staff st on st.auth_user_id = ca.auth_user_id and st.active
                    where ca.active) = 0
              then 'PASS' else 'FAIL' end,
         coalesce((select string_agg(ca.auth_user_id::text, ', ')
                     from customer_accounts ca
                     join staff st on st.auth_user_id = ca.auth_user_id and st.active
                    where ca.active), '(없음)')
) t order by 순;
