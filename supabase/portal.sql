-- =========================================================
-- 정통대왕쑥뜸원 — 2단계: 고객 포털 「MY WELLNESS」
--
-- schema.sql 을 이미 실행한 프로젝트에 이어서 실행한다.
-- 여러 번 실행해도 안전하다 (if not exists / drop policy if exists).
--
-- 여기서 하는 일은 두 가지다.
--   1) 권한(GRANT) 누락 수정 — RLS 만으로는 테이블에 닿지 못한다
--   2) 고객 포털용 테이블과, 「본인 것만」 보이게 하는 RLS
-- =========================================================


-- =========================================================
-- 0. 권한 (GRANT) — 이게 없으면 RLS 를 아무리 잘 써도 42501 이 난다
--
-- Postgres 는 두 겹으로 막는다.
--   ① 테이블 권한(GRANT)   — 이 역할이 이 테이블에 닿을 수 있는가
--   ② 행 보안(RLS)         — 닿을 수 있다면 그중 어느 행인가
-- schema.sql 은 ②만 적어 두었다. 그래서 지금은 아무도 못 읽는다.
--
-- 익명(anon)에게는 아무것도 주지 않는다.
-- 직원도 고객도 로그인한 뒤에야(authenticated) 자기 몫을 본다.
-- 실제로 무엇이 보이는지는 전부 아래 RLS 가 정한다.
-- =========================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  branches, staff, customers, service_products, memberships, visits,
  customer_preferences, briefing_task_logs, visit_applied_preferences,
  branch_settings, staff_display_settings
to authenticated;

grant select on hqs to authenticated;
grant select on customers_view, branch_revenue_view to authenticated;

-- 앞으로 이 스키마에 새로 만들어지는 테이블도 같은 규칙을 따르게 한다
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;


-- =========================================================
-- 1. 고객 포털 계정 연결
--
-- 가장 중요한 표다.
--
-- 고객이 포털에 로그인해서 계정이 하나 생겼다고 해서, 매장이 3년째
-- 관리해 온 그 고객과 저절로 같은 사람이 되지는 않는다.
-- 그래서 포털은 **고객 레코드를 절대 새로 만들지 않는다.**
-- 매장이 발급한 연결코드를 고객이 한 번 입력해야 비로소 이어진다.
--
-- 이 표 한 줄이 "이 로그인 계정 = 저 고객" 을 뜻하며,
-- 아래 모든 고객용 RLS 가 이 줄만 보고 판단한다.
-- =========================================================

create table if not exists customer_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz,
  -- 고객이 스스로 포털 이용을 그만둔 경우. 기록은 남기고 접근만 끊는다
  active boolean not null default true,
  unique (customer_id, auth_user_id)
);

create index if not exists idx_cust_accounts_customer on customer_accounts(customer_id);


-- 연결코드 — 매장이 발급하고 고객이 한 번 쓰는 짧은 코드
--
-- 만료와 1회성을 두는 이유: 코드가 카톡·문자로 돌아다니다 남의 손에
-- 들어가면 그 사람이 남의 이용기록을 보게 된다. 짧게 살고, 한 번 쓰면
-- 죽는다.
create table if not exists customer_link_codes (
  code text primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  created_by_staff_id uuid references staff(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_auth_user_id uuid references auth.users(id)
);

create index if not exists idx_link_codes_customer on customer_link_codes(customer_id);


-- =========================================================
-- 2. 헬퍼 — "지금 로그인한 사람이 보는 고객은 누구인가"
-- =========================================================

-- 이 로그인 계정에 연결된 고객 id (연결 안 됐으면 null)
create or replace function current_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select customer_id from customer_accounts
  where auth_user_id = auth.uid() and active
  limit 1;
$$;

-- 이 로그인 계정이 고객 포털 사용자인가 (직원이 아니라)
create or replace function is_portal_customer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from customer_accounts
    where auth_user_id = auth.uid() and active
  );
$$;

grant execute on function current_customer_id(), is_portal_customer() to authenticated;


-- =========================================================
-- 3. Wellness Profile
--
-- 고객이 직접 적는 자기 정보다. 직원이 적는 상담메모와 섞지 않는다.
-- 누가 적은 글인지 섞이면 나중에 아무도 그 문장을 믿지 못한다.
--
-- 여기 담기는 것은 "이용 목적 / 관심 부위 / 선호 시간대" 처럼
-- 서비스를 어떻게 쓰고 싶은지에 대한 내용뿐이다.
-- 몸 상태 판정이나 질환 관련 항목은 두지 않는다.
-- =========================================================

create table if not exists customer_wellness_profiles (
  customer_id uuid primary key references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  -- 이용 목적 (고객이 고른 값. 예: 생활관리 / 컨디션 / 휴식)
  purpose text,
  -- 관심 관리부위 (BodyPart 코드 배열 — 직원 화면의 focus_body_parts 와 같은 어휘)
  interest_areas jsonb not null default '[]'::jsonb,
  -- 선호 이용 시간대 (예: morning / afternoon / evening)
  preferred_time text,
  -- 홈케어 정보에 관심이 있는지
  homecare_interest boolean,
  -- 고객이 자유롭게 적은 한 줄
  note text,
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 4. 고객 피드백
--
-- 이번 단계에서 가장 중요한 "외부에서 안으로" 들어오는 데이터다.
--
-- 주의: 이 값은 Priority Score 에 들어가지 않는다.
-- 판단 기준은 매장이 정한 규칙 하나로 유지하고, 고객이 적은 말은
-- 그 옆에 나란히 놓는 참고정보로만 쓴다.
-- =========================================================

create table if not exists customer_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  -- 어느 방문에 대한 이야기인지 (고객이 고르지 않으면 null)
  visit_id uuid references visits(id) on delete set null,
  -- 이번 이용 만족도 1~5
  satisfaction int check (satisfaction between 1 and 5),
  -- 다음 방문 의향
  revisit_intent text check (revisit_intent in ('yes','maybe','no')),
  -- 고객이 적은 그대로의 한마디. 시스템이 해석하지 않는다
  note text,
  -- 홈케어 정보를 받아보고 싶은지
  homecare_interest boolean,
  created_at timestamptz not null default now(),
  -- 매장이 확인했는지 (직원 AX 에서 표시)
  read_at timestamptz,
  read_by_staff_id uuid references staff(id)
);

create index if not exists idx_feedback_customer on customer_feedback(customer_id, created_at desc);
create index if not exists idx_feedback_branch_unread on customer_feedback(branch_id, created_at desc)
  where read_at is null;


-- =========================================================
-- 5. 예약 · 문의 요청
--
-- 실시간 예약 확정이 아니다. 고객이 "이때쯤 가고 싶다" 를 남기고
-- 매장이 보고 연락하는, 지금 전화로 하던 일을 그대로 옮긴 것이다.
-- 확정 여부는 사람이 정한다.
-- =========================================================

create table if not exists customer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  kind text not null default 'booking' check (kind in ('booking','inquiry')),
  -- 희망 날짜 / 시간대 (문의면 비어 있을 수 있다)
  preferred_date date,
  preferred_slot text check (preferred_slot in ('morning','afternoon','evening')),
  note text,
  status text not null default 'open' check (status in ('open','handled','closed')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by_staff_id uuid references staff(id),
  -- 매장이 남긴 처리 메모 (고객에게는 보이지 않는다)
  staff_note text
);

create index if not exists idx_requests_customer on customer_requests(customer_id, created_at desc);
create index if not exists idx_requests_branch_open on customer_requests(branch_id, created_at desc)
  where status = 'open';


-- =========================================================
-- 6. 콘텐츠 반응
--
-- 어떤 웰니스 정보를 열어 봤는지. 추천을 조금씩 맞춰 가는 데만 쓴다.
-- 이 값으로 고객 상태를 판정하지 않는다.
-- =========================================================

create table if not exists customer_content_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  -- lib/portal/content.ts 의 콘텐츠 id
  content_id text not null,
  action text not null default 'open' check (action in ('open','save','hide')),
  created_at timestamptz not null default now()
);

create index if not exists idx_content_customer on customer_content_interactions(customer_id, created_at desc);


-- =========================================================
-- 7. RLS — 고객은 오직 자기 것만
--
-- 아래 정책의 핵심은 전부 같은 한 줄이다.
--     customer_id = current_customer_id()
-- 다른 고객의 id 를 알아내도, 주소창에 넣어도, 서버가 행을 주지 않는다.
-- =========================================================

alter table customer_accounts              enable row level security;
alter table customer_link_codes            enable row level security;
alter table customer_wellness_profiles     enable row level security;
alter table customer_feedback              enable row level security;
alter table customer_requests              enable row level security;
alter table customer_content_interactions  enable row level security;

-- 다시 실행해도 되도록 먼저 지운다
drop policy if exists accounts_self          on customer_accounts;
drop policy if exists accounts_staff         on customer_accounts;
drop policy if exists link_codes_staff       on customer_link_codes;
drop policy if exists profile_self           on customer_wellness_profiles;
drop policy if exists profile_staff          on customer_wellness_profiles;
drop policy if exists feedback_self_read     on customer_feedback;
drop policy if exists feedback_self_write    on customer_feedback;
drop policy if exists feedback_staff         on customer_feedback;
drop policy if exists requests_self_read     on customer_requests;
drop policy if exists requests_self_write    on customer_requests;
drop policy if exists requests_staff         on customer_requests;
drop policy if exists content_self           on customer_content_interactions;
drop policy if exists content_staff          on customer_content_interactions;
drop policy if exists customers_portal_self  on customers;
drop policy if exists memberships_portal_self on memberships;
drop policy if exists visits_portal_self     on visits;
drop policy if exists branches_portal_read   on branches;
drop policy if exists products_portal_read   on service_products;

-- --- 계정 연결 ---
-- 고객은 자기 연결 줄만 본다 (누구와 이어졌는지 확인용)
create policy accounts_self on customer_accounts for select
  using (auth_user_id = auth.uid());
-- 직원은 자기 지점 것을 보고 관리한다
create policy accounts_staff on customer_accounts for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- --- 연결코드 ---
-- 고객에게는 select 권한을 주지 않는다.
-- 코드 목록을 읽을 수 있으면 코드를 맞혀 볼 수 있기 때문이다.
-- 실제 사용은 아래 redeem_customer_link_code() 함수 하나로만 이뤄진다.
create policy link_codes_staff on customer_link_codes for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- --- Wellness Profile ---
create policy profile_self on customer_wellness_profiles for all
  using (customer_id = current_customer_id())
  with check (customer_id = current_customer_id());
create policy profile_staff on customer_wellness_profiles for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- --- 피드백 ---
-- 고객은 자기가 쓴 것을 읽고 새로 쓴다. 고치거나 지우지는 못한다
-- (남긴 말이 나중에 바뀌면 매장이 그 기록을 믿을 수 없다).
create policy feedback_self_read on customer_feedback for select
  using (customer_id = current_customer_id());
create policy feedback_self_write on customer_feedback for insert
  with check (customer_id = current_customer_id());
create policy feedback_staff on customer_feedback for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- --- 예약 · 문의 요청 ---
create policy requests_self_read on customer_requests for select
  using (customer_id = current_customer_id());
create policy requests_self_write on customer_requests for insert
  with check (customer_id = current_customer_id() and status = 'open');
create policy requests_staff on customer_requests for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- --- 콘텐츠 반응 ---
create policy content_self on customer_content_interactions for all
  using (customer_id = current_customer_id())
  with check (customer_id = current_customer_id());
create policy content_staff on customer_content_interactions for select
  using (branch_id = current_branch_id());


-- =========================================================
-- 8. 기존 표에 고객용 통로를 낸다
--
-- schema.sql 의 정책은 전부 current_branch_id() 기준이라 고객에게는
-- 0행이 나온다. 고객이 자기 것만 볼 수 있는 정책을 나란히 추가한다.
-- (Postgres 는 같은 명령에 정책이 여럿이면 OR 로 합친다)
--
-- 전부 select 전용이다. 고객은 자기 방문기록도 이용권도 고칠 수 없다.
-- =========================================================

create policy customers_portal_self on customers for select
  using (id = current_customer_id());

create policy memberships_portal_self on memberships for select
  using (customer_id = current_customer_id());

create policy visits_portal_self on visits for select
  using (customer_id = current_customer_id());

-- 매장 이름·주소·영업시간은 자기 지점 것만
create policy branches_portal_read on branches for select
  using (id = (select branch_id from customer_accounts
               where auth_user_id = auth.uid() and active limit 1));

-- 가격표는 판매 중인 것만 보인다
create policy products_portal_read on service_products for select
  using (
    active
    and branch_id = (select branch_id from customer_accounts
                     where auth_user_id = auth.uid() and active limit 1)
  );


-- =========================================================
-- 9. 연결코드 사용 — 함수 하나로만
--
-- 고객은 customer_link_codes 를 읽지 못한다. 대신 코드를 이 함수에
-- 넣어 보고, 맞으면 그때 연결이 생긴다.
--
-- security definer 로 표를 대신 읽되, 하는 일은 딱 하나다:
-- "이 코드가 살아 있으면, 그 코드의 고객과 지금 로그인한 계정을 잇는다."
-- 코드가 무엇이든 실패 메시지는 하나로 통일한다 — 어떤 코드가 존재하는지
-- 알려 주지 않기 위해서다.
-- =========================================================

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
end;
$$;

grant execute on function redeem_customer_link_code(text) to authenticated;


-- =========================================================
-- 10. 고객이 보는 매장 정보 (연락처는 그대로, 고객이 매장에 걸어야 하니까)
--
-- 반대로 **다른 고객의** 정보는 어떤 경로로도 내려가지 않는다.
-- 위 customers_portal_self 가 자기 행 하나로 이미 좁혀 두었다.
-- =========================================================

comment on table customer_accounts is
  '포털 로그인 계정 ↔ 기존 고객 레코드 연결. 포털은 고객을 새로 만들지 않는다.';
comment on table customer_feedback is
  '고객이 남긴 만족도·방문의향·메모. Priority Score 입력이 아니라 참고정보다.';
comment on table customer_requests is
  '예약/문의 요청. 확정은 사람이 한다.';
